/**
 * Shared Audit Engine — fonte única de verdade para todas as auditorias do sistema
 *
 * Importado por:
 *   - functions/auditRBACHealth.js
 *   - functions/auditOrphanEmployees.js
 *   - functions/auditOrphanUsers.js
 *   - functions/cleanupExpiredInvites.js
 *   - functions/cleanupAbandonedWorkshops.js
 *   - functions/runSystemMaintenance.js
 *
 * Regra Nº 10 — Catálogo central de constantes
 * Regra Nº 11 — Contrato padronizado: { success, status, issues_found, duration_ms, details }
 * Regra Nº 12 — NÃO calcula health_score (exclusivo do systemHealthDashboard)
 * Regra Nº 13 — Event types canônicos para SystemEventLog
 */

// ── Constantes ────────────────────────────────────────────────────────────────

export const SOCIO_PROFILE_ID = '6a272f8ea3fa8dd02ca7350e';

export const SYSTEM_ROLES_CATALOG = [
  "dashboard.view","dashboard.edit","dashboard.export",
  "workshop.view","workshop.edit","workshop.manage_goals",
  "employees.view","employees.create","employees.edit","employees.delete",
  "employees.manage_permissions","employees.cdc","employees.climate","employees.feedback",
  "financeiro.view","financeiro.edit","financeiro.approve","financeiro.export",
  "diagnostics.view","diagnostics.create","diagnostics.ai_access",
  "processes.view","processes.create","processes.edit","processes.checklists",
  "documents.view","documents.upload",
  "culture.view","culture.edit","culture.manage_rituals",
  "training.view","training.create","training.manage","training.evaluate",
  "operations.view_qgp","operations.manage_tasks","operations.daily_log","operations.technician_qgp",
  "goals.view","goals.create","actions.view","analytics.view","clients.view",
  "acceleration.view","acceleration.manage",
  "admin.users","admin.profiles","admin.system_config","admin.audit","admin.rbac","admin.financeiro",
];

// Regra Nº 13 — event types canônicos
export const EVENT_TYPES = {
  MAINTENANCE_EXECUTED:     'SYSTEM_MAINTENANCE_EXECUTED',
  FULL_HEALTH_CHECK:        'SYSTEM_FULL_HEALTH_CHECK',
  MANUAL_RBAC_AUDIT:        'MANUAL_RBAC_AUDIT',
  MANUAL_ORPHAN_AUDIT:      'MANUAL_ORPHAN_AUDIT',
  MANUAL_INVITE_CLEANUP:    'MANUAL_INVITE_CLEANUP',
  MANUAL_WORKSHOP_RECOVERY: 'MANUAL_WORKSHOP_RECOVERY',
};

// Regra Nº 10 — catálogo canônico de nomes de funções
export const ACTION_MAP = {
  AUDIT_RBAC:                   'auditRBACHealth',
  AUDIT_ORPHAN_EMPLOYEES:       'auditOrphanEmployees',
  AUDIT_ORPHAN_USERS:           'auditOrphanUsers',
  CLEANUP_EXPIRED_INVITES:      'cleanupExpiredInvites',
  CLEANUP_ABANDONED_WORKSHOPS:  'cleanupAbandonedWorkshops',
  CLEANUP_ORPHAN_EMPLOYEES:     'cleanupOrphanEmployees',
  REPAIR_ORPHAN_EMPLOYEES:      'repairOrphanEmployees',
  FIX_ORPHANED_WORKSHOP_ADMINS: 'fixOrphanedWorkshopAdmins',
  RUN_FULL_CHECK:               'runFullCheck',
};

