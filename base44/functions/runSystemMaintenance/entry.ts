import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ALLOWED_ACTIONS = {
  auditRBACHealth: true,
  cleanupExpiredInvites: true,
  cleanupAbandonedWorkshops: true,
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { action } = body;

  if (!action || !ALLOWED_ACTIONS[action]) {
    return Response.json({ error: `Ação inválida: ${action}` }, { status: 400 });
  }

  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const startedAt = Date.now();

  // Executar a função via service role
  let result = null;
  let resultStatus = 'success';
  let errorMessage = null;

  try {
    result = await base44.asServiceRole.functions.invoke(action, {});
  } catch (err) {
    resultStatus = 'error';
    errorMessage = err?.message || 'Erro desconhecido';
  }

  const duration_ms = Date.now() - startedAt;

  // Gravar log na timeline (SystemEventLog)
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
  } catch (_logErr) {
    // Não deixar falha no log bloquear o retorno
  }

  if (resultStatus === 'error') {
    return Response.json({
      success: false,
      action,
      duration_ms,
      error: errorMessage,
    }, { status: 500 });
  }

  return Response.json({
    success: true,
    action,
    duration_ms,
    result,
  });
});