import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Apenas administradores podem reabrir mês
    if (user.role !== 'admin') {
      return Response.json({ error: 'Apenas administradores podem reabrir mês' }, { status: 403 });
    }

    const { mes, workshop_id, justificativa } = await req.json();

    // Validações
    if (!mes || !/^\d{4}-\d{2}$/.test(mes)) {
      return Response.json({ error: 'Mês inválido (use YYYY-MM)' }, { status: 400 });
    }

    if (!workshop_id) {
      return Response.json({ error: 'Workshop ID obrigatório' }, { status: 400 });
    }

    if (!justificativa || justificativa.length < 20) {
      return Response.json({ error: 'Justificativa obrigatória (mínimo 20 caracteres)' }, { status: 400 });
    }

    // Busca snapshot fechado
    const snapshot = await base44.entities.FinancialMonthSnapshot.filter({
      workshop_id,
      mes,
      status: 'fechado'
    });

    if (snapshot.length === 0) {
      return Response.json({ error: 'Mês não está fechado' }, { status: 400 });
    }

    const snapshotId = snapshot[0].id;

    // Atualiza snapshot para "aberto"
    await base44.entities.FinancialMonthSnapshot.update(snapshotId, {
      status: 'aberto',
      justificativa_reabertura: justificativa,
      data_reabertura: new Date().toISOString(),
      reaberto_por: user.id,
      reaberto_por_nome: user.full_name,
      reaberto_por_email: user.email
    });

    // Registra auditoria
    await base44.functions.auditLog({
      acao: 'reabrir_mes',
      entidade: 'FinancialMonthSnapshot',
      entidade_id: snapshotId,
      usuario_id: user.id,
      usuario_email: user.email,
      detalhes: {
        mes,
        workshop_id,
        justificativa,
        snapshot_id: snapshotId
      }
    });

    return Response.json({
      success: true,
      message: 'Mês reaberto com sucesso',
      snapshot_id: snapshotId,
      mes,
      reaberto_em: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro ao reabrir mês:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});