export const ACTION_EVENT_TYPE = {
  [ACTION_MAP.AUDIT_RBAC]:                   EVENT_TYPES.MANUAL_RBAC_AUDIT,
  [ACTION_MAP.AUDIT_ORPHAN_EMPLOYEES]:       EVENT_TYPES.MANUAL_ORPHAN_AUDIT,
  [ACTION_MAP.AUDIT_ORPHAN_USERS]:           EVENT_TYPES.MANUAL_ORPHAN_AUDIT,
  [ACTION_MAP.CLEANUP_EXPIRED_INVITES]:      EVENT_TYPES.MANUAL_INVITE_CLEANUP,
  [ACTION_MAP.CLEANUP_ABANDONED_WORKSHOPS]:  EVENT_TYPES.MANUAL_WORKSHOP_RECOVERY,
  [ACTION_MAP.CLEANUP_ORPHAN_EMPLOYEES]:     EVENT_TYPES.MANUAL_ORPHAN_AUDIT,
  [ACTION_MAP.REPAIR_ORPHAN_EMPLOYEES]:      EVENT_TYPES.MANUAL_ORPHAN_AUDIT,
  [ACTION_MAP.FIX_ORPHANED_WORKSHOP_ADMINS]: EVENT_TYPES.MANUAL_WORKSHOP_RECOVERY,
};

export const FULL_CHECK_ACTIONS = [
  ACTION_MAP.AUDIT_RBAC,
  ACTION_MAP.AUDIT_ORPHAN_EMPLOYEES,
  ACTION_MAP.AUDIT_ORPHAN_USERS,
];

// ── Regra Nº 13 — Log helper ──────────────────────────────────────────────────

export async function logEvent(sr, event_type, payload, entity_type = 'SystemMaintenance') {
  try {
    await sr.entities.SystemEventLog.create({
      event_type,
      entity_type,
      entity_id:   payload.entity_id   || null,
      workshop_id: payload.workshop_id || null,
      triggered_by: payload.triggered_by || 'system',
      status: payload.status || 'success',
      details: payload,
      timestamp: new Date().toISOString(),
    });
  } catch (_) {}
}

// ── Implementações canônicas (fonte única de verdade) ─────────────────────────

/**
 * auditRBACHealth — Regra Nº 11: { success, status, issues_found, duration_ms, details }
 */
