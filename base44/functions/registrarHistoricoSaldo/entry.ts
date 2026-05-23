import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Registra histórico de alteração do Saldo Inicial
 * 
 * Payload esperado:
 * {
 *   workshop_id: string,
 *   dfc_lancamento_id: string,
 *   mes: string (YYYY-MM),
 *   tipo_alteracao: 'criacao' | 'edicao' | 'liquidacao' | 'exclusao',
 *   valor_anterior: number,
 *   valor_novo: number,
 *   detalhes_anteriores: object,
 *   detalhes_novos: object,
 *   campo_alterado: string (opcional),
 *   valor_delta: number (opcional),
 *   origem_alteracao: 'modal_saldo_inicial' | 'liquidacao_pagamento' | 'liquidacao_recebimento' | 'backfill',
 *   liquidacao_id?: string,
 *   conta_pagar_id?: string,
 *   conta_receber_id?: string,
 *   observacoes?: string
 * }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const {
      workshop_id,
      dfc_lancamento_id,
      mes,
      tipo_alteracao,
      valor_anterior,
      valor_novo,
      detalhes_anteriores,
      detalhes_novos,
      campo_alterado,
      valor_delta,
      origem_alteracao,
      liquidacao_id,
      conta_pagar_id,
      conta_receber_id,
      observacoes,
    } = payload;

    // Validar campos obrigatórios
    if (!workshop_id || !dfc_lancamento_id || !mes || !tipo_alteracao) {
      return Response.json(
        { error: 'Campos obrigatórios faltando: workshop_id, dfc_lancamento_id, mes, tipo_alteracao' },
        { status: 400 }
      );
    }

    // Buscar versão mais recente para calcular próximo número
    const registrosExistentes = await base44.entities.SaldoInicialHistorico.filter({
      workshop_id,
      dfc_lancamento_id,
    }, '-versao', 1);

    const versao = (registrosExistentes?.[0]?.versao || 0) + 1;

    // Criar registro de histórico
    await base44.entities.SaldoInicialHistorico.create({
      workshop_id,
      dfc_lancamento_id,
      mes,
      versao,
      tipo_alteracao,
      valor_anterior: valor_anterior || 0,
      valor_novo: valor_novo || 0,
      detalhes_anteriores,
      detalhes_novos,
      campo_alterado,
      valor_delta,
      origem_alteracao: origem_alteracao || 'modal_saldo_inicial',
      liquidacao_id,
      conta_pagar_id,
      conta_receber_id,
      criado_por: user.id,
      criado_por_nome: user.full_name || user.name || 'Desconhecido',
      criado_por_email: user.email,
      criado_em: new Date().toISOString(),
      observacoes,
    });

    return Response.json({ 
      success: true, 
      message: 'Histórico registrado com sucesso',
      versao 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});