import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ALLOWED_ACTIONS = ['auditRBACHealth', 'cleanupExpiredInvites', 'cleanupAbandonedWorkshops'];
const FULL_CHECK_ACTIONS = ['auditRBACHealth', 'auditOrphanEmployees', 'auditOrphanUsers'];

// ─── Lógica inline das ações (evita chamadas inter-função com problemas de auth) ───

async function execAuditRBACHealth(sr) {
  const SOCIO_PROFILE_ID = '6a272f8ea3fa8dd02ca7350e';
  const [profiles, employees, users, workshops, invites] = await Promise.all([
    sr.entities.UserProfile.list(null, 1000),
    sr.entities.Employee.list(null, 5000),
    sr.entities.User.list(null, 5000),
    sr.entities.Workshop.list(null, 2000),
    sr.entities.EmployeeInvite.list(null, 5000),
  ]);

  const profileMap = new Map(profiles.map(p => [p.id, p]));
  const employeeMap = new Map(employees.map(e => [e.user_id, e]));
  const userIdSet = new Set(users.map(u => u.id));

  const systemRolesCatalog = [
    "dashboard.view","dashboard.edit","dashboard.export",
    "workshop.view","workshop.edit","workshop.manage_goals",
    "employees.view","employees.create","employees.edit","employees.delete",
    "employees.manage_permissions","employees.cdc","employees.climate","employees.feedback",
    "financeiro.view","financeiro.edit","financeiro.approve","financeiro.export",
    "diagnostics.view","diagnostics.create","diagnostics.ai_access",
    "processes.view","processes.create","processes.edit","processes.checklists",
    "documents.view","documents.upload","culture.view","culture.edit","culture.manage_rituals",
    "training.view","training.create","training.manage","training.evaluate",
    "operations.view_qgp","operations.manage_tasks","operations.daily_log","operations.technician_qgp",
    "goals.view","goals.create","actions.view","analytics.view","clients.view",
    "acceleration.view","acceleration.manage",
    "admin.users","admin.profiles","admin.system_config","admin.audit","admin.rbac","admin.financeiro"
  ];

  let missing_profiles = 0, profile_mismatches = 0, invalid_roles = 0, missing_employees = 0;

  for (const profile of profiles) {
    const currentRoles = profile.roles || [];
    if (currentRoles.filter(r => !systemRolesCatalog.includes(r)).length > 0) invalid_roles++;
    if (currentRoles.some(r => r.includes('_') && !r.includes('.'))) invalid_roles++;
    if (currentRoles.length === 0) invalid_roles++;
  }

  for (const emp of employees) {
    if (emp.profile_id && !profileMap.has(emp.profile_id)) missing_profiles++;
    if (emp.profile_id && emp.job_role) {
      const empProfile = profileMap.get(emp.profile_id);
      if (empProfile?.job_roles?.length > 0) {
        let isMismatch = !empProfile.job_roles.includes(emp.job_role);
        const isCustomRole = !['socio','diretor','gerente','supervisor_loja','lider_tecnico','financeiro','rh','tecnico','comercial','consultor_vendas','marketing','administrativo','acelerador','consultor','mentor','outros','socio_interno'].includes(emp.job_role);
        if (isCustomRole && empProfile.name === 'Colaborador Básico') isMismatch = false;
        if (isMismatch) profile_mismatches++;
      }
    }
  }

  for (const u of users) {
    if (u.role !== 'admin' && !employeeMap.has(u.id)) missing_employees++;
  }

  const emailCount = new Map();
  for (const u of users) {
    const email = u.email?.toLowerCase();
    if (email) emailCount.set(email, (emailCount.get(email) || 0) + 1);
  }
  const duplicate_users = [...emailCount.values()].filter(c => c > 1).reduce((s, c) => s + c, 0);

  const userIdCount = new Map();
  for (const emp of employees) {
    if (emp.user_id) userIdCount.set(emp.user_id, (userIdCount.get(emp.user_id) || 0) + 1);
  }
  const duplicate_employees = [...userIdCount.values()].filter(c => c > 1).reduce((s, c) => s + c, 0);

  let owners_with_wrong_profile = 0;
  for (const ws of workshops) {
    if (ws.status === 'inativo' || !ws.owner_id) continue;
    const ownerEmp = employees.find(e => e.user_id === ws.owner_id && e.workshop_id === ws.id);
    if (ownerEmp && ownerEmp.profile_id !== SOCIO_PROFILE_ID) owners_with_wrong_profile++;
  }

  const invites_pending = invites.filter(i => i.status === 'enviado' || i.status === 'acessado').length;
  const invites_expired = invites.filter(i => i.status === 'expirado').length;
  const invites_accepted = invites.filter(i => i.status === 'concluido').length;
  const invites_total = invites.length;
  const invite_conversion_rate = invites_total > 0 ? Math.round((invites_accepted / invites_total) * 1000) / 10 : 0;

  const pendingInviteEmails = new Set(invites.filter(i => i.status === 'enviado' || i.status === 'acessado').map(i => i.email?.toLowerCase()));
  let employees_pending_invite = 0, employees_orphaned = 0;
  for (const emp of employees) {
    if (emp.user_id && userIdSet.has(emp.user_id)) continue;
    if (pendingInviteEmails.has(emp.email?.toLowerCase())) employees_pending_invite++;
    else employees_orphaned++;
  }

  let workshops_without_owner = 0;
  for (const ws of workshops) {
    if (ws.status === 'inativo') continue;
    if (!ws.owner_id || !userIdSet.has(ws.owner_id)) workshops_without_owner++;
  }

  const totalIssues = missing_profiles + profile_mismatches + invalid_roles;
  const maxIssues = profiles.length + employees.length;
  const rbac_health = Math.max(0, Math.min(100, Math.round(100 - ((totalIssues / (maxIssues || 1)) * 100))));

  return {
    rbac_health, missing_profiles, profile_mismatches, invalid_roles,
    users_without_employee: missing_employees, employees_pending_invite, employees_orphaned,
    workshops_without_owner, duplicate_users, duplicate_employees, owners_with_wrong_profile,
    invites_pending, invites_expired, invites_accepted, invites_total, invite_conversion_rate,
    issues_found: totalIssues,
    timestamp: new Date().toISOString(),
  };
}

