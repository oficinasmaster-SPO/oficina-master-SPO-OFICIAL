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

    const correcoes = {
      dre_atualizados: 0,
      contas_receber_atualizadas: 0,
      contas_pagar_atualizadas: 0,
      liquidacoes_atualizadas: 0,
      erros: []
    };

    // 1. Atualiza status de ContaReceber baseado em liquidações
    const contasReceber = await base44.entities.ContaReceber.filter({
      workshop_id
    });

    for (const conta of contasReceber) {
      const liquidacoes = await base44.entities.LiquidacaoFinanceira.filter({
        conta_receber_id: conta.id
      });

      const totalPago = liquidacoes.reduce((sum, l) => sum + l.valor_liquidacao, 0);
      const novoStatus = totalPago >= conta.valor_original ? 'pago' : 
                         totalPago > 0 ? 'parcial' : 'aberto';

      if (novoStatus !== conta.status) {
        await base44.entities.ContaReceber.update(conta.id, {
          status: novoStatus,
          valor_pago: totalPago,
          valor_aberto: conta.valor_original - totalPago
        });
        correcoes.contas_receber_atualizadas++;
      }
    }

    // 2. Atualiza status de ContaPagar baseado em liquidações
    const contasPagar = await base44.entities.ContaPagar.filter({
      workshop_id
    });

    for (const conta of contasPagar) {
      const liquidacoes = await base44.entities.LiquidacaoFinanceira.filter({
        conta_pagar_id: conta.id
      });

      const totalPago = liquidacoes.reduce((sum, l) => sum + l.valor_liquidacao, 0);
      const novoStatus = totalPago >= conta.valor_original ? 'pago' : 
                         totalPago > 0 ? 'parcial' : 'aberto';

      if (novoStatus !== conta.status) {
        await base44.entities.ContaPagar.update(conta.id, {
          status: novoStatus,
          valor_pago: totalPago,
          valor_aberto: conta.valor_original - totalPago
        });
        correcoes.contas_pagar_atualizadas++;
      }
    }

    // 3. Atualiza dias_atraso
    const hoje = new Date().toISOString().slice(0, 10);
    
    for (const conta of contasReceber) {
      if (conta.status !== 'pago' && conta.data_vencimento) {
        const diasAtraso = conta.data_vencimento < hoje 
          ? Math.floor((new Date(hoje) - new Date(conta.data_vencimento)) / (1000 * 60 * 60 * 24))
          : 0;

        if (diasAtraso !== (conta.dias_atraso || 0)) {
          await base44.entities.ContaReceber.update(conta.id, {
            dias_atraso: diasAtraso
          });
          correcoes.contas_receber_atualizadas++;
        }
      }
    }

    for (const conta of contasPagar) {
      if (conta.status !== 'pago' && conta.data_vencimento) {
        const diasAtraso = conta.data_vencimento < hoje 
          ? Math.floor((new Date(hoje) - new Date(conta.data_vencimento)) / (1000 * 60 * 60 * 24))
          : 0;

        if (diasAtraso !== (conta.dias_atraso || 0)) {
          await base44.entities.ContaPagar.update(conta.id, {
            dias_atraso: diasAtraso
          });
          correcoes.contas_pagar_atualizadas++;
        }
      }
    }

    // 4. Atualiza conciliado em Liquidações antigas
    const liquidacoes = await base44.entities.LiquidacaoFinanceira.filter({
      workshop_id,
      data_liquidacao: { $lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) }
    });

    for (const liq of liquidacoes) {
      if (!liq.conciliado) {
        await base44.entities.LiquidacaoFinanceira.update(liq.id, {
          conciliado: true,
          data_conciliacao: liq.data_liquidacao,
          observacoes: (liq.observacoes || '') + ' | Conciliado via auto-backfill'
        });
        correcoes.liquidacoes_atualizadas++;
      }
    }

    // 5. Remove duplicatas de ContaReceber
    const gruposDuplicados = {};
    for (const conta of contasReceber) {
      const chave = `${conta.dre_lancamento_id || ''}-${conta.valor_original}-${conta.data_vencimento}`;
      if (!gruposDuplicados[chave]) {
        gruposDuplicados[chave] = [];
      }
      gruposDuplicados[chave].push(conta);
    }

    for (const [chave, contas] of Object.entries(gruposDuplicados)) {
      if (contas.length > 1) {
        // Mantém a primeira, exclui as outras
        for (let i = 1; i < contas.length; i++) {
          try {
            await base44.entities.ContaReceber.delete(contas[i].id);
            correcoes.contas_receber_atualizadas++;
          } catch (error) {
            correcoes.erros.push({
              acao: 'excluir_duplicata',
              entidade_id: contas[i].id,
              erro: error.message
            });
          }
        }
      }
    }

    // Registra auditoria
    await base44.functions.auditLog({
      acao: 'corrigir_integridade_historico',
      entidade: 'Multiple',
      usuario_id: user.id,
      usuario_email: user.email,
      detalhes: {
        workshop_id,
        correcoes
      }
    });

    return Response.json({
      success: true,
      message: 'Correções aplicadas com sucesso',
      correcoes,
      resumo: {
        total_correcoes: correcoes.dre_atualizados + correcoes.contas_receber_atualizadas + 
                        correcoes.contas_pagar_atualizadas + correcoes.liquidacoes_atualizadas,
        total_erros: correcoes.erros.length
      }
    });

  } catch (error) {
    console.error('Erro nas correções:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});