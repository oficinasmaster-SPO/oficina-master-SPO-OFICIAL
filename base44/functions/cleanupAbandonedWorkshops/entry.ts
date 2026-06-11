/**
 * cleanupAbandonedWorkshops — Limpeza de Workshops rascunho abandonados
 *
 * Contrato de resposta (Regra Nº 11):
 * { success, status: "PASS"|"WARNING"|"FAIL", issues_found, duration_ms, details: {...} }
 *
 * Event type de auditoria (Regra Nº 13): MANUAL_WORKSHOP_RECOVERY
 *
 * GET  ?dry_run=true → mostra o que seria inativado, sem alterar
 * POST {}            → executa a limpeza
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ABANDONED_THRESHOLD_HOURS = 48;
const SOCIO_PROFILE_ID = '6a272f8ea3fa8dd02ca7350e';

async function logEvent(base44, event_type, payload) {
  const timestamp = new Date().toISOString();
  try {
    await base44.asServiceRole.entities.SystemEventLog.create({
      event_type,
      entity_type: 'Workshop',
      entity_id: payload.workshop_id || null,
      workshop_id: payload.workshop_id || null,
      triggered_by: 'automation',
      status: 'success',
      details: payload,
      timestamp,
    });
  } catch (_) {}
}

Deno.serve(async (req) => {
  const startTime = Date.now();
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const isInternalCall = req.headers.get('x-internal-call') === 'true';
    if (!isInternalCall && (!user || user.role !== 'admin')) {
      return Response.json({ error: 'Apenas administradores' }, { status: 403 });
    }

    const url = new URL(req.url);
    const dry_run = url.searchParams.get('dry_run') === 'true' || req.method === 'GET';
    const cutoff  = new Date(Date.now() - ABANDONED_THRESHOLD_HOURS * 60 * 60 * 1000);

    const rascunhos = await base44.asServiceRole.entities.Workshop.filter({ status: 'rascunho' });
    const abandoned = [];
    const recovered = [];

    for (const ws of rascunhos) {
      const createdAt = new Date(ws.created_date);
      if (createdAt > cutoff) continue;

      let ownerLastAccess = null;
      try {
        const ownerUser = await base44.asServiceRole.entities.User.get(ws.owner_id);
        if (ownerUser?.last_login_at) ownerLastAccess = new Date(ownerUser.last_login_at);
      } catch (_) {}
      if (ownerLastAccess && ownerLastAccess > cutoff) continue;

      const employees = await base44.asServiceRole.entities.Employee.filter({ workshop_id: ws.id, status: 'ativo' });

      if (employees.length > 0) {
        if (ws.name?.trim()) {
          recovered.push({ workshop_id: ws.id, name: ws.name, owner_id: ws.owner_id, action: 'promote_to_ativo', employee_count: employees.length });
          if (!dry_run) {
            await base44.asServiceRole.entities.Workshop.update(ws.id, { status: 'ativo' });
            await logEvent(base44, 'WORKSHOP_RECOVERY', { workshop_id: ws.id, owner_id: ws.owner_id, action: 'promote_to_ativo', reason: 'Rascunho com Employee e nome — promovido para ativo', employee_count: employees.length });
          }
        }
        continue;
      }

      const ownerWorkshops = await base44.asServiceRole.entities.Workshop.filter({ owner_id: ws.owner_id, status: 'ativo' });
      if (ownerWorkshops.length > 0) {
        abandoned.push({ workshop_id: ws.id, name: ws.name || '(sem nome)', owner_id: ws.owner_id, created_date: ws.created_date, age_hours: Math.round((Date.now() - createdAt.getTime()) / 3600000), action: 'inativar_duplicata', reason: 'Owner já tem workshop ativo' });
        if (!dry_run) {
          await base44.asServiceRole.entities.Workshop.update(ws.id, { status: 'inativo' });
          await logEvent(base44, 'WORKSHOP_DEACTIVATED', { workshop_id: ws.id, owner_id: ws.owner_id, action: 'inativar_duplicata', reason: 'Owner já tem workshop ativo — rascunho é duplicata' });
        }
      } else {
        abandoned.push({ workshop_id: ws.id, name: ws.name || '(sem nome)', owner_id: ws.owner_id, created_date: ws.created_date, age_hours: Math.round((Date.now() - createdAt.getTime()) / 3600000), action: 'create_placeholder_employee', reason: 'Signup abandonado — criando Employee para recuperar acesso' });
        if (!dry_run) {
          await base44.asServiceRole.entities.Employee.create({
            workshop_id: ws.id, user_id: ws.owner_id, full_name: 'Proprietário', email: '',
            job_role: 'socio', profile_id: SOCIO_PROFILE_ID, status: 'ativo',
            user_status: 'ativo', tipo_vinculo: 'cliente', is_partner: true,
            hire_date: new Date().toISOString().split('T')[0],
          });
          await logEvent(base44, 'OWNER_EMPLOYEE_CREATED', { workshop_id: ws.id, owner_id: ws.owner_id, action: 'create_placeholder_employee', reason: 'Signup abandonado — Employee placeholder criado para recuperar acesso' });
        }
      }
    }

    const issues_found = abandoned.length + recovered.length;
    const status = issues_found === 0 ? 'PASS' : abandoned.length > 0 ? 'WARNING' : 'PASS';
    const duration_ms = Date.now() - startTime;

    // Regra Nº 13
    if (!dry_run) {
      try {
        await base44.asServiceRole.entities.SystemEventLog.create({
          event_type: 'MANUAL_WORKSHOP_RECOVERY',
          entity_type: 'Workshop',
          triggered_by: isInternalCall ? 'system' : 'admin',
          status: 'success',
          details: {
            function_name: 'cleanupAbandonedWorkshops',
            executed_by: user?.email || 'system',
            duration_ms, issues_found,
            rascunhos_encontrados: rascunhos.length,
            abandoned: abandoned.length, recovered: recovered.length,
          },
          timestamp: new Date().toISOString(),
        });
      } catch (_) {}
    }

    // Regra Nº 11 — contrato padronizado
    return Response.json({
      success: true,
      status,
      issues_found,
      duration_ms,
      details: {
        mode: dry_run ? 'dry_run' : 'execute',
        threshold_hours: ABANDONED_THRESHOLD_HOURS,
        rascunhos_encontrados: rascunhos.length,
        recentes_ignorados: rascunhos.length - abandoned.length - recovered.length,
        recovered,
        abandoned,
        actions_taken: dry_run ? 0 : abandoned.length + recovered.length,
      },
    });

  } catch (err) {
    return Response.json({ success: false, status: 'FAIL', issues_found: -1, duration_ms: Date.now() - startTime, details: { error: err.message } }, { status: 500 });
  }
});