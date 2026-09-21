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
    // S1-T1.2: appenda item ao historico_alteracoes para rastreabilidade na UI
    const historicoAtual = conta.historico_alteracoes || [];
    const itemEstorno = {
      tipo: 'estorno',
      usuario_nome: user.full_name || user.email || '—',
      usuario_email: user.email || '',
      data_hora: new Date().toISOString(),
      detalhes: `Estorno de R$${liquidacao.valor_liquidacao.toFixed(2)}. Motivo: ${motivo.trim()}`,
    };
    await base44.entities[entityName].update(entidadeId, {
      valor_pago: Math.max(0, novoValorPago),
      valor_aberto: Math.max(0, novoValorAberto),
      status: novoStatus,
      data_primeiro_pagamento: novoValorPago <= 0 ? null : conta.data_primeiro_pagamento,
      dias_atraso: 0,
      historico_alteracoes: [...historicoAtual, itemEstorno],
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

    // 4. Registra auditoria com motivo informado pelo usuário
    try {
      await base44.functions.invoke('auditLog', {
        acao: 'desfazer_liquidacao',
        entidade: 'LiquidacaoFinanceira',
        entidade_id: liquidacao_id,
        usuario_id: user.id,
        usuario_email: user.email,
        detalhes: {
          motivo: motivo.trim(),
          valor: liquidacao.valor_liquidacao,
          conta_id: entidadeId,
          conta_tipo: entityName,
          perfil_usuario: perfilUsuario,
        }
      });
    } catch (_) {
      // auditLog falha silenciosamente — o estorno já foi concluído
    }

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