export async function auditRBACHealth(sr) {
  const t = Date.now();
  const [profiles, employees, users, workshops, invites] = await Promise.all([
    sr.entities.UserProfile.list(null, 1000),
    sr.entities.Employee.list(null, 5000),
    sr.entities.User.list(null, 5000),
    sr.entities.Workshop.list(null, 2000),
    sr.entities.EmployeeInvite.list(null, 5000),
  ]);

  const profileMap  = new Map(profiles.map(p => [p.id, p]));
  const employeeMap = new Map(employees.map(e => [e.user_id, e]));
  const userIdSet   = new Set(users.map(u => u.id));

  let missing_profiles = 0, profile_mismatches = 0, invalid_roles = 0, missing_employees = 0;

  for (const profile of profiles) {
    const r = profile.roles || [];
    if (r.filter(x => !SYSTEM_ROLES_CATALOG.includes(x)).length > 0) invalid_roles++;
    if (r.some(x => x.includes('_') && !x.includes('.'))) invalid_roles++;
    if (r.length === 0) invalid_roles++;
  }

  for (const emp of employees) {
    if (emp.profile_id && !profileMap.has(emp.profile_id)) missing_profiles++;
    if (emp.profile_id && emp.job_role) {
      const p = profileMap.get(emp.profile_id);
      if (p?.job_roles?.length > 0) {
        let mismatch = !p.job_roles.includes(emp.job_role);
        if (mismatch && p.name === 'Colaborador Básico') mismatch = false;
        if (mismatch) profile_mismatches++;
      }
    }
  }

  for (const u of users) {
    if (u.role !== 'admin' && !employeeMap.has(u.id)) missing_employees++;
  }

  const emailCount = new Map();
  for (const u of users) {
    const e = u.email?.toLowerCase();
    if (e) emailCount.set(e, (emailCount.get(e) || 0) + 1);
  }
  const duplicate_users = [...emailCount.values()].filter(c => c > 1).reduce((s, c) => s + c, 0);

  const uidCount = new Map();
  for (const emp of employees) {
    if (emp.user_id) uidCount.set(emp.user_id, (uidCount.get(emp.user_id) || 0) + 1);
  }
  const duplicate_employees = [...uidCount.values()].filter(c => c > 1).reduce((s, c) => s + c, 0);

  let owners_with_wrong_profile = 0, workshops_without_owner = 0;
  for (const ws of workshops) {
    if (ws.status === 'inativo') continue;
    if (!ws.owner_id || !userIdSet.has(ws.owner_id)) { workshops_without_owner++; continue; }
    const ownerEmp = employees.find(e => e.user_id === ws.owner_id && e.workshop_id === ws.id);
    if (ownerEmp && ownerEmp.profile_id !== SOCIO_PROFILE_ID) owners_with_wrong_profile++;
  }

  const pendingEmails = new Set(
    invites.filter(i => i.status === 'enviado' || i.status === 'acessado').map(i => i.email?.toLowerCase())
  );
  let employees_pending_invite = 0, employees_orphaned = 0;
  for (const emp of employees) {
    if (emp.user_id && userIdSet.has(emp.user_id)) continue;
    if (pendingEmails.has(emp.email?.toLowerCase())) employees_pending_invite++;
    else employees_orphaned++;
  }

  const invites_pending  = invites.filter(i => i.status === 'enviado' || i.status === 'acessado').length;
  const invites_expired  = invites.filter(i => i.status === 'expirado').length;
  const invites_accepted = invites.filter(i => i.status === 'concluido').length;
  const invites_total    = invites.length;
  const invite_conversion_rate = invites_total > 0 ? Math.round((invites_accepted / invites_total) * 1000) / 10 : 0;

  const totalIssues = missing_profiles + profile_mismatches + invalid_roles;
  const rbac_health = Math.max(0, Math.min(100,
    Math.round(100 - (totalIssues / Math.max(profiles.length + employees.length, 1)) * 100)
  ));
  const issues_found = totalIssues + duplicate_users + duplicate_employees
    + workshops_without_owner + employees_orphaned + owners_with_wrong_profile;
  const status = issues_found === 0 ? 'PASS'
    : (duplicate_users > 0 || duplicate_employees > 0 || workshops_without_owner > 0) ? 'FAIL'
    : 'WARNING';

  return {
    success: status !== 'FAIL', status, issues_found, duration_ms: Date.now() - t,
    details: {
      rbac_health, missing_profiles, profile_mismatches, invalid_roles,
      users_without_employee: missing_employees, employees_pending_invite, employees_orphaned,
      workshops_without_owner, duplicate_users, duplicate_employees, owners_with_wrong_profile,
      invites_pending, invites_expired, invites_accepted, invites_total, invite_conversion_rate,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * auditOrphanEmployees — sumário rápido para uso do orquestrador
 */
export async function auditOrphanEmployeesSummary(sr) {
  const t = Date.now();
  const [employees, users] = await Promise.all([
    sr.entities.Employee.list(null, 5000),
    sr.entities.User.list(null, 5000),
  ]);
  const orphans      = employees.filter(e => !e.user_id);
  const issues_found = orphans.length;
  const status       = issues_found === 0 ? 'PASS' : issues_found > 10 ? 'FAIL' : 'WARNING';
  return {
    success: status !== 'FAIL', status, issues_found, duration_ms: Date.now() - t,
    details: { orphans: orphans.length, total_employees: employees.length },
  };
}

/**
 * auditOrphanUsers — sumário rápido para uso do orquestrador
 */
export async function auditOrphanUsersSummary(sr) {
  const t = Date.now();
  const [users, employees] = await Promise.all([
    sr.entities.User.list(null, 5000),
    sr.entities.Employee.list(null, 5000),
  ]);
  const employeeUserIds = new Set(employees.map(e => e.user_id).filter(Boolean));
  const orphans      = users.filter(u => u.role !== 'admin' && !employeeUserIds.has(u.id));
  const issues_found = orphans.length;
  const status       = issues_found === 0 ? 'PASS' : issues_found > 5 ? 'FAIL' : 'WARNING';
  return {
    success: status !== 'FAIL', status, issues_found, duration_ms: Date.now() - t,
    details: { orphans: orphans.length, total_users: users.length },
  };
}

/**
 * cleanupExpiredInvites — expirar convites vencidos
 */
export async function cleanupExpiredInvites(sr) {
  const t   = Date.now();
  const now = new Date().toISOString();
  const invites = await sr.entities.EmployeeInvite.filter({ status: 'enviado' }, null, 5000);
  const expired = invites.filter(i => i.expires_at && i.expires_at < now);
  let removed = 0;
  for (const inv of expired) {
    try { await sr.entities.EmployeeInvite.update(inv.id, { status: 'expirado' }); removed++; } catch (_) {}
  }
  const issues_found = expired.length;
  const status       = issues_found === 0 ? 'PASS' : 'WARNING';
  return {
    success: true, status, issues_found, duration_ms: Date.now() - t,
    details: { removed, total_checked: invites.length },
  };
}

/**
 * cleanupAbandonedWorkshops — diagnóstico de workshops sem owner válido
 */
export async function cleanupAbandonedWorkshops(sr) {
  const t = Date.now();
  const [workshops, users] = await Promise.all([
    sr.entities.Workshop.list(null, 2000),
    sr.entities.User.list(null, 5000),
  ]);
  const userIdSet    = new Set(users.map(u => u.id));
  const problematic  = workshops.filter(ws => ws.status !== 'inativo' && ws.owner_id && !userIdSet.has(ws.owner_id));
  const issues_found = problematic.length;
  const status       = issues_found === 0 ? 'PASS' : 'WARNING';
  return {
    success: true, status, issues_found, duration_ms: Date.now() - t,
    details: { processed: problematic.length, recovered: 0 },
  };
}

/**
 * cleanupOrphanEmployees — deletar employees sem user_id vinculado
 */
export async function cleanupOrphanEmployees(sr) {
  const t = Date.now();
  const [employees, users] = await Promise.all([
    sr.entities.Employee.list(null, 5000),
    sr.entities.User.list(null, 5000),
  ]);
  const userIdSet = new Set(users.map(u => u.id));
  const orphans   = employees.filter(e => e.workshop_id && !userIdSet.has(e.user_id));
  let cleaned = 0;
  for (const emp of orphans) {
    try { await sr.entities.Employee.delete(emp.id); cleaned++; } catch (_) {}
  }
  const issues_found = orphans.length;
  const status       = issues_found === 0 ? 'PASS' : 'WARNING';
  return {
    success: true, status, issues_found, duration_ms: Date.now() - t,
    details: { orphans_found: orphans.length, cleaned, requires_manual: orphans.length - cleaned },
  };
}

/**
 * fixOrphanedWorkshopAdmins — diagnóstico de workshops sem owner válido em User
 */
export async function fixOrphanedWorkshopAdmins(sr) {
  const t = Date.now();
  const [workshops, users] = await Promise.all([
    sr.entities.Workshop.list(null, 2000),
    sr.entities.User.list(null, 5000),
  ]);
  const userIdSet    = new Set(users.map(u => u.id));
  const problematic  = workshops.filter(ws => ws.status !== 'inativo' && ws.owner_id && !userIdSet.has(ws.owner_id));
  const issues_found = problematic.length;
  const status       = issues_found === 0 ? 'PASS' : 'WARNING';
  return {
    success: true, status, issues_found, duration_ms: Date.now() - t,
    details: { problematic: problematic.length, workshop_ids: problematic.map(w => w.id) },
  };
}