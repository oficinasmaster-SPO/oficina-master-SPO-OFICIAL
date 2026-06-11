import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (user?.role !== 'admin') {
    return Response.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
  }

  try {
    const [profiles, employees, users, workshops] = await Promise.all([
      base44.asServiceRole.entities.UserProfile.list(null, 1000),
      base44.asServiceRole.entities.Employee.list(null, 5000),
      base44.asServiceRole.entities.User.list(null, 5000),
      base44.asServiceRole.entities.Workshop.list(null, 2000)
    ]);

    const profileMap = new Map(profiles.map(p => [p.id, p]));
    const employeeMap = new Map(employees.map(e => [e.user_id, e]));

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

    // users_without_employee: usuários não-admin sem Employee vinculado
    const userIdSet = new Set(users.map(u => u.id));
    for (const u of users) {
      if (u.role !== 'admin' && !employeeMap.has(u.id)) {
        missing_employees++;
      }
    }

    // employees_without_user: Employee com user_id ausente ou apontando para User inexistente
    // (exclui convites pendentes: user_status === 'pending')
    let employees_without_user = 0;
    for (const emp of employees) {
      if (emp.user_status === 'pending') continue; // convite ainda não aceito — legítimo
      if (!emp.user_id || !userIdSet.has(emp.user_id)) {
        employees_without_user++;
      }
    }

    // workshops_without_owner: Workshop sem owner_id ou com owner_id inexistente
    let workshops_without_owner = 0;
    for (const ws of workshops) {
      if (ws.status === 'inativo') continue; // workshops inativos são esperados sem owner ativo
      if (!ws.owner_id || !userIdSet.has(ws.owner_id)) {
        workshops_without_owner++;
      }
    }

    // Thresholds de alerta
    const THRESHOLD_USERS_WITHOUT_EMPLOYEE = 10;
    const THRESHOLD_EMPLOYEES_WITHOUT_USER = 5;
    const alerts = [];
    if (missing_employees > THRESHOLD_USERS_WITHOUT_EMPLOYEE) {
      alerts.push(`users_without_employee=${missing_employees} excede threshold de ${THRESHOLD_USERS_WITHOUT_EMPLOYEE}`);
    }
    if (employees_without_user > THRESHOLD_EMPLOYEES_WITHOUT_USER) {
      alerts.push(`employees_without_user=${employees_without_user} excede threshold de ${THRESHOLD_EMPLOYEES_WITHOUT_USER}`);
    }
    if (workshops_without_owner > 0) {
      alerts.push(`workshops_without_owner=${workshops_without_owner} (threshold=0)`);
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

    return Response.json({
      rbac_health: health,
      missing_profiles,
      profile_mismatches,
      invalid_roles,
      // R9 — Métricas de consistência
      users_without_employee: missing_employees,
      employees_without_user,
      workshops_without_owner,
      alerts,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});