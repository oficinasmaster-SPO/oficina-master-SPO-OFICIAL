import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      conta_receber_id,
      conta_pagar_id,
      tipo,
      valor_liquidacao,
      forma_pagamento,
      data_liquidacao,
      banco,
      observacoes
    } = body;

    // Suporta tanto nomes curtos quanto nomes completos dos campos financeiros
    const desconto = body.desconto_concedido ?? body.desconto ?? 0;
    const juros    = body.juros_recebido    ?? body.juros    ?? 0;
    const multa    = body.multa_recebida    ?? body.multa    ?? 0;

    // Validações
    if (!valor_liquidacao || valor_liquidacao <= 0) {
      return Response.json({ error: 'Valor inválido' }, { status: 400 });
    }

    if (!forma_pagamento) {
      return Response.json({ error: 'Forma de pagamento obrigatória' }, { status: 400 });
    }

    if (!data_liquidacao) {
      return Response.json({ error: 'Data de liquidação obrigatória' }, { status: 400 });
    }

    // Determina qual entidade usar
    const entidadeId = conta_receber_id || conta_pagar_id;
    const entityName = conta_receber_id ? 'ContaReceber' : 'ContaPagar';
    
    if (!entidadeId) {
      return Response.json({ error: 'Informe conta_receber_id ou conta_pagar_id' }, { status: 400 });
    }

    // Busca a conta
    const conta = await base44.entities[entityName].get(entidadeId);
    
    if (!conta) {
      return Response.json({ error: 'Conta não encontrada' }, { status: 404 });
    }

    // Calcula novos valores — usa valor_aberto atual como base para suportar pagamentos parciais
    const valorAbertoAtual = (conta.valor_aberto != null) ? conta.valor_aberto : conta.valor_original;
    const novoValorAberto = Math.max(0, valorAbertoAtual - valor_liquidacao);
    const novoValorPago = (conta.valor_pago || 0) + valor_liquidacao;
    const novoStatus = novoValorAberto <= 0.01 ? 'pago' : 'parcial';

    // Valida se não está pagando mais que o saldo em aberto (com 1 centavo de tolerância)
    if (valor_liquidacao > valorAbertoAtual + 0.01) {
      return Response.json({ 
        error: 'Valor pago excede o saldo em aberto',
        detalhe: `Tentando pagar: ${valor_liquidacao}, Saldo em aberto: ${valorAbertoAtual}`
      }, { status: 400 });
    }

    // 1. Atualiza ContaReceber ou ContaPagar
    const updatePayload = {
      valor_pago: novoValorPago,
      valor_aberto: novoValorAberto,
      status: novoStatus,
      dias_atraso: calcularDiasAtraso(conta.data_vencimento, data_liquidacao)
    };
    // Só preenche data_primeiro_pagamento se ainda não existir
    if (!conta.data_primeiro_pagamento) {
      updatePayload.data_primeiro_pagamento = data_liquidacao;
    }
    await base44.entities[entityName].update(entidadeId, updatePayload);

    // 2. Cria LiquidaçãoFinanceira
    const liquidacao = await base44.entities.LiquidacaoFinanceira.create({
      workshop_id: conta.workshop_id,
      conta_receber_id,
      conta_pagar_id,
      tipo,
      valor_liquidacao,
      data_liquidacao,
      forma_pagamento,
      banco_destino: banco || null,
      desconto_concedido: desconto || 0,
      juros_recebido: juros || 0,
      multa_recebida: multa || 0,
      valor_liquido: valor_liquidacao + (juros || 0) + (multa || 0) - (desconto || 0),
      conciliado: false,
      observacoes: observacoes || ''
    });

    // 3. Atualiza data_pagamento no DRELancamento de origem (para refletir no DRE e Controle Orçamentário)
    try {
      const dre_lancamento_id = conta.dre_lancamento_id;

      if (dre_lancamento_id) {
        await base44.entities.DRELancamento.update(dre_lancamento_id, {
          data_pagamento: data_liquidacao
        });
      } else {
        // Fallback: busca LiquidacoesFinanceiras anteriores desta conta para encontrar o DRELancamento
        // Tenta buscar nas ContasPagar/ContaReceber o dre_lancamento_id via busca por valor+mês+workshop
        const mes = String(data_liquidacao).slice(0, 7);
        const dresCandidatos = await base44.asServiceRole.entities.DRELancamento.filter({
          workshop_id: conta.workshop_id,
          mes,
          valor: conta.valor_original
        }, '-created_date', 5);
        // Pega o primeiro que ainda não tem data_pagamento (evita sobrescrever outros já pagos)
        const dreSemPagamento = dresCandidatos?.find(d => !d.data_pagamento);
        if (dreSemPagamento) {
          await base44.entities.DRELancamento.update(dreSemPagamento.id, {
            data_pagamento: data_liquidacao
          });
          // Vincula para futuras liquidações
          await base44.entities[entityName].update(entidadeId, {
            dre_lancamento_id: dreSemPagamento.id
          });
        }
      }
    } catch (_) { /* não bloqueia se não houver DRE vinculado */ }

    // 4. Gera DFC (SÓ AGORA!)
    // Usa os primeiros 7 chars da string diretamente para evitar bug de timezone UTC
    const mesReferencia = String(data_liquidacao).slice(0, 7); // YYYY-MM
    
    await base44.entities.DFCLancamento.create({
      workshop_id: conta.workshop_id,
      mes: mesReferencia,
      origem: 'manual',
      tipo: tipo === 'recebimento' ? 'entrada' : 'saida',
      grupo: 'operacional',
      descricao: `${tipo === 'recebimento' ? 'Recebimento' : 'Pagamento'} - ${conta.cliente_nome || conta.fornecedor_nome}`,
      valor: valor_liquidacao,
    });

    return Response.json({
      success: true,
      liquidacao_id: liquidacao.id,
      conta_status: novoStatus,
      valor_pago: novoValorPago,
      valor_aberto: novoValorAberto,
      dfc_gerado: true,
      mes_dfc: mesReferencia
    });

  } catch (error) {
    console.error('Erro ao registrar liquidação:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function calcularDiasAtraso(dataVencimento, dataPagamento) {
  const vencimento = new Date(dataVencimento);
  const pagamento = new Date(dataPagamento);
  const diffTime = pagamento.getTime() - vencimento.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}