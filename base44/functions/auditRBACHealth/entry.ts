import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const SOCIO_PROFILE_ID = '6a272f8ea3fa8dd02ca7350e'; // Sócio - Acesso Total

const systemRolesCatalog = [
  "dashboard.view", "dashboard.edit", "dashboard.export",
  "workshop.view", "workshop.edit", "workshop.manage_goals",
  "employees.view", "employees.create", "employees.edit", "employees.delete", "employees.manage_permissions", "employees.cdc", "employees.climate", "employees.feedback",
  "financeiro.view", "financeiro.edit", "financeiro.approve", "financeiro.export",
  "diagnostics.view", "diagnostics.create", "diagnostics.ai_access",
  "processes.view", "processes.create", "processes.edit", "processes.checklists", "documents.view", "documents.upload",
  "culture.view", "culture.edit", "culture.manage_rituals",
  "training.view", "training.create", "training.manage", "training.evaluate",
  "operations.view_qgp", "operations.manage_tasks", "operations.daily_log", "operations.technician_qgp",
  "goals.view", "goals.create", "actions.view",
  "analytics.view",
  "clients.view",
  "acceleration.view", "acceleration.manage",
  "admin.users", "admin.profiles", "admin.system_config", "admin.audit", "admin.rbac", "admin.financeiro"
];

