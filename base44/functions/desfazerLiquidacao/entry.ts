import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Apenas administradores podem desfazer liquidação' }, { status: 403 });
    }

    const { liquidacao_id } = await req.json();

    if (!liquidacao_id) {
      return Response.json({ error: 'ID da liquidação obrigatório' }, { status: 400 });
    }

    // Busca a liquidação
    const liquidacao = await base44.entities.LiquidacaoFinanceira.get(liquidacao_id);
    
    if (!liquidacao) {
      return Response.json({ error: 'Liquidação não encontrada' }, { status: 404 });
    }

    // Determina qual conta afetar
    const entidadeId = liquidacao.conta_receber_id || liquidacao.conta_pagar_id;
    const entityName = liquidacao.conta_receber_id ? 'ContaReceber' : 'ContaPagar';
    
    if (!entidadeId) {
      return Response.json({ error: 'Liquidação sem conta vinculada' }, { status: 400 });
    }

    // Busca a conta
    const conta = await base44.entities[entityName].get(entidadeId);
    
    if (!conta) {
      return Response.json({ error: 'Conta não encontrada' }, { status: 404 });
    }

    // Calcula novos valores (reverter)
    const novoValorPago = (conta.valor_pago || 0) - liquidacao.valor_liquidacao;
    const novoValorAberto = conta.valor_original - novoValorPago;
    const novoStatus = novoValorAberto >= conta.valor_original ? 'aberto' : 'parcial';

    // 1. Reverte ContaReceber ou ContaPagar
    await base44.entities[entityName].update(entidadeId, {
      valor_pago: Math.max(0, novoValorPago),
      valor_aberto: Math.max(0, novoValorAberto),
      status: novoStatus,
      data_primeiro_pagamento: null, // Remove data de pagamento
      dias_atraso: 0
    });

    // 2. Deleta DFC gerado (se existir)
    const dfcs = await base44.entities.DFCLancamento.filter({
      liquidacao_financeira_id: liquidacao_id
    });

    for (const dfc of dfcs) {
      await base44.entities.DFCLancamento.delete(dfc.id);
    }

    // 3. Deleta LiquidaçãoFinanceira
    await base44.entities.LiquidacaoFinanceira.delete(liquidacao_id);

    // 4. Registra auditoria
    await base44.functions.auditLog({
      acao: 'desfazer_liquidacao',
      entidade: 'LiquidacaoFinanceira',
      entidade_id: liquidacao_id,
      usuario_id: user.id,
      usuario_email: user.email,
      detalhes: {
        motivo: 'Reversão de liquidação',
        valor: liquidacao.valor_liquidacao,
        conta_id: entidadeId,
        conta_tipo: entityName
      }
    });

    return Response.json({
      success: true,
      message: 'Liquidação desfeita com sucesso',
      conta_status: novoStatus,
      valor_pago: Math.max(0, novoValorPago),
      valor_aberto: Math.max(0, novoValorAberto)
    });

  } catch (error) {
    console.error('Erro ao desfazer liquidação:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});