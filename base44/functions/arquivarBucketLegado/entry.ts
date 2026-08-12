import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';

/**
 * Arquivamento ONE-SHOT do bucket legado de ContractAttendance.
 *
 * - Arquiva APENAS pendentes (status='pendente') → status='cancelado'.
 * - NÃO toca em agendado/realizado (preserva vínculo com ConsultoriaAtendimento).
 * - Registra trilha de auditoria em SystemEventLog (evento BUCKET_LEGADO_ARCHIVED)
 *   com a lista completa de IDs arquivados + breakdown por plano/tipo/oficina.
 * - Admin-only.
 *
 * Idempotente: pode ser re-executada; se não houver pendentes, retorna archived=0.
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });
    }

    // ── 1) Snapshot dos pendentes atuais (IDs + breakdown) ────────────────────
    const pendentes = await base44.asServiceRole.entities.ContractAttendance.filter(
      { status: 'pendente' },
      '-created_date',
      2000
    );

    if (!pendentes || pendentes.length === 0) {
      return Response.json({
        success: true,
        message: 'Nenhum pendente para arquivar — bucket já limpo',
        total_archived: 0
      });
    }

    const ids = pendentes.map(p => p.id);
    const total = ids.length;

    const porPlano = {};
    const porTipo = {};
    const porWorkshop = {};
    for (const p of pendentes) {
      const pl = (p.plan_id || '').toUpperCase().trim() || '(sem plan_id)';
      porPlano[pl] = (porPlano[pl] || 0) + 1;
      const tp = p.attendance_type_name || '(sem tipo)';
      porTipo[tp] = (porTipo[tp] || 0) + 1;
      const ws = p.workshop_id || '(sem workshop_id)';
      porWorkshop[ws] = (porWorkshop[ws] || 0) + 1;
    }

    // ── 2) Arquivar pendentes → cancelado (query específica) ──────────────────
    const updateRes = await base44.asServiceRole.entities.ContractAttendance.updateMany(
      { status: 'pendente' },
      { $set: { status: 'cancelado' } }
    );

    // ── 3) Trilha de auditoria em SystemEventLog ──────────────────────────────
    await base44.asServiceRole.entities.SystemEventLog.create({
      event_type: 'BUCKET_LEGADO_ARCHIVED',
      entity_type: 'ContractAttendance',
      triggered_by: 'admin',
      status: 'success',
      timestamp: new Date().toISOString(),
      details: {
        total_archived: total,
        archived_ids: ids,
        admin_id: user.id,
        admin_email: user.email,
        oficinas_distintas: Object.keys(porWorkshop).length,
        por_plano: porPlano,
        por_tipo: porTipo,
        por_workshop: porWorkshop
      }
    });

    return Response.json({
      success: true,
      message: `${total} atendimentos pendentes arquivados (status: cancelado)`,
      total_archived: total,
      oficinas_distintas: Object.keys(porWorkshop).length,
      por_plano: porPlano,
      por_tipo: porTipo,
      update_result: updateRes
    });
  } catch (error) {
    console.error('[arquivarBucketLegado] Fatal:', error);
    return Response.json({ error: error.message, details: error.toString() }, { status: 500 });
  }
}