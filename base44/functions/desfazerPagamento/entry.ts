import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { liquidacao_financeira_id, justificativa } = await req.json();

    if (!liquidacao_financeira_id) {
      return Response.json({ error: 'Liquidação Financeira ID obrigatório' }, { status: 400 });
    }

    // Busca liquidação
    const liquidacao = await base44.entities.LiquidacaoFinanceira.get(liquidacao_financeira_id);
    if (!liquidacao) {
      return Response.json({ error: 'Liquidação não encontrada' }, { status: 404 });
    }

    if (!liquidacao.conta_receber_id) {
      return Response.json({ error: 'Liquidação não está vinculada a uma ContaReceber' }, { status: 400 });
    }

    // Busca conta a receber
    const contaReceber = await base44.entities.ContaReceber.get(liquidacao.conta_receber_id);
    if (!contaReceber) {
      return Response.json({ error: 'Conta a receber não encontrada' }, { status: 404 });
    }

    // PASO 1: Deleta BankTransaction vinculada
    const bankTx = await base44.entities.BankTransaction.filter({
      liquidacao_financeira_id: liquidacao_financeira_id
    });
    if (bankTx.length > 0) {
      await base44.entities.BankTransaction.delete(bankTx[0].id);
    }

    // PASO 2: Deleta DFC gerado
    const dfcLancamentos = await base44.entities.DFCLancamento.filter({
      workshop_id: liquidacao.workshop_id
    });
    
    const dfcParaDeletar = dfcLancamentos.filter(d => 
      d.detalhes?.liquidacao_financeira_id === liquidacao_financeira_id ||
      d.detalhes?.conta_receber_id === liquidacao.conta_receber_id
    );
    
    for (const dfc of dfcParaDeletar) {
      await base44.entities.DFCLancamento.delete(dfc.id);
    }

    // PASO 3: Reverte ContaReceber
    const valorPagoAnterior = (contaReceber.valor_pago || 0) - liquidacao.valor_liquidacao;
    const valorAbertoAnterior = (contaReceber.valor_aberto || 0) + liquidacao.valor_liquidacao;
    
    let statusAnterior = 'aberto';
    if (valorPagoAnterior <= 0) {
      statusAnterior = 'aberto';
    } else if (valorPagoAnterior < contaReceber.valor_original) {
      statusAnterior = 'parcial';
    } else {
      statusAnterior = 'pago';
    }

    await base44.entities.ContaReceber.update(liquidacao.conta_receber_id, {
      valor_pago: valorPagoAnterior,
      valor_aberto: valorAbertoAnterior,
      status: statusAnterior,
      data_primeiro_pagamento: null,
      dias_atraso: 0
    });

    // PASO 4: Deleta LiquidaçãoFinanceira
    await base44.entities.LiquidacaoFinanceira.delete(liquidacao_financeira_id);

    // PASO 5: Registra auditoria
    await base44.functions.auditLog({
      acao: 'desfazer_pagamento',
      entidade: 'ContaReceber',
      entidade_id: liquidacao.conta_receber_id,
      usuario_id: user.id,
      usuario_email: user.email,
      detalhes: {
        liquidacao_id: liquidacao_financeira_id,
        valor_estornado: liquidacao.valor_liquidacao,
        justificativa,
        status_anterior: contaReceber.status,
        status_novo: statusAnterior
      }
    });

    return Response.json({
      success: true,
      message: 'Pagamento desfeito com sucesso',
      conta_receber: {
        id: liquidacao.conta_receber_id,
        status: statusAnterior,
        valor_pago: valorPagoAnterior,
        valor_aberto: valorAbertoAnterior
      },
      auditado: true
    });

  } catch (error) {
    console.error('Erro ao desfazer pagamento:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});