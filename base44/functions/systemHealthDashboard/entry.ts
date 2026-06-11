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

    // duplicate_employees (mesmo user_id) — mantém grupos para listagem
    const userIdCount = new Map();
    for (const emp of employees) {
      if (emp.user_id) userIdCount.set(emp.user_id, (userIdCount.get(emp.user_id) || 0) + 1);
    }
    const duplicate_employees = [...userIdCount.values()].filter(c => c > 1).reduce((sum, c) => sum + c, 0);
    // grupos completos para exibição na UI
    const duplicate_employee_groups = [...userIdCount.entries()]
      .filter(([, c]) => c > 1)
      .map(([userId, count]) => ({
        user_id: userId,
        count,
        records: employees.filter(e => e.user_id === userId).map(e => ({
          id: e.id, full_name: e.full_name, email: e.email,
          workshop_id: e.workshop_id, job_role: e.job_role,
        })),
      }));

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
    // Penalizações FIXAS por tipo (não multiplicam por count)
    // employees_pending_invite NÃO penaliza — estado operacional esperado
    let health_score = 100;
    const score_breakdown = [];

    const applyPenalty = (reason, count, penalty) => {
      health_score -= penalty;
      score_breakdown.push({ reason, count, penalty: -penalty });
    };

    if (duplicate_users > 0)          applyPenalty('duplicate_users',           duplicate_users,          25);
    if (duplicate_employees > 0)      applyPenalty('duplicate_employees',        duplicate_employees,      25);
    if (workshops_without_owner > 0)  applyPenalty('workshops_without_owner',   workshops_without_owner,  20);
    if (owners_with_wrong_profile > 0)applyPenalty('owners_with_wrong_profile', owners_with_wrong_profile,20);
    if (employees_orphaned > 0)       applyPenalty('orphan_employees',          employees_orphaned,       10);
    // orphan_users placeholder (auditOrphanUsers popula)
    // users_without_employee não está no spec de penalizações — removido
    if (invites_expired > 0)          applyPenalty('invites_expired',           invites_expired,           1);

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
    const legacy7d  = logs7d.filter(e  => e.event_type === 'LEGACY_ENDPOINT_CALLED').length;
    const legacy30d = logs30d.filter(e => e.event_type === 'LEGACY_ENDPOINT_CALLED').length;

    // Legacy: última chamada + chamadas recentes
    const legacyCalls = eventLogs
      .filter(e => e.event_type === 'LEGACY_ENDPOINT_CALLED')
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const lastLegacyCall = legacyCalls[0]
      ? { endpoint: legacyCalls[0].details?.function_name, timestamp: legacyCalls[0].timestamp, caller_email: legacyCalls[0].details?.caller_email }
      : null;
    const recentLegacyCalls = legacyCalls.slice(0, 5).map(e => ({
      endpoint: e.details?.function_name,
      timestamp: e.timestamp,
      details: e.details
    }));

    // Penalização de legacy no score (FIXA -10 se qualquer chamada nas 24h)
    if (legacy24h > 0) applyPenalty('legacy_endpoint_calls', legacy24h, 10);
    health_score = Math.max(0, health_score);

    // Provisioning (identidade)
    const users_created_invite  = invites.filter(i => i.status === 'concluido').length;
    const users_created_public  = workshops.filter(ws => ws.status === 'ativo' && ws.planStatus).length; // proxy
    const users_pending_workshop = users.filter(u => u.role !== 'admin' && !u.workshop_id && !u.data?.workshop_id).length;
    const users_without_workshop = users.filter(u => u.role !== 'admin' && !u.workshop_id && !u.data?.workshop_id && !u.consulting_firm_id && !u.data?.consulting_firm_id).length;
    const abandoned_signups = workshops.filter(ws => ws.status === 'inativo' && !ws.owner_id).length;

    // Owners corretos
    const owners_correct = workshops.filter(ws => {
      if (ws.status === 'inativo' || !ws.owner_id) return false;
      const ownerEmp = employees.find(e => e.user_id === ws.owner_id && e.workshop_id === ws.id);
      return ownerEmp && ownerEmp.profile_id === SOCIO_PROFILE_ID;
    }).length;
    const owners_total = workshops.filter(ws => ws.status === 'ativo' && ws.owner_id).length;

    // Penalização de pending_workshop no score (-1 por user, conforme spec)
    if (users_pending_workshop > 0) {
      applyPenalty('users_pending_workshop', users_pending_workshop, users_pending_workshop);
      health_score = Math.max(0, health_score);
    }

    // Totais
    const totals = {
      users:     users.length,
      employees: employees.length,
      workshops: workshops.filter(ws => ws.status !== 'inativo').length,
      owners:    owners_total,
    };

    // Timeline (todos os eventos relevantes)
    const timelineEvents = [
      'WORKSHOP_RECOVERY', 'WORKSHOP_DEACTIVATED', 'OWNER_EMPLOYEE_CREATED',
      'FUNCTION_EXECUTED', 'LEGACY_ENDPOINT_CALLED', 'OWNER_PROFILE_CORRECTED',
      'USER_CREATED', 'INVITE_CREATED', 'INVITE_ACCEPTED', 'INVITE_EXPIRED', 'USER_PENDING_WORKSHOP'
    ];
    const timeline = eventLogs
      .filter(e => timelineEvents.includes(e.event_type))
      .slice(0, 50)
      .map(e => ({
        event_type: e.event_type,
        status: e.status,
        entity_type: e.entity_type,
        entity_id: e.entity_id,
        workshop_id: e.workshop_id,
        details: e.details,
        timestamp: e.timestamp
      }));

    // ─── PERSIST SNAPSHOT ─────────────────────────────────────────────────────
    // Grava um snapshot por execução; usado pelo HealthTrendBlock para o gráfico
    try {
      await base44.asServiceRole.entities.SystemHealthSnapshot.create({
        health_score,
        status,
        users_without_employee,
        workshops_without_owner,
        duplicate_users,
        duplicate_employees,
        employees_orphaned,
        orphan_users: 0,
        invites_expired,
        invites_pending,
        rbac_health,
        timestamp: computed_at,
      });
    } catch (_) {}

    // Buscar últimos 60 snapshots para o gráfico
    let snapshots = [];
    try {
      snapshots = await base44.asServiceRole.entities.SystemHealthSnapshot.list('-timestamp', 60);
    } catch (_) {}

    return Response.json({
      status,
      health_score,
      alerts,
      totals,
      governance: {
        rbac_health,
        users_without_employee,
        employees_pending_invite,
        employees_orphaned,
        orphan_users: 0, // placeholder — auditOrphanUsers pode popular
        workshops_without_owner,
        duplicate_users,
        duplicate_employees,
        duplicate_employee_groups,
        owners_with_wrong_profile,
        invites_pending,
        invites_expired,
        invites_accepted,
        invites_total,
        invite_conversion_rate
      },
      rbac: {
        owners_correct,
        owners_total,
      },
      provisioning: {
        users_created_invite,
        users_created_public,
        users_pending_workshop,
        users_without_workshop,
        users_without_employee,
        abandoned_signups,
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
        calls_30d: legacy30d,
        last_call: lastLegacyCall,
        recent_calls: recentLegacyCalls,
      },
      // Reservado para futuras métricas (Idempotência, Audit Log, Security, Financeiro)
      _reserved: {},
      timeline,
      snapshots,
      score_breakdown,
      computed_at
    });

  } catch (error) {
    console.error('[systemHealthDashboard] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});