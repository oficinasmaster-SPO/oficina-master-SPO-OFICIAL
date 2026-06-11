import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const SOCIO_PROFILE_ID = '6a272f8ea3fa8dd02ca7350e';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (user?.role !== 'admin') {
    return Response.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
  }

  try {
    const computed_at = new Date().toISOString();

    // Buscar tudo em paralelo
    const [profiles, employees, users, workshops, invites, eventLogs] = await Promise.all([
      base44.asServiceRole.entities.UserProfile.list(null, 1000),
      base44.asServiceRole.entities.Employee.list(null, 5000),
      base44.asServiceRole.entities.User.list(null, 5000),
      base44.asServiceRole.entities.Workshop.list(null, 2000),
      base44.asServiceRole.entities.EmployeeInvite.list(null, 5000),
      base44.asServiceRole.entities.SystemEventLog.list('-timestamp', 100)
    ]);

    const userIdSet = new Set(users.map(u => u.id));
    const employeeMap = new Map(employees.map(e => [e.user_id, e]));

    // ─── GOVERNANCE ───────────────────────────────────────────────────────────

    // users_without_employee
    const users_without_employee = users.filter(u => u.role !== 'admin' && !employeeMap.has(u.id)).length;

    // employees_pending_invite / employees_orphaned
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
      if (!ws.owner_id || !userIdSet.has(ws.owner_id)) workshops_without_owner++;
    }

    // duplicate_users (mesmo email)
    const emailCount = new Map();
    for (const u of users) {
      const email = u.email?.toLowerCase();
      if (email) emailCount.set(email, (emailCount.get(email) || 0) + 1);
    }
    const duplicate_users = [...emailCount.values()].filter(c => c > 1).reduce((sum, c) => sum + c, 0);

    // duplicate_employees (mesmo user_id)
    const userIdCount = new Map();
    for (const emp of employees) {
      if (emp.user_id) userIdCount.set(emp.user_id, (userIdCount.get(emp.user_id) || 0) + 1);
    }
    const duplicate_employees = [...userIdCount.values()].filter(c => c > 1).reduce((sum, c) => sum + c, 0);

    // owners_with_wrong_profile
    let owners_with_wrong_profile = 0;
    for (const ws of workshops) {
      if (ws.status === 'inativo' || !ws.owner_id) continue;
      const ownerEmp = employees.find(e => e.user_id === ws.owner_id && e.workshop_id === ws.id);
      if (ownerEmp && ownerEmp.profile_id !== SOCIO_PROFILE_ID) owners_with_wrong_profile++;
    }

    // ─── INVITES ──────────────────────────────────────────────────────────────
    const invites_pending = invites.filter(i => i.status === 'enviado' || i.status === 'acessado').length;
    const invites_expired = invites.filter(i => i.status === 'expirado').length;
    const invites_accepted = invites.filter(i => i.status === 'concluido').length;
    const invites_total = invites.length;
    const invite_conversion_rate = invites_total > 0
      ? Math.round((invites_accepted / invites_total) * 100 * 10) / 10
      : 0;

    // ─── RBAC HEALTH SCORE ────────────────────────────────────────────────────
    let missing_profiles = 0;
    let profile_mismatches = 0;
    const profileMap = new Map(profiles.map(p => [p.id, p]));
    for (const emp of employees) {
      if (emp.profile_id && !profileMap.has(emp.profile_id)) missing_profiles++;
    }
    const totalIssues = missing_profiles + profile_mismatches;
    const maxIssues = Math.max(profiles.length + employees.length, 1);
    const rbac_health = Math.max(0, Math.min(100, Math.round(100 - (totalIssues / maxIssues) * 100)));

    // ─── HEALTH SCORE (0-100) COM PENALIZAÇÕES ────────────────────────────────
    let health_score = 100;
    const score_breakdown = [];

    if (duplicate_users > 0) {
      health_score -= 25;
      score_breakdown.push({ reason: 'duplicate_users', count: duplicate_users, penalty: -25 });
    }
    if (duplicate_employees > 0) {
      health_score -= 25;
      score_breakdown.push({ reason: 'duplicate_employees', count: duplicate_employees, penalty: -25 });
    }
    if (workshops_without_owner > 0) {
      const penalty = workshops_without_owner * 20;
      health_score -= penalty;
      score_breakdown.push({ reason: 'workshops_without_owner', count: workshops_without_owner, penalty: -penalty });
    }
    if (owners_with_wrong_profile > 0) {
      health_score -= 20;
      score_breakdown.push({ reason: 'owners_with_wrong_profile', count: owners_with_wrong_profile, penalty: -20 });
    }
    if (employees_orphaned > 0) {
      const penalty = employees_orphaned * 10;
      health_score -= penalty;
      score_breakdown.push({ reason: 'employees_orphaned', count: employees_orphaned, penalty: -penalty });
    }
    if (invites_expired > 0) {
      const penalty = Math.min(invites_expired, 10);
      health_score -= penalty;
      score_breakdown.push({ reason: 'invites_expired', count: invites_expired, penalty: -penalty });
    }
    health_score = Math.max(0, health_score);

    // ─── STATUS ───────────────────────────────────────────────────────────────
    let status = 'SAFE';
    const alerts = [];

    if (workshops_without_owner > 0 || duplicate_users > 0 || duplicate_employees > 0 || employees_orphaned > 0 || owners_with_wrong_profile > 0) {
      status = 'CRITICAL';
    } else if (invites_expired > 0 || invites_pending > 10 || users_without_employee > 10) {
      status = 'WARNING';
    }

    if (duplicate_users > 0) alerts.push({ severity: 'CRITICAL', field: 'duplicate_users', value: duplicate_users });
    if (duplicate_employees > 0) alerts.push({ severity: 'CRITICAL', field: 'duplicate_employees', value: duplicate_employees });
    if (workshops_without_owner > 0) alerts.push({ severity: 'CRITICAL', field: 'workshops_without_owner', value: workshops_without_owner });
    if (owners_with_wrong_profile > 0) alerts.push({ severity: 'CRITICAL', field: 'owners_with_wrong_profile', value: owners_with_wrong_profile });
    if (employees_orphaned > 0) alerts.push({ severity: 'CRITICAL', field: 'employees_orphaned', value: employees_orphaned });
    if (invites_expired > 0) alerts.push({ severity: 'WARNING', field: 'invites_expired', value: invites_expired });
    if (invites_pending > 10) alerts.push({ severity: 'WARNING', field: 'invites_pending', value: invites_pending });
    if (users_without_employee > 10) alerts.push({ severity: 'WARNING', field: 'users_without_employee', value: users_without_employee });

    // ─── EVENT LOG ANALYTICS ─────────────────────────────────────────────────
    const now = Date.now();
    const ms7d = 7 * 24 * 60 * 60 * 1000;
    const ms30d = 30 * 24 * 60 * 60 * 1000;
    const ms24h = 24 * 60 * 60 * 1000;

    const logs7d = eventLogs.filter(e => new Date(e.timestamp) > new Date(now - ms7d));
    const logs30d = eventLogs.filter(e => new Date(e.timestamp) > new Date(now - ms30d));
    const logs24h = eventLogs.filter(e => new Date(e.timestamp) > new Date(now - ms24h));

    // Recovery stats
    const recoveries7d = logs7d.filter(e => e.event_type === 'WORKSHOP_RECOVERY').length;
    const recoveries30d = logs30d.filter(e => e.event_type === 'WORKSHOP_RECOVERY').length;
    const deactivated7d = logs7d.filter(e => e.event_type === 'WORKSHOP_DEACTIVATED').length;
    const deactivated30d = logs30d.filter(e => e.event_type === 'WORKSHOP_DEACTIVATED').length;

    // Automations: última execução de cada função
    const functionNames = ['auditRBACHealth', 'cleanupExpiredInvites', 'cleanupAbandonedWorkshops'];
    const automations = {};
    for (const fn of functionNames) {
      const fnLogs = eventLogs
        .filter(e => e.event_type === 'FUNCTION_EXECUTED' && e.details?.function_name === fn)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      const lastLog = fnLogs[0];
      const errors7d = logs7d.filter(e =>
        e.event_type === 'FUNCTION_EXECUTED' &&
        e.details?.function_name === fn &&
        e.status === 'warning'
      ).length;

      automations[fn] = {
        last_run: lastLog?.timestamp || null,
        last_status: lastLog?.status || null,
        last_duration_ms: lastLog?.details?.duration_ms || null,
        last_processed: lastLog?.details?.processed_count || null,
        errors_7d: errors7d
      };
    }

    // Observability
    const executed7d = logs7d.filter(e => e.event_type === 'FUNCTION_EXECUTED');
    const errors_7d = executed7d.filter(e => e.status === 'warning' || e.status === 'error').length;
    const durations = executed7d.map(e => e.details?.duration_ms).filter(Boolean);
    const avg_duration_ms_7d = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null;

    // Legacy calls
    const legacy24h = logs24h.filter(e => e.event_type === 'LEGACY_ENDPOINT_CALLED').length;
    const legacy7d = logs7d.filter(e => e.event_type === 'LEGACY_ENDPOINT_CALLED').length;
    const legacy30d = logs30d.filter(e => e.event_type === 'LEGACY_ENDPOINT_CALLED').length;

    // Timeline (eventos de governança)
    const governanceEvents = ['WORKSHOP_RECOVERY', 'WORKSHOP_DEACTIVATED', 'OWNER_EMPLOYEE_CREATED', 'FUNCTION_EXECUTED'];
    const timeline = eventLogs
      .filter(e => governanceEvents.includes(e.event_type))
      .slice(0, 30)
      .map(e => ({
        event_type: e.event_type,
        status: e.status,
        entity_type: e.entity_type,
        entity_id: e.entity_id,
        workshop_id: e.workshop_id,
        details: e.details,
        timestamp: e.timestamp
      }));

    return Response.json({
      status,
      health_score,
      alerts,
      governance: {
        rbac_health,
        users_without_employee,
        employees_pending_invite,
        employees_orphaned,
        workshops_without_owner,
        duplicate_users,
        duplicate_employees,
        owners_with_wrong_profile,
        invites_pending,
        invites_expired,
        invites_accepted,
        invites_total,
        invite_conversion_rate
      },
      recovery: {
        recoveries_7d: recoveries7d,
        recoveries_30d: recoveries30d,
        deactivated_7d: deactivated7d,
        deactivated_30d: deactivated30d
      },
      automations,
      observability: {
        functions_executed_7d: executed7d.length,
        functions_error_7d: errors_7d,
        failure_rate_7d: executed7d.length > 0 ? Math.round((errors_7d / executed7d.length) * 100 * 10) / 10 : 0,
        avg_duration_ms_7d
      },
      legacy: {
        calls_24h: legacy24h,
        calls_7d: legacy7d,
        calls_30d: legacy30d
      },
      timeline,
      score_breakdown,
      computed_at
    });

  } catch (error) {
    console.error('[systemHealthDashboard] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});