Deno.serve(async (req) => {
  const startTime = Date.now();
  const base44 = createClientFromRequest(req);
  // Aceita chamadas diretas de admin OU chamadas internas via service role (sem user)
  const user = await base44.auth.me().catch(() => null);
  const isServiceRoleCall = !user && req.headers.get('x-service-role') === 'true';

  if (!isServiceRoleCall && user?.role !== 'admin') {
    return Response.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
  }

  try {
    const [profiles, employees, users, workshops, invites] = await Promise.all([
      base44.asServiceRole.entities.UserProfile.list(null, 1000),
      base44.asServiceRole.entities.Employee.list(null, 5000),
      base44.asServiceRole.entities.User.list(null, 5000),
      base44.asServiceRole.entities.Workshop.list(null, 2000),
      base44.asServiceRole.entities.EmployeeInvite.list(null, 5000)
    ]);

    const profileMap = new Map(profiles.map(p => [p.id, p]));
    const employeeMap = new Map(employees.map(e => [e.user_id, e]));
    const userIdSet = new Set(users.map(u => u.id));

    let missing_profiles = 0;
    let profile_mismatches = 0;
    let invalid_roles = 0;
    let missing_employees = 0;

    for (const profile of profiles) {
      const currentRoles = profile.roles || [];
      if (currentRoles.filter(r => !systemRolesCatalog.includes(r)).length > 0) invalid_roles++;
      if (currentRoles.some(r => r.includes('_') && !r.includes('.'))) invalid_roles++;
      if (currentRoles.length === 0) invalid_roles++;
    }

    for (const emp of employees) {
      if (emp.profile_id && !profileMap.has(emp.profile_id)) {
        missing_profiles++;
      }
      if (emp.profile_id && emp.job_role) {
        const empProfile = profileMap.get(emp.profile_id);
        if (empProfile && empProfile.job_roles && empProfile.job_roles.length > 0) {
          let isMismatch = !empProfile.job_roles.includes(emp.job_role);
          const isCustomRole = !['socio', 'diretor', 'gerente', 'supervisor_loja', 'lider_tecnico', 'financeiro', 'rh', 'tecnico', 'comercial', 'consultor_vendas', 'marketing', 'administrativo', 'acelerador', 'consultor', 'mentor', 'outros', 'socio_interno'].includes(emp.job_role);
          if (isCustomRole && empProfile.name === 'Colaborador Básico') isMismatch = false;
          if (isMismatch) profile_mismatches++;
        }
      }
    }

    // R9 — Métricas de consistência User↔Employee↔Workshop
    for (const u of users) {
      if (u.role !== 'admin' && !employeeMap.has(u.id)) {
        missing_employees++;
      }
    }

    // Duplicate users (mesmo email)
    const emailCount = new Map();
    for (const u of users) {
      const email = u.email?.toLowerCase();
      if (email) emailCount.set(email, (emailCount.get(email) || 0) + 1);
    }
    const duplicate_users = [...emailCount.values()].filter(c => c > 1).reduce((sum, c) => sum + c, 0);

    // Duplicate employees (mesmo user_id)
    const userIdCount = new Map();
    for (const emp of employees) {
      if (emp.user_id) userIdCount.set(emp.user_id, (userIdCount.get(emp.user_id) || 0) + 1);
    }
    const duplicate_employees = [...userIdCount.values()].filter(c => c > 1).reduce((sum, c) => sum + c, 0);

    // Owners externos sem profile_id correto (Sócio)
    let owners_with_wrong_profile = 0;
    for (const ws of workshops) {
      if (ws.status === 'inativo') continue;
      if (!ws.owner_id) continue;
      const ownerEmp = employees.find(e => e.user_id === ws.owner_id && e.workshop_id === ws.id);
      if (ownerEmp && ownerEmp.profile_id !== SOCIO_PROFILE_ID) {
        owners_with_wrong_profile++;
      }
    }

    // Métricas de invites
    const invites_pending = invites.filter(i => i.status === 'enviado' || i.status === 'acessado').length;
    const invites_expired = invites.filter(i => i.status === 'expirado').length;
    const invites_accepted = invites.filter(i => i.status === 'concluido').length;
    const invites_total = invites.length;
    const invite_conversion_rate = invites_total > 0
      ? Math.round((invites_accepted / invites_total) * 100 * 10) / 10
      : 0;

    // employees_pending_invite e employees_orphaned
    const pendingInviteEmails = new Set(
      invites.filter(i => i.status === 'enviado' || i.status === 'acessado').map(i => i.email?.toLowerCase())
    );
    let employees_pending_invite = 0;
    let employees_orphaned = 0;
    for (const emp of employees) {
      if (emp.user_id && userIdSet.has(emp.user_id)) continue;
      if (pendingInviteEmails.has(emp.email?.toLowerCase())) {
        employees_pending_invite++;
      } else {
        employees_orphaned++;
      }
    }

    // workshops_without_owner
    let workshops_without_owner = 0;
    for (const ws of workshops) {
      if (ws.status === 'inativo') continue;
      if (!ws.owner_id || !userIdSet.has(ws.owner_id)) {
        workshops_without_owner++;
      }
    }

    // Thresholds de alerta
    const THRESHOLD_USERS_WITHOUT_EMPLOYEE = 10;
    const alerts = [];
    if (missing_employees > THRESHOLD_USERS_WITHOUT_EMPLOYEE) {
      alerts.push(`users_without_employee=${missing_employees} excede threshold de ${THRESHOLD_USERS_WITHOUT_EMPLOYEE}`);
    }
    if (employees_orphaned > 0) {
      alerts.push(`employees_orphaned=${employees_orphaned} (threshold=0) — Employee sem user_id e sem convite ativo`);
    }
    if (workshops_without_owner > 0) {
      alerts.push(`workshops_without_owner=${workshops_without_owner} (threshold=0)`);
    }
    if (duplicate_users > 0) {
      alerts.push(`duplicate_users=${duplicate_users} — usuários com email duplicado`);
    }
    if (duplicate_employees > 0) {
      alerts.push(`duplicate_employees=${duplicate_employees} — employees com mesmo user_id`);
    }
    if (owners_with_wrong_profile > 0) {
      alerts.push(`owners_with_wrong_profile=${owners_with_wrong_profile} — owners externos sem perfil Sócio`);
    }

    if (alerts.length > 0) {
      console.log(JSON.stringify({
        level: 'ALERT',
        event: 'consistency_threshold_exceeded',
        alerts,
        timestamp: new Date().toISOString()
      }));
    }

    const totalIssues = missing_profiles + profile_mismatches + invalid_roles;
    const maxIssues = profiles.length + employees.length;
    let health = 100 - ((totalIssues / maxIssues) * 100);
    health = Math.max(0, Math.min(100, Math.round(health)));

    // Tracking de execução
    const duration_ms = Date.now() - startTime;
    try {
      await base44.asServiceRole.entities.SystemEventLog.create({
        event_type: 'FUNCTION_EXECUTED',
        entity_type: 'RBACHealth',
        triggered_by: 'admin',
        status: alerts.length > 0 ? 'warning' : 'success',
        details: {
          function_name: 'auditRBACHealth',
          processed_count: users.length + employees.length,
          duration_ms,
          rbac_health: health,
          alerts_count: alerts.length,
          workshops_without_owner,
          employees_orphaned,
          duplicate_users,
          duplicate_employees
        },
        timestamp: new Date().toISOString()
      });
    } catch (_) {}

    return Response.json({
      rbac_health: health,
      missing_profiles,
      profile_mismatches,
      invalid_roles,
      // R9/R15 — Métricas de consistência
      users_without_employee: missing_employees,
      employees_pending_invite,
      employees_orphaned,
      workshops_without_owner,
      // Novos campos
      duplicate_users,
      duplicate_employees,
      owners_with_wrong_profile,
      // Métricas de invites
      invites_pending,
      invites_expired,
      invites_accepted,
      invites_total,
      invite_conversion_rate,
      alerts,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});