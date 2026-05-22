import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      bank_transaction_id,
      liquidacao_financeira_id
    } = await req.json();

    // Validações
    if (!bank_transaction_id || !liquidacao_financeira_id) {
      return Response.json({ 
        error: 'bank_transaction_id e liquidacao_financeira_id obrigatórios' 
      }, { status: 400 });
    }

    // Busca transações
    const bankTx = await base44.entities.BankTransaction.get(bank_transaction_id);
    const liquidacao = await base44.entities.LiquidacaoFinanceira.get(liquidacao_financeira_id);

    if (!bankTx || !liquidacao) {
      return Response.json({ error: 'Transação ou liquidação não encontrada' }, { status: 404 });
    }

    // Valida valores (tolerância de 0.01)
    const diffValor = Math.abs(bankTx.valor - liquidacao.valor_liquidacao);
    if (diffValor > 0.01) {
      return Response.json({ 
        error: 'Valores divergentes',
        detalhe: `Banco: R$ ${bankTx.valor}, Sistema: R$ ${liquidacao.valor_liquidacao}`,
        divergencia: diffValor
      }, { status: 400 });
    }

    // Concilia!
    await base44.entities.BankTransaction.update(bank_transaction_id, {
      liquidacao_financeira_id,
      status_conciliacao: 'conciliado',
      data_conciliacao: new Date().toISOString(),
      conciliado_por: user.email,
      observacoes: `Conciliação manual por ${user.email}`
    });

    await base44.entities.LiquidacaoFinanceira.update(liquidacao_financeira_id, {
      conciliado: true,
      data_conciliacao: new Date().toISOString()
    });

    // Registra auditoria
    await base44.functions.auditLog({
      acao: 'conciliacao_manual',
      entidade: 'BankTransaction',
      entidade_id: bank_transaction_id,
      usuario_id: user.id,
      usuario_email: user.email,
      detalhes: {
        bank_transaction_id,
        liquidacao_financeira_id,
        valor: bankTx.valor,
        banco: bankTx.banco
      }
    });

    return Response.json({
      success: true,
      message: 'Conciliação realizada com sucesso',
      bank_transaction_id,
      liquidacao_financeira_id,
      conciliado_por: user.email
    });

  } catch (error) {
    console.error('Erro ao conciliar manualmente:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});