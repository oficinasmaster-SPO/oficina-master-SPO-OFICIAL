import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ALLOWED_ACTIONS = {
  auditRBACHealth: true,
  cleanupExpiredInvites: true,
  cleanupAbandonedWorkshops: true,
};

const FULL_CHECK_ACTIONS = ['auditRBACHealth', 'auditOrphanEmployees', 'auditOrphanUsers'];

async function runAction(base44, action, user, ip) {
  const startedAt = Date.now();
  let result = null;
  let resultStatus = 'success';
  let errorMessage = null;

  try {
    const res = await base44.functions.invoke(action, {});
    result = res?.data ?? res ?? null;
  } catch (err) {
    resultStatus = 'error';
    errorMessage = err?.response?.data?.error || err?.message || 'Erro desconhecido';
  }

  const duration_ms = Date.now() - startedAt;

  try {
    await base44.asServiceRole.entities.SystemEventLog.create({
      event_type: 'SYSTEM_MAINTENANCE_EXECUTED',
      entity_type: 'SystemMaintenance',
      triggered_by: 'admin',
      status: resultStatus === 'success' ? 'success' : 'error',
      timestamp: new Date().toISOString(),
      details: {
        action,
        executed_by: user.email,
        executed_by_id: user.id,
        ip,
        duration_ms,
        result: result || null,
        error: errorMessage,
      },
    });
  } catch (_) {}

  return { action, resultStatus, result, errorMessage, duration_ms };
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { action } = body;
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

  // Verificação Completa
  if (action === 'runFullCheck') {
    const globalStart = Date.now();
    const results = await Promise.all(
      FULL_CHECK_ACTIONS.map(a => runAction(base44, a, user, ip))
    );
    const totalDuration = Date.now() - globalStart;
    const errors = results.filter(r => r.resultStatus === 'error');

    // Contar inconsistências somando issues encontradas em cada auditoria
    let totalIssues = 0;
    for (const r of results) {
      const d = r.result?.data ?? r.result ?? {};
      const issues = d?.issues_found ?? d?.total_issues ?? d?.count ?? d?.orphans ?? 0;
      totalIssues += Number(issues) || 0;
    }

    return Response.json({
      success: errors.length === 0,
      action: 'runFullCheck',
      duration_ms: totalDuration,
      total_issues: totalIssues,
      results,
      errors: errors.length,
    });
  }

  // Ação individual
  if (!action || !ALLOWED_ACTIONS[action]) {
    return Response.json({ error: `Ação inválida: ${action}` }, { status: 400 });
  }

  const { resultStatus, result, errorMessage, duration_ms } = await runAction(base44, action, user, ip);

  return Response.json({ success: resultStatus === 'success', action, duration_ms, result, error: errorMessage });
});