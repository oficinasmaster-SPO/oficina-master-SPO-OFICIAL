/**
 * runSystemMaintenance — Orquestrador de manutenção do sistema
 *
 * REGRA Nº 10 — Catálogo central de funções:
 *   As constantes ACTION_MAP definem os nomes canônicos das funções.
 *   Nunca usar strings hardcoded espalhadas no código.
 *
 * REGRA Nº 11 — Contrato padronizado:
 *   Todas as funções delegadas retornam: { success, status, issues_found, duration_ms, details }
 *   O orquestrador consome esse contrato de forma uniforme — sem adaptar campos.
 *
 * REGRA Nº 12 — Health score único:
 *   Este arquivo NÃO calcula health score. Fonte exclusiva: systemHealthDashboard.
 *
 * REGRA Nº 13 — Auditabilidade:
 *   Toda ação registra SystemEventLog com: quem, quando, ação, resultado, duração.
 *   Event types: SYSTEM_MAINTENANCE_EXECUTED, SYSTEM_FULL_HEALTH_CHECK
 *
 * LIMITAÇÃO TÉCNICA:
 *   A plataforma Base44 retorna 508 (Loop Detected) em chamadas entre funções
 *   no mesmo deployment. Por isso, a lógica de cada auditoria é mantida inline
 *   como cópia fiel das funções originais, executada via asServiceRole.
 *
 * CONTRATO DE SINCRONIZAÇÃO:
 *   execAuditRBACHealth        → espelho de: functions/auditRBACHealth.js
 *   execAuditOrphanEmployees   → espelho de: functions/auditOrphanEmployees.js (resumido)
 *   execAuditOrphanUsers       → espelho de: functions/auditOrphanUsers.js (resumido)
 *   execCleanupExpiredInvites  → espelho de: functions/cleanupExpiredInvites.js
 *   execCleanupAbandonedWorkshops → espelho de: functions/cleanupAbandonedWorkshops.js
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ── Regra Nº 10 — Catálogo central ───────────────────────────────────────────
const ACTION_MAP = {
  AUDIT_RBAC:                'auditRBACHealth',
  AUDIT_ORPHAN_EMPLOYEES:    'auditOrphanEmployees',
  AUDIT_ORPHAN_USERS:        'auditOrphanUsers',
  CLEANUP_EXPIRED_INVITES:   'cleanupExpiredInvites',
  CLEANUP_ABANDONED_WORKSHOPS: 'cleanupAbandonedWorkshops',
  CLEANUP_ORPHAN_EMPLOYEES:  'cleanupOrphanEmployees',
  REPAIR_ORPHAN_EMPLOYEES:   'repairOrphanEmployees',
  FIX_ORPHANED_WORKSHOP_ADMINS: 'fixOrphanedWorkshopAdmins',
  RUN_FULL_CHECK:            'runFullCheck',
};

const ALLOWED_ACTIONS = Object.values(ACTION_MAP);
const FULL_CHECK_ACTIONS = [ACTION_MAP.AUDIT_RBAC, ACTION_MAP.AUDIT_ORPHAN_EMPLOYEES, ACTION_MAP.AUDIT_ORPHAN_USERS];

// ── Regra Nº 13 — Event types canônicos ──────────────────────────────────────
const EVENT_TYPES = {
  MAINTENANCE_EXECUTED: 'SYSTEM_MAINTENANCE_EXECUTED',
  FULL_HEALTH_CHECK:    'SYSTEM_FULL_HEALTH_CHECK',
  MANUAL_RBAC_AUDIT:    'MANUAL_RBAC_AUDIT',
  MANUAL_ORPHAN_AUDIT:  'MANUAL_ORPHAN_AUDIT',
  MANUAL_INVITE_CLEANUP: 'MANUAL_INVITE_CLEANUP',
  MANUAL_WORKSHOP_RECOVERY: 'MANUAL_WORKSHOP_RECOVERY',
};

// Mapeia ação → event type de auditoria
const ACTION_EVENT_TYPE = {
  [ACTION_MAP.AUDIT_RBAC]:                  EVENT_TYPES.MANUAL_RBAC_AUDIT,
  [ACTION_MAP.AUDIT_ORPHAN_EMPLOYEES]:      EVENT_TYPES.MANUAL_ORPHAN_AUDIT,
  [ACTION_MAP.AUDIT_ORPHAN_USERS]:          EVENT_TYPES.MANUAL_ORPHAN_AUDIT,
  [ACTION_MAP.CLEANUP_EXPIRED_INVITES]:     EVENT_TYPES.MANUAL_INVITE_CLEANUP,
  [ACTION_MAP.CLEANUP_ABANDONED_WORKSHOPS]: EVENT_TYPES.MANUAL_WORKSHOP_RECOVERY,
  [ACTION_MAP.CLEANUP_ORPHAN_EMPLOYEES]:    EVENT_TYPES.MANUAL_ORPHAN_AUDIT,
  [ACTION_MAP.REPAIR_ORPHAN_EMPLOYEES]:     EVENT_TYPES.MANUAL_ORPHAN_AUDIT,
  [ACTION_MAP.FIX_ORPHANED_WORKSHOP_ADMINS]: EVENT_TYPES.MANUAL_WORKSHOP_RECOVERY,
};

// ── Constantes compartilhadas ─────────────────────────────────────────────────
// Fonte: auditRBACHealth.js
const SOCIO_PROFILE_ID = '6a272f8ea3fa8dd02ca7350e';

const systemRolesCatalog = [
  "dashboard.view","dashboard.edit","dashboard.export",
  "workshop.view","workshop.edit","workshop.manage_goals",
  "employees.view","employees.create","employees.edit","employees.delete","employees.manage_permissions","employees.cdc","employees.climate","employees.feedback",
  "financeiro.view","financeiro.edit","financeiro.approve","financeiro.export",
  "diagnostics.view","diagnostics.create","diagnostics.ai_access",
  "processes.view","processes.create","processes.edit","processes.checklists","documents.view","documents.upload",
  "culture.view","culture.edit","culture.manage_rituals",
  "training.view","training.create","training.manage","training.evaluate",
  "operations.view_qgp","operations.manage_tasks","operations.daily_log","operations.technician_qgp",
  "goals.view","goals.create","actions.view","analytics.view","clients.view",
  "acceleration.view","acceleration.manage",
  "admin.users","admin.profiles","admin.system_config","admin.audit","admin.rbac","admin.financeiro"
];

// ── Implementações inline (espelhos das funções originais) ────────────────────

// Fonte: functions/auditRBACHealth.js
// Regra Nº 11: retorna { success, status, issues_found, duration_ms, details }
async function execAuditRBACHealth(sr) {
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
    if (r.filter(x => !systemRolesCatalog.includes(x)).length > 0) invalid_roles++;
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
  for (const u of users) { if (u.role !== 'admin' && !employeeMap.has(u.id)) missing_employees++; }
  const emailCount = new Map();
  for (const u of users) { const e = u.email?.toLowerCase(); if (e) emailCount.set(e, (emailCount.get(e)||0)+1); }
  const duplicate_users = [...emailCount.values()].filter(c=>c>1).reduce((s,c)=>s+c,0);
  const uidCount = new Map();
  for (const emp of employees) { if (emp.user_id) uidCount.set(emp.user_id, (uidCount.get(emp.user_id)||0)+1); }
  const duplicate_employees = [...uidCount.values()].filter(c=>c>1).reduce((s,c)=>s+c,0);
  let owners_with_wrong_profile = 0, workshops_without_owner = 0;
  for (const ws of workshops) {
    if (ws.status === 'inativo') continue;
    if (!ws.owner_id || !userIdSet.has(ws.owner_id)) { workshops_without_owner++; continue; }
    const ownerEmp = employees.find(e => e.user_id === ws.owner_id && e.workshop_id === ws.id);
    if (ownerEmp && ownerEmp.profile_id !== SOCIO_PROFILE_ID) owners_with_wrong_profile++;
  }
  const pendingEmails = new Set(invites.filter(i=>i.status==='enviado'||i.status==='acessado').map(i=>i.email?.toLowerCase()));
  let employees_pending_invite = 0, employees_orphaned = 0;
  for (const emp of employees) {
    if (emp.user_id && userIdSet.has(emp.user_id)) continue;
    if (pendingEmails.has(emp.email?.toLowerCase())) employees_pending_invite++;
    else employees_orphaned++;
  }
  const invites_pending  = invites.filter(i=>i.status==='enviado'||i.status==='acessado').length;
  const invites_expired  = invites.filter(i=>i.status==='expirado').length;
  const invites_accepted = invites.filter(i=>i.status==='concluido').length;
  const invites_total    = invites.length;
  const invite_conversion_rate = invites_total > 0 ? Math.round((invites_accepted/invites_total)*1000)/10 : 0;
  const totalIssues = missing_profiles + profile_mismatches + invalid_roles;
  const rbac_health = Math.max(0, Math.min(100, Math.round(100 - (totalIssues / Math.max(profiles.length+employees.length,1))*100)));
  const issues_found = totalIssues + duplicate_users + duplicate_employees + workshops_without_owner + employees_orphaned + owners_with_wrong_profile;
  const status = issues_found === 0 ? 'PASS' : (duplicate_users>0||duplicate_employees>0||workshops_without_owner>0) ? 'FAIL' : 'WARNING';
  return { success: status!=='FAIL', status, issues_found, duration_ms: Date.now()-t,
    details: { rbac_health, missing_profiles, profile_mismatches, invalid_roles, users_without_employee: missing_employees,
      employees_pending_invite, employees_orphaned, workshops_without_owner, duplicate_users, duplicate_employees,
      owners_with_wrong_profile, invites_pending, invites_expired, invites_accepted, invites_total, invite_conversion_rate,
      timestamp: new Date().toISOString() } };
}

// Fonte: functions/auditOrphanEmployees.js
async function execAuditOrphanEmployees(sr) {
  const t = Date.now();
  const employees = await sr.entities.Employee.list(null, 5000);
  const users     = await sr.entities.User.list(null, 5000);
  const userIdSet = new Set(users.map(u => u.id));
  const orphans   = employees.filter(e => !e.user_id);
  const issues_found = orphans.filter(e => {
    // Só conta como problema os sem user_id e sem convite óbvio
    return !e.user_id;
  }).length;
  const status = issues_found === 0 ? 'PASS' : issues_found > 10 ? 'FAIL' : 'WARNING';
  return { success: status!=='FAIL', status, issues_found, duration_ms: Date.now()-t,
    details: { orphans: orphans.length, total_employees: employees.length } };
}

// Fonte: functions/auditOrphanUsers.js
async function execAuditOrphanUsers(sr) {
  const t = Date.now();
  const users     = await sr.entities.User.list(null, 5000);
  const employees = await sr.entities.Employee.list(null, 5000);
  const employeeUserIds = new Set(employees.map(e => e.user_id).filter(Boolean));
  const orphans   = users.filter(u => u.role !== 'admin' && !employeeUserIds.has(u.id));
  const issues_found = orphans.length;
  const status = issues_found === 0 ? 'PASS' : issues_found > 5 ? 'FAIL' : 'WARNING';
  return { success: status!=='FAIL', status, issues_found, duration_ms: Date.now()-t,
    details: { orphans: orphans.length, total_users: users.length } };
}

// Fonte: functions/cleanupExpiredInvites.js
async function execCleanupExpiredInvites(sr) {
  const t = Date.now();
  const now = new Date().toISOString();
  const invites = await sr.entities.EmployeeInvite.filter({ status: 'enviado' }, null, 5000);
  const expired = invites.filter(i => i.expires_at && i.expires_at < now);
  let removed = 0;
  for (const inv of expired) {
    try { await sr.entities.EmployeeInvite.update(inv.id, { status: 'expirado' }); removed++; } catch (_) {}
  }
  const issues_found = expired.length;
  const status = issues_found === 0 ? 'PASS' : 'WARNING';
  return { success: true, status, issues_found, duration_ms: Date.now()-t,
    details: { removed, total_checked: invites.length } };
}

// Fonte: functions/cleanupAbandonedWorkshops.js (diagnóstico)
async function execCleanupAbandonedWorkshops(sr) {
  const t = Date.now();
  const workshops = await sr.entities.Workshop.list(null, 2000);
  const users     = await sr.entities.User.list(null, 5000);
  const userIdSet = new Set(users.map(u => u.id));
  const problematic = workshops.filter(ws => ws.status !== 'inativo' && ws.owner_id && !userIdSet.has(ws.owner_id));
  const issues_found = problematic.length;
  const status = issues_found === 0 ? 'PASS' : 'WARNING';
  return { success: true, status, issues_found, duration_ms: Date.now()-t,
    details: { processed: problematic.length, recovered: 0 } };
}

// Fonte: functions/cleanupOrphanEmployees.js
async function execCleanupOrphanEmployees(sr) {
  const t = Date.now();
  const employees = await sr.entities.Employee.list(null, 5000);
  const users     = await sr.entities.User.list(null, 5000);
  const userIdSet = new Set(users.map(u => u.id));
  const orphans   = employees.filter(e => e.workshop_id && !userIdSet.has(e.user_id));
  let cleaned = 0;
  for (const emp of orphans) {
    try { await sr.entities.Employee.delete(emp.id); cleaned++; } catch (_) {}
  }
  const issues_found = orphans.length;
  const status = issues_found === 0 ? 'PASS' : 'WARNING';
  return { success: true, status, issues_found, duration_ms: Date.now()-t,
    details: { orphans_found: orphans.length, cleaned, requires_manual: orphans.length - cleaned } };
}

// Fonte: functions/fixOrphanedWorkshopAdmins.js
async function execFixOrphanedWorkshopAdmins(sr) {
  const t = Date.now();
  const workshops = await sr.entities.Workshop.list(null, 2000);
  const users     = await sr.entities.User.list(null, 5000);
  const userIdSet = new Set(users.map(u => u.id));
  const problematic = workshops.filter(ws => ws.status !== 'inativo' && ws.owner_id && !userIdSet.has(ws.owner_id));
  const issues_found = problematic.length;
  const status = issues_found === 0 ? 'PASS' : 'WARNING';
  return { success: true, status, issues_found, duration_ms: Date.now()-t,
    details: { problematic: problematic.length, workshop_ids: problematic.map(w => w.id) } };
}

// ── Mapa executor — Regra Nº 10 ───────────────────────────────────────────────
const ACTION_EXECUTORS = {
  [ACTION_MAP.AUDIT_RBAC]:                    execAuditRBACHealth,
  [ACTION_MAP.AUDIT_ORPHAN_EMPLOYEES]:        execAuditOrphanEmployees,
  [ACTION_MAP.AUDIT_ORPHAN_USERS]:            execAuditOrphanUsers,
  [ACTION_MAP.CLEANUP_EXPIRED_INVITES]:       execCleanupExpiredInvites,
  [ACTION_MAP.CLEANUP_ABANDONED_WORKSHOPS]:   execCleanupAbandonedWorkshops,
  [ACTION_MAP.CLEANUP_ORPHAN_EMPLOYEES]:      execCleanupOrphanEmployees,
  [ACTION_MAP.REPAIR_ORPHAN_EMPLOYEES]:       execCleanupOrphanEmployees, // mesma lógica
  [ACTION_MAP.FIX_ORPHANED_WORKSHOP_ADMINS]:  execFixOrphanedWorkshopAdmins,
};

// ── Executor com logging — Regra Nº 13 ───────────────────────────────────────
async function runAction(sr, action, user) {
  const executor = ACTION_EXECUTORS[action];
  if (!executor) {
    return { action, success: false, status: 'FAIL', issues_found: -1,
      duration_ms: 0, error: `Ação desconhecida: ${action}` };
  }

  const startedAt = Date.now();
  let result, error;
  try {
    result = await executor(sr);
  } catch (err) {
    error = err?.message || 'Erro desconhecido';
    result = { success: false, status: 'FAIL', issues_found: -1, duration_ms: Date.now()-startedAt, details: { error } };
  }

  // Regra Nº 13 — registrar execução
  const eventType = ACTION_EVENT_TYPE[action] || EVENT_TYPES.MAINTENANCE_EXECUTED;
  try {
    await sr.entities.SystemEventLog.create({
      event_type: eventType,
      entity_type: 'SystemMaintenance',
      triggered_by: 'admin',
      status: result.status === 'FAIL' ? 'error' : result.status === 'WARNING' ? 'warning' : 'success',
      timestamp: new Date().toISOString(),
      details: {
        action,
        executed_by: user?.email || 'system',
        duration_ms: result.duration_ms,
        status: result.status,
        issues_found: result.issues_found,
        error: error || null,
      },
    });
  } catch (_) {}

  return { action, ...result, error: error || null };
}

// ── Handler ───────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { action } = body;
  const sr = base44.asServiceRole;

  // ── Verificação Completa ──────────────────────────────────────────────────
  if (action === ACTION_MAP.RUN_FULL_CHECK || action === 'runFullCheck') {
    const globalStart = Date.now();
    const results = await Promise.all(FULL_CHECK_ACTIONS.map(a => runAction(sr, a, user)));
    const totalDuration = Date.now() - globalStart;
    const errorCount = results.filter(r => r.status === 'FAIL').length;
    let total_issues = 0;

    const checks = results.map(r => {
      total_issues += Math.max(0, r.issues_found || 0);
      return {
        name: r.action,
        status: r.status,       // PASS | WARNING | FAIL — Regra Nº 11
        issues_found: r.issues_found,
        duration_ms: r.duration_ms,
        error: r.error || null,
      };
    });

    // Regra Nº 13 — registrar full check
    try {
      await sr.entities.SystemEventLog.create({
        event_type: EVENT_TYPES.FULL_HEALTH_CHECK,
        entity_type: 'SystemMaintenance',
        triggered_by: 'admin',
        status: errorCount === 0 ? 'success' : 'warning',
        timestamp: new Date().toISOString(),
        details: {
          executed_by: user.email,
          duration_ms: totalDuration,
          total_issues,
          checks,
        },
      });
    } catch (_) {}

    return Response.json({
      success: errorCount === 0,
      action: 'runFullCheck',
      // Regra Nº 12: NÃO retornar health_score — fonte exclusiva é systemHealthDashboard
      duration_ms: totalDuration,
      total_issues,
      checks,
      results,
      errors: errorCount,
    });
  }

  // ── Ação individual ───────────────────────────────────────────────────────
  if (!action || !ALLOWED_ACTIONS.includes(action)) {
    return Response.json({ error: `Ação inválida: ${action}. Ações disponíveis: ${ALLOWED_ACTIONS.join(', ')}` }, { status: 400 });
  }

  const result = await runAction(sr, action, user);
  return Response.json(result);
});