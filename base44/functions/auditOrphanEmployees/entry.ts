import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * R4 — Auditoria de Employees sem user_id
 *
 * Cruza cada Employee sem user_id com EmployeeInvite para classificar:
 *
 * GRUPO A — AGUARDANDO_ACEITE: convite em status 'enviado' ou 'acessado' e não expirado → normal, monitorar
 * GRUPO B — CONVITE_EXPIRADO:  convite existe mas status 'expirado' → órfão real, reenviar ou deletar
 * GRUPO C — SEM_CONVITE:       nenhum convite encontrado (fluxo E / legado) → órfão real, deletar
 * GRUPO D — CONVITE_CONCLUIDO: convite 'concluido' mas Employee ainda sem user_id → inconsistência de sync
 *
 * Também detecta Workshops sem owner válido (owner_id que não existe em User).
 *
 * GET  ?dry_run=true   → auditoria apenas, sem alterações
 * POST { action: 'delete_group_c' }  → deleta todos os órfãos do Grupo C (sem convite)
 * POST { action: 'delete_group_b' }  → deleta todos os do Grupo B (convite expirado)
 * POST { action: 'delete_all_orphans' } → deleta B + C
 * POST { action: 'fix_invalid_workshops' } → inativa workshops sem owner válido
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();

    if (!currentUser || currentUser.role !== 'admin') {
      return Response.json({ error: 'Apenas administradores' }, { status: 403 });
    }

    const url = new URL(req.url);
    const dry_run = url.searchParams.get('dry_run') === 'true' || req.method === 'GET';
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const action = body.action || null;

    // ── 1. Buscar todos os Employees sem user_id ──
    const allEmployees = [];
    let skip = 0;
    const limit = 200;
    let hasMore = true;
    while (hasMore) {
      const batch = await base44.asServiceRole.entities.Employee.list('-created_date', limit, skip);
      if (!batch || batch.length === 0) { hasMore = false; break; }
      allEmployees.push(...batch);
      skip += batch.length;
      if (batch.length < limit) hasMore = false;
    }

    const orphanEmployees = allEmployees.filter(e => !e.user_id);
    console.log(`🔍 Total Employees: ${allEmployees.length}, sem user_id: ${orphanEmployees.length}`);

    // ── 2. Buscar todos os EmployeeInvites para cruzamento ──
    const allInvites = [];
    skip = 0;
    hasMore = true;
    while (hasMore) {
      const batch = await base44.asServiceRole.entities.EmployeeInvite.list('-created_date', limit, skip);
      if (!batch || batch.length === 0) { hasMore = false; break; }
      allInvites.push(...batch);
      skip += batch.length;
      if (batch.length < limit) hasMore = false;
    }

    // Index: employee_id → invites, email+workshop → invites
    const invitesByEmployeeId = new Map();
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
      D_convite_concluido_inconsistente: []
    };

    for (const emp of orphanEmployees) {
      // Buscar invite pelo employee_id ou por email+workshop
      let invites = invitesByEmployeeId.get(emp.id) || [];
      if (invites.length === 0 && emp.email && emp.workshop_id) {
        const key = `${emp.email.toLowerCase()}|${emp.workshop_id}`;
        invites = invitesByEmailWorkshop.get(key) || [];
      }

      const entry = {
        employee_id: emp.id,
        full_name: emp.full_name,
        email: emp.email,
        workshop_id: emp.workshop_id,
        job_role: emp.job_role,
        created_date: emp.created_date,
        invite_count: invites.length,
        invites: invites.map(i => ({
          invite_id: i.id,
          status: i.status,
          expires_at: i.expires_at,
          created_date: i.created_date
        }))
      };

      if (invites.length === 0) {
        groups.C_sem_convite.push(entry);
        continue;
      }

      // Pegar o convite mais recente
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

    // ── 3. Workshops sem owner válido ──
    const allWorkshops = [];
    skip = 0;
    hasMore = true;
    while (hasMore) {
      const batch = await base44.asServiceRole.entities.Workshop.filter({ status: 'ativo' }, '-created_date', limit, skip);
      if (!batch || batch.length === 0) { hasMore = false; break; }
      allWorkshops.push(...batch);
      skip += batch.length;
      if (batch.length < limit) hasMore = false;
    }

    const allUsers = [];
    skip = 0;
    hasMore = true;
    while (hasMore) {
      const batch = await base44.asServiceRole.entities.User.list('-created_date', limit, skip);
      if (!batch || batch.length === 0) { hasMore = false; break; }
      allUsers.push(...batch);
      skip += batch.length;
      if (batch.length < limit) hasMore = false;
    }

    const validUserIds = new Set(allUsers.map(u => u.id));
    const workshopsInvalidOwner = allWorkshops.filter(w => !w.owner_id || !validUserIds.has(w.owner_id)).map(w => ({
      workshop_id: w.id,
      name: w.name,
      owner_id: w.owner_id || null,
      status: w.status,
      created_date: w.created_date
    }));

    // ── 4. Executar ações se não for dry_run ──
    const actionsLog = [];

    if (!dry_run && action) {
      const toDelete = [];

      if (action === 'delete_group_c' || action === 'delete_all_orphans') {
        toDelete.push(...groups.C_sem_convite);
      }
      if (action === 'delete_group_b' || action === 'delete_all_orphans') {
        toDelete.push(...groups.B_convite_expirado);
      }

      for (const emp of toDelete) {
        try {
          await base44.asServiceRole.entities.Employee.delete(emp.employee_id);
          actionsLog.push({ employee_id: emp.employee_id, email: emp.email, action: 'deleted', success: true });
          console.log(`🗑️ Employee deletado: ${emp.employee_id} (${emp.email})`);
        } catch (e) {
          actionsLog.push({ employee_id: emp.employee_id, email: emp.email, action: 'delete_failed', error: e.message });
          console.error(`❌ Erro ao deletar Employee ${emp.employee_id}:`, e.message);
        }
      }

      if (action === 'fix_invalid_workshops') {
        for (const ws of workshopsInvalidOwner) {
          try {
            await base44.asServiceRole.entities.Workshop.update(ws.workshop_id, { status: 'inativo' });
            actionsLog.push({ workshop_id: ws.workshop_id, name: ws.name, action: 'inativado', success: true });
            console.log(`🔧 Workshop inativado: ${ws.workshop_id} (${ws.name})`);
          } catch (e) {
            actionsLog.push({ workshop_id: ws.workshop_id, name: ws.name, action: 'inativar_failed', error: e.message });
          }
        }
      }
    }

    return Response.json({
      mode: dry_run ? 'dry_run' : `execute:${action || 'none'}`,
      summary: {
        total_employees: allEmployees.length,
        total_sem_user_id: orphanEmployees.length,
        A_aguardando_aceite: groups.A_aguardando_aceite.length,
        B_convite_expirado: groups.B_convite_expirado.length,
        C_sem_convite: groups.C_sem_convite.length,
        D_convite_concluido_inconsistente: groups.D_convite_concluido_inconsistente.length,
        workshops_sem_owner_valido: workshopsInvalidOwner.length
      },
      groups,
      workshops_sem_owner_valido: workshopsInvalidOwner,
      actions_log: actionsLog
    });

  } catch (err) {
    console.error('[R4] Erro:', err);
    return Response.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
});