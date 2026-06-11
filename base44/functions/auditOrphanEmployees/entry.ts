/**
 * auditOrphanEmployees — Auditoria de Employees sem user_id
 *
 * Contrato de resposta (Regra Nº 11):
 * { success, status: "PASS"|"WARNING"|"FAIL", issues_found, duration_ms, details: {...} }
 *
 * Event type de auditoria (Regra Nº 13): MANUAL_ORPHAN_AUDIT
 *
 * Cruza cada Employee sem user_id com EmployeeInvite para classificar:
 * GRUPO A — AGUARDANDO_ACEITE: convite enviado/acessado → normal, monitorar
 * GRUPO B — CONVITE_EXPIRADO:  convite expirado → órfão real
 * GRUPO C — SEM_CONVITE:       sem convite → órfão real, candidato a delete
 * GRUPO D — CONVITE_CONCLUIDO: inconsistência de sync
 *
 * GET  ?dry_run=true             → auditoria apenas
 * POST { action: 'delete_group_c' }  → deleta Grupo C
 * POST { action: 'delete_group_b' }  → deleta Grupo B
 * POST { action: 'delete_all_orphans' } → deleta B + C
 * POST { action: 'fix_invalid_workshops' } → inativa workshops sem owner válido
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  const startTime = Date.now();
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me().catch(() => null);
    const isInternalCall = req.headers.get('x-internal-call') === 'true';
    if (!isInternalCall && (!currentUser || currentUser.role !== 'admin')) {
      return Response.json({ error: 'Apenas administradores' }, { status: 403 });
    }

    const url = new URL(req.url);
    const dry_run = url.searchParams.get('dry_run') === 'true' || req.method === 'GET';
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const action = body.action || null;

    const limit = 200;

    // ── Buscar todos os Employees ──
    const allEmployees = [];
    let skip = 0, hasMore = true;
    while (hasMore) {
      const batch = await base44.asServiceRole.entities.Employee.list('-created_date', limit, skip);
      if (!batch?.length) { hasMore = false; break; }
      allEmployees.push(...batch);
      skip += batch.length;
      if (batch.length < limit) hasMore = false;
    }

    const orphanEmployees = allEmployees.filter(e => !e.user_id);

    // ── Buscar todos os EmployeeInvites ──
    const allInvites = [];
    skip = 0; hasMore = true;
    while (hasMore) {
      const batch = await base44.asServiceRole.entities.EmployeeInvite.list('-created_date', limit, skip);
      if (!batch?.length) { hasMore = false; break; }
      allInvites.push(...batch);
      skip += batch.length;
      if (batch.length < limit) hasMore = false;
    }

    const invitesByEmployeeId   = new Map();
    const invitesByEmailWorkshop = new Map();
    for (const inv of allInvites) {
      if (inv.employee_id) {
        const arr = invitesByEmployeeId.get(inv.employee_id) || [];
        arr.push(inv);
        invitesByEmployeeId.set(inv.employee_id, arr);
      }
      if (inv.email && inv.workshop_id) {
        const key = `${inv.email.toLowerCase()}|${inv.workshop_id}`;
        const arr = invitesByEmailWorkshop.get(key) || [];
        arr.push(inv);
        invitesByEmailWorkshop.set(key, arr);
      }
    }

    const now = new Date();
    const groups = {
      A_aguardando_aceite: [],
      B_convite_expirado: [],
      C_sem_convite: [],
      D_convite_concluido_inconsistente: [],
    };

    for (const emp of orphanEmployees) {
      let invites = invitesByEmployeeId.get(emp.id) || [];
      if (!invites.length && emp.email && emp.workshop_id) {
        invites = invitesByEmailWorkshop.get(`${emp.email.toLowerCase()}|${emp.workshop_id}`) || [];
      }
      const entry = {
        employee_id: emp.id, full_name: emp.full_name, email: emp.email,
        workshop_id: emp.workshop_id, job_role: emp.job_role,
        created_date: emp.created_date, invite_count: invites.length,
        invites: invites.map(i => ({ invite_id: i.id, status: i.status, expires_at: i.expires_at, created_date: i.created_date })),
      };

      if (!invites.length) { groups.C_sem_convite.push(entry); continue; }

      const latest = invites.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
      if (latest.status === 'concluido') {
        groups.D_convite_concluido_inconsistente.push({ ...entry, latest_invite_status: latest.status });
      } else if (latest.status === 'expirado' || (latest.expires_at && new Date(latest.expires_at) < now && latest.status !== 'concluido')) {
        groups.B_convite_expirado.push({ ...entry, latest_invite_status: latest.status, expires_at: latest.expires_at });
      } else if (latest.status === 'enviado' || latest.status === 'acessado') {
        groups.A_aguardando_aceite.push({ ...entry, latest_invite_status: latest.status, expires_at: latest.expires_at });
      } else {
        groups.C_sem_convite.push({ ...entry, latest_invite_status: latest.status });
      }
    }

    // ── Workshops sem owner válido ──
    const allWorkshops = [];
    skip = 0; hasMore = true;
    while (hasMore) {
      const batch = await base44.asServiceRole.entities.Workshop.filter({ status: 'ativo' }, '-created_date', limit, skip);
      if (!batch?.length) { hasMore = false; break; }
      allWorkshops.push(...batch);
      skip += batch.length;
      if (batch.length < limit) hasMore = false;
    }

    const allUsers = [];
    skip = 0; hasMore = true;
    while (hasMore) {
      const batch = await base44.asServiceRole.entities.User.list('-created_date', limit, skip);
      if (!batch?.length) { hasMore = false; break; }
      allUsers.push(...batch);
      skip += batch.length;
      if (batch.length < limit) hasMore = false;
    }

    const validUserIds = new Set(allUsers.map(u => u.id));
    const workshopsInvalidOwner = allWorkshops
      .filter(w => !w.owner_id || !validUserIds.has(w.owner_id))
      .map(w => ({ workshop_id: w.id, name: w.name, owner_id: w.owner_id || null, status: w.status, created_date: w.created_date }));

    // ── Ações ──
    const actionsLog = [];
    if (!dry_run && action) {
      const toDelete = [];
      if (action === 'delete_group_c' || action === 'delete_all_orphans') toDelete.push(...groups.C_sem_convite);
      if (action === 'delete_group_b' || action === 'delete_all_orphans') toDelete.push(...groups.B_convite_expirado);
      for (const emp of toDelete) {
        try {
          await base44.asServiceRole.entities.Employee.delete(emp.employee_id);
          actionsLog.push({ employee_id: emp.employee_id, email: emp.email, action: 'deleted', success: true });
        } catch (e) {
          actionsLog.push({ employee_id: emp.employee_id, email: emp.email, action: 'delete_failed', error: e.message });
        }
      }
      if (action === 'fix_invalid_workshops') {
        for (const ws of workshopsInvalidOwner) {
          try {
            await base44.asServiceRole.entities.Workshop.update(ws.workshop_id, { status: 'inativo' });
            actionsLog.push({ workshop_id: ws.workshop_id, name: ws.name, action: 'inativado', success: true });
          } catch (e) {
            actionsLog.push({ workshop_id: ws.workshop_id, name: ws.name, action: 'inativar_failed', error: e.message });
          }
        }
      }
    }

    // issues_found = órfãos reais (B + C + D) + workshops sem owner
    const issues_found = groups.B_convite_expirado.length + groups.C_sem_convite.length
      + groups.D_convite_concluido_inconsistente.length + workshopsInvalidOwner.length;
    const status = issues_found === 0 ? 'PASS' : (groups.C_sem_convite.length > 0 || workshopsInvalidOwner.length > 0) ? 'FAIL' : 'WARNING';
    const duration_ms = Date.now() - startTime;

    // Regra Nº 13
    try {
      await base44.asServiceRole.entities.SystemEventLog.create({
        event_type: 'MANUAL_ORPHAN_AUDIT',
        entity_type: 'Employee',
        triggered_by: isInternalCall ? 'system' : 'admin',
        status: status === 'FAIL' ? 'error' : status === 'WARNING' ? 'warning' : 'success',
        details: {
          function_name: 'auditOrphanEmployees',
          executed_by: currentUser?.email || 'system',
          duration_ms, issues_found,
          orphans: orphanEmployees.length, dry_run, action: action || 'audit',
          A_aguardando_aceite: groups.A_aguardando_aceite.length,
          B_convite_expirado: groups.B_convite_expirado.length,
          C_sem_convite: groups.C_sem_convite.length,
          D_inconsistente: groups.D_convite_concluido_inconsistente.length,
          workshops_sem_owner: workshopsInvalidOwner.length,
          actions_taken: actionsLog.length,
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
      details: {
        mode: dry_run ? 'dry_run' : `execute:${action || 'none'}`,
        total_employees: allEmployees.length,
        total_sem_user_id: orphanEmployees.length,
        A_aguardando_aceite: groups.A_aguardando_aceite.length,
        B_convite_expirado: groups.B_convite_expirado.length,
        C_sem_convite: groups.C_sem_convite.length,
        D_convite_concluido_inconsistente: groups.D_convite_concluido_inconsistente.length,
        workshops_sem_owner_valido: workshopsInvalidOwner.length,
        groups,
        workshops_sem_owner_valido_list: workshopsInvalidOwner,
        actions_log: actionsLog,
      },
    });

  } catch (err) {
    return Response.json({ success: false, status: 'FAIL', issues_found: -1, duration_ms: Date.now() - startTime, details: { error: err.message } }, { status: 500 });
  }
});