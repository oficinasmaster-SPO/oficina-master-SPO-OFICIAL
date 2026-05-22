import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { bank_transaction_id, liquidacao_financeira_id, observacoes } = await req.json();

    if (!bank_transaction_id || !liquidacao_financeira_id) {
      return Response.json({ 
        error: 'bank_transaction_id e liquidacao_financeira_id obrigatórios' 
      }, { status: 400 });
    }

    const [transacao, liquidacao] = await Promise.all([
      base44.entities.BankTransaction.get(bank_transaction_id),
      base44.entities.LiquidacaoFinanceira.get(liquidacao_financeira_id)
    ]);

    if (!transacao) return Response.json({ error: 'Transação bancária não encontrada' }, { status: 404 });
    if (!liquidacao) return Response.json({ error: 'Liquidação não encontrada' }, { status: 404 });

    const divergenciaValor = Math.abs(transacao.valor - liquidacao.valor_liquidacao);
    const temDivergencia = divergenciaValor > 0.01;

    await Promise.all([
      base44.entities.BankTransaction.update(bank_transaction_id, {
        liquidacao_financeira_id,
        status_conciliacao: 'conciliado',
        divergencia_valor: temDivergencia ? divergenciaValor : 0,
        divergencia_tipo: temDivergencia ? 'valor_diferente' : null,
        data_conciliacao: new Date().toISOString(),
        conciliado_por: user.email,
        observacoes: observacoes || ''
      }),
      base44.entities.LiquidacaoFinanceira.update(liquidacao_financeira_id, {
        conciliado: true,
        data_conciliacao: new Date().toISOString(),
        conciliado_por: user.email
      })
    ]);

    return Response.json({
      success: true,
      divergencia: temDivergencia ? { detectada: true, valor: divergenciaValor } : { detectada: false }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});