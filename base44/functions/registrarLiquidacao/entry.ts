import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      conta_receber_id,
      conta_pagar_id,
      tipo,
      valor_liquidacao,
      forma_pagamento,
      data_liquidacao,
      banco,
      desconto,
      juros,
      multa,
      observacoes
    } = await req.json();

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

    // Calcula novos valores
    const novoValorPago = (conta.valor_pago || 0) + valor_liquidacao;
    const novoValorAberto = conta.valor_original - novoValorPago;
    const novoStatus = novoValorAberto <= 0 ? 'pago' : 'parcial';

    // Valida se não está pagando mais que o devido
    if (novoValorPago > conta.valor_original * 1.01) { // 1% de tolerância
      return Response.json({ 
        error: 'Valor pago excede o valor original',
        detalhe: `Pago: ${novoValorPago}, Original: ${conta.valor_original}`
      }, { status: 400 });
    }

    // 1. Atualiza ContaReceber ou ContaPagar
    await base44.entities[entityName].update(entidadeId, {
      valor_pago: novoValorPago,
      valor_aberto: novoValorAberto,
      status: novoStatus,
      data_primeiro_pagamento: data_liquidacao,
      dias_atraso: calcularDiasAtraso(conta.data_vencimento, data_liquidacao)
    });

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
      }
    } catch (_) { /* não bloqueia se não houver DRE vinculado */ }

    // 4. Gera DFC (SÓ AGORA!)
    const mesReferencia = new Date(data_liquidacao).toISOString().slice(0, 7); // YYYY-MM
    
    await base44.entities.DFCLancamento.create({
      workshop_id: conta.workshop_id,
      mes: mesReferencia,
      origem: 'liquidacao_financeira',
      tipo: tipo === 'recebimento' ? 'entrada' : 'saida',
      grupo: 'operacional',
      descricao: `${tipo === 'recebimento' ? 'Recebimento' : 'Pagamento'} - ${conta.cliente_nome || conta.fornecedor_nome}`,
      valor: valor_liquidacao,
      data_pagamento: data_liquidacao,
      forma_pagamento: forma_pagamento,
      liquidacao_financeira_id: liquidacao.id,
      conta_receber_id: conta_receber_id || null,
      conta_pagar_id: conta_pagar_id || null
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