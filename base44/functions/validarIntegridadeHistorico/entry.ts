import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Apenas administradores' }, { status: 403 });
    }

    const { workshop_id } = await req.json();

    if (!workshop_id) {
      return Response.json({ error: 'workshop_id obrigatório' }, { status: 400 });
    }

    const validacoes = [];
    let totalErros = 0;

    // 1. Valida DRE sem ContaReceber/ContaPagar correspondente
    const dreLancamentos = await base44.entities.DRELancamento.filter({
      workshop_id
    });

    let dreSemConta = 0;
    for (const dre of dreLancamentos) {
      const temConta = await base44.entities.ContaReceber.filter({
        dre_lancamento_id: dre.id
      });

      if (temConta.length === 0) {
        const temContaPagar = await base44.entities.ContaPagar.filter({
          dre_lancamento_id: dre.id
        });

        if (temContaPagar.length === 0 && !dre.descricao?.includes('Histórico')) {
          dreSemConta++;
          validacoes.push({
            tipo: 'dre_sem_conta',
            gravidade: 'media',
            entidade_id: dre.id,
            mes: dre.mes,
            descricao: `DRE ${dre.descricao} sem ContaReceber/ContaPagar vinculada`,
            acao: 'Executar backfill ou criar manualmente'
          });
        }
      }
    }

    // 2. Valida ContaReceber sem Liquidação
    const contasReceber = await base44.entities.ContaReceber.filter({
      workshop_id,
      status: { $in: ['aberto', 'parcial'] }
    });

    let contasSemLiq = 0;
    for (const conta of contasReceber) {
      const liquidacoes = await base44.entities.LiquidacaoFinanceira.filter({
        conta_receber_id: conta.id
      });

      if (liquidacoes.length === 0 && conta.valor_aberto === 0) {
        contasSemLiq++;
        validacoes.push({
          tipo: 'conta_receber_sem_liquidacao',
          gravidade: 'alta',
          entidade_id: conta.id,
          descricao: `ContaReceber ${conta.cliente_nome} (R$ ${conta.valor_original}) sem liquidação`,
          acao: 'Criar liquidação ou ajustar status'
        });
      }
    }

    // 3. Valida ContaPagar sem Liquidação
    const contasPagar = await base44.entities.ContaPagar.filter({
      workshop_id,
      status: { $in: ['aberto', 'parcial'] }
    });

    let contasPagarSemLiq = 0;
    for (const conta of contasPagar) {
      const liquidacoes = await base44.entities.LiquidacaoFinanceira.filter({
        conta_pagar_id: conta.id
      });

      if (liquidacoes.length === 0 && conta.valor_aberto === 0) {
        contasPagarSemLiq++;
        validacoes.push({
          tipo: 'conta_pagar_sem_liquidacao',
          gravidade: 'alta',
          entidade_id: conta.id,
          descricao: `ContaPagar ${conta.fornecedor_nome} (R$ ${conta.valor_original}) sem liquidação`,
          acao: 'Criar liquidação ou ajustar status'
        });
      }
    }

    // 4. Valida Liquidação sem BankTransaction (conciliação)
    const liquidacoes = await base44.entities.LiquidacaoFinanceira.filter({
      workshop_id,
      conciliado: false,
      data_liquidacao: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) }
    });

    let liquidacoesNaoConciliadas = 0;
    for (const liq of liquidacoes) {
      liquidacoesNaoConciliadas++;
      validacoes.push({
        tipo: 'liquidacao_nao_conciliada',
        gravidade: 'media',
        entidade_id: liq.id,
        descricao: `Liquidação de R$ ${liq.valor_liquidacao} em ${liq.data_liquidacao} não conciliada`,
        acao: 'Importar extrato ou conciliar manualmente'
      });
    }

    // 5. Valida valores divergentes (DRE vs ContaReceber)
    let valoresDivergentes = 0;
    for (const dre of dreLancamentos) {
      const contas = await base44.entities.ContaReceber.filter({
        dre_lancamento_id: dre.id
      });

      for (const conta of contas) {
        const diff = Math.abs(dre.valor - conta.valor_original);
        if (diff > 0.01) {
          valoresDivergentes++;
          validacoes.push({
            tipo: 'valor_divergente',
            gravidade: 'critica',
            entidade_id: dre.id,
            descricao: `Divergência: DRE R$ ${dre.valor} vs ContaReceber R$ ${conta.valor_original}`,
            acao: 'Ajustar valores para bater'
          });
        }
      }
    }

    // 6. Valida duplicidade de ContaReceber
    const contasReceberAll = await base44.entities.ContaReceber.filter({
      workshop_id
    });

    const gruposDuplicados = {};
    for (const conta of contasReceberAll) {
      const chave = `${conta.dre_lancamento_id || ''}-${conta.valor_original}-${conta.data_vencimento}`;
      if (!gruposDuplicados[chave]) {
        gruposDuplicados[chave] = [];
      }
      gruposDuplicados[chave].push(conta);
    }

    let duplicatas = 0;
    for (const [chave, contas] of Object.entries(gruposDuplicados)) {
      if (contas.length > 1) {
        duplicatas++;
        validacoes.push({
          tipo: 'conta_receber_duplicada',
          gravidade: 'alta',
          entidade_ids: contas.map(c => c.id),
          descricao: `${contas.length} ContaReceber duplicadas para mesmo DRE`,
          acao: 'Excluir duplicatas'
        });
      }
    }

    // 7. Valida integridade de datas
    let datasInconsistentes = 0;
    for (const conta of contasReceberAll) {
      if (conta.data_vencimento && conta.data_primeiro_pagamento) {
        if (conta.data_primeiro_pagamento < conta.data_emissao) {
          datasInconsistentes++;
          validacoes.push({
            tipo: 'data_inconsistente',
            gravidade: 'media',
            entidade_id: conta.id,
            descricao: `Data pagamento (${conta.data_primeiro_pagamento}) anterior à emissão (${conta.data_emissao})`,
            acao: 'Corrigir datas'
          });
        }
      }
    }

    // Ordena por gravidade
    const gravidadeOrder = { critica: 0, alta: 1, media: 2, baixa: 3 };
    validacoes.sort((a, b) => gravidadeOrder[a.gravidade] - gravidadeOrder[b.gravidade]);

    totalErros = validacoes.filter(v => v.gravidade === 'critica' || v.gravidade === 'alta').length;

    // Registra auditoria
    await base44.functions.auditLog({
      acao: 'validar_integridade_historico',
      entidade: 'Multiple',
      usuario_id: user.id,
      usuario_email: user.email,
      detalhes: {
        workshop_id,
        total_validacoes: validacoes.length,
        total_erros: totalErros
      }
    });

    return Response.json({
      success: true,
      total_validacoes: validacoes.length,
      total_erros: totalErros,
      resumo: {
        dre_sem_conta: dreSemConta,
        contas_receber_sem_liquidacao: contasSemLiq,
        contas_pagar_sem_liquidacao: contasPagarSemLiq,
        liquidacoes_nao_conciliadas: liquidacoesNaoConciliadas,
        valores_divergentes: valoresDivergentes,
        duplicatas: duplicatas,
        datas_inconsistentes: datasInconsistentes
      },
      validacoes
    });

  } catch (error) {
    console.error('Erro na validação:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});