async function execCleanupExpiredInvites(sr) {
  const now = new Date().toISOString();
  const invites = await sr.entities.EmployeeInvite.filter({ status: 'enviado' }, null, 5000);
  const expired = invites.filter(i => i.expires_at && i.expires_at < now);
  let removed = 0;
  for (const inv of expired) {
    try {
      await sr.entities.EmployeeInvite.update(inv.id, { status: 'expirado' });
      removed++;
    } catch (_) {}
  }
  return { removed, total_checked: invites.length };
}

async function execCleanupAbandonedWorkshops(sr) {
  const workshops = await sr.entities.Workshop.list(null, 2000);
  const users = await sr.entities.User.list(null, 5000);
  const userIdSet = new Set(users.map(u => u.id));
  let recovered = 0, processed = 0;
  for (const ws of workshops) {
    if (ws.status === 'inativo') continue;
    if (!ws.owner_id || !userIdSet.has(ws.owner_id)) {
      processed++;
    }
  }
  return { processed, recovered };
}

async function execAuditOrphanEmployees(sr) {
  const employees = await sr.entities.Employee.list(null, 5000);
  const users = await sr.entities.User.list(null, 5000);
  const userIdSet = new Set(users.map(u => u.id));
  const orphans = employees.filter(e => e.user_id && !userIdSet.has(e.user_id));
  return { orphans: orphans.length, total_employees: employees.length };
}

async function execAuditOrphanUsers(sr) {
  const users = await sr.entities.User.list(null, 5000);
  const employees = await sr.entities.Employee.list(null, 5000);
  const employeeUserIds = new Set(employees.map(e => e.user_id).filter(Boolean));
  const orphans = users.filter(u => u.role !== 'admin' && !employeeUserIds.has(u.id));
  return { orphans: orphans.length, total_users: users.length };
}

const ACTION_EXECUTORS = {
  auditRBACHealth: execAuditRBACHealth,
  cleanupExpiredInvites: execCleanupExpiredInvites,
  cleanupAbandonedWorkshops: execCleanupAbandonedWorkshops,
  auditOrphanEmployees: execAuditOrphanEmployees,
  auditOrphanUsers: execAuditOrphanUsers,
};

// ─── Executor genérico ───

async function runAction(sr, action, user) {
  const startedAt = Date.now();
  let result = null;
  let resultStatus = 'success';
  let errorMessage = null;

  const executor = ACTION_EXECUTORS[action];
  if (!executor) {
    return { action, resultStatus: 'error', result: null, errorMessage: `Ação desconhecida: ${action}`, duration_ms: 0 };
  }

  try {
    result = await executor(sr);
  } catch (err) {
    resultStatus = 'error';
    errorMessage = err?.message || 'Erro desconhecido';
  }

  const duration_ms = Date.now() - startedAt;

  // Logar execução no SystemEventLog
  try {
    await sr.entities.SystemEventLog.create({
      event_type: 'SYSTEM_MAINTENANCE_EXECUTED',
      entity_type: 'SystemMaintenance',
      triggered_by: 'admin',
      status: resultStatus === 'success' ? 'success' : 'error',
      timestamp: new Date().toISOString(),
      details: { action, executed_by: user?.email, duration_ms, result: result || null, error: errorMessage },
    });
  } catch (_) {}

  return { action, resultStatus, result, errorMessage, duration_ms };
}

// ─── Handler ───

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { action } = body;
  const sr = base44.asServiceRole;

  // Verificação Completa
  if (action === 'runFullCheck') {
    const globalStart = Date.now();
    const results = await Promise.all(FULL_CHECK_ACTIONS.map(a => runAction(sr, a, user)));
    const totalDuration = Date.now() - globalStart;
    const errors = results.filter(r => r.resultStatus === 'error');
    let totalIssues = 0;
    for (const r of results) {
      const d = r.result || {};
      totalIssues += Number(d.issues_found ?? d.orphans ?? d.count ?? 0);
    }
    return Response.json({ success: errors.length === 0, action: 'runFullCheck', duration_ms: totalDuration, total_issues: totalIssues, results, errors: errors.length });
  }

  // Ação individual
  if (!action || !ALLOWED_ACTIONS.includes(action)) {
    return Response.json({ error: `Ação inválida: ${action}` }, { status: 400 });
  }

  const { resultStatus, result, errorMessage, duration_ms } = await runAction(sr, action, user);
  return Response.json({ success: resultStatus === 'success', action, duration_ms, result, error: errorMessage });
});