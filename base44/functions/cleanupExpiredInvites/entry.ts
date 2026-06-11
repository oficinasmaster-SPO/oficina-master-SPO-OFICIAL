/**
 * cleanupExpiredInvites — Expiração automática e reenvio de convites
 *
 * Contrato de resposta (Regra Nº 11):
 * { success, status: "PASS"|"WARNING"|"FAIL", issues_found, duration_ms, details: {...} }
 *
 * Event type de auditoria (Regra Nº 13): MANUAL_INVITE_CLEANUP
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const RESEND_THRESHOLD_DAYS = 3;
const EXPIRY_DAYS = 7;

Deno.serve(async (req) => {
  const startTime = Date.now();
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me().catch(() => null);
  const isInternalCall = req.headers.get('x-internal-call') === 'true';
  if (!isInternalCall && user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const now = new Date();
  const activeInvites = await base44.asServiceRole.entities.EmployeeInvite.filter({
    status: { $in: ['enviado', 'acessado'] }
  }, '-created_date', 500);

  const total_found = (activeInvites || []).length;
  let expired = 0, resent = 0, errors = 0, updated = 0;

  for (const invite of (activeInvites || [])) {
    const createdAt = new Date(invite.created_date);
    const ageDays   = (now - createdAt) / (1000 * 60 * 60 * 24);

    if (invite.expires_at && invite.expires_at < now.toISOString()) {
      try {
        await base44.asServiceRole.entities.EmployeeInvite.update(invite.id, { status: 'expirado' });
        expired++; updated++;
      } catch (e) {
        errors++;
      }
      continue;
    }

    if (
      invite.status === 'enviado' &&
      ageDays >= RESEND_THRESHOLD_DAYS &&
      ageDays < EXPIRY_DAYS &&
      (invite.resent_count || 0) < 1
    ) {
      try {
        await base44.functions.invoke('resendEmployeeInvite', { invite_id: invite.id });
        await base44.asServiceRole.entities.EmployeeInvite.update(invite.id, {
          resent_count: (invite.resent_count || 0) + 1,
          last_resent_at: now.toISOString(),
        });
        resent++; updated++;
      } catch (e) {
        errors++;
      }
    }
  }

  // issues_found = convites expirados + erros
  const issues_found = expired + errors;
  const status = errors > 0 ? 'WARNING' : expired > 0 ? 'WARNING' : 'PASS';
  const duration_ms = Date.now() - startTime;

  // Regra Nº 13
  try {
    await base44.asServiceRole.entities.SystemEventLog.create({
      event_type: 'MANUAL_INVITE_CLEANUP',
      entity_type: 'EmployeeInvite',
      triggered_by: isInternalCall ? 'system' : 'admin',
      status: errors > 0 ? 'warning' : 'success',
      details: {
        function_name: 'cleanupExpiredInvites',
        executed_by: user?.email || 'system',
        duration_ms, issues_found, total_found, updated, expired, resent, errors,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (_) {}

  // Regra Nº 11 — contrato padronizado
  return Response.json({
    success: status !== 'FAIL',
    status,
    issues_found,
    duration_ms,
    details: { total_found, expired, resent, errors, updated },
  });
});