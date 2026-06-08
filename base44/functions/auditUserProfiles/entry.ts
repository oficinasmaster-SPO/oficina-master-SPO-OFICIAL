import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Catálogo oficial de permissões para validação
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
  "acceleration.view",
  "admin.users", "admin.profiles", "admin.system_config", "admin.audit", "admin.rbac", "admin.financeiro",
  "acceleration.manage"
];

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (user?.role !== 'admin') {
    return Response.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
  }

  try {
    // Buscar todos os perfis e colaboradores
    const [profiles, employees] = await Promise.all([
      base44.asServiceRole.entities.UserProfile.list(null, 1000),
      base44.asServiceRole.entities.Employee.list(null, 5000)
    ]);

    const profileMap = new Map(profiles.map(p => [p.id, p]));

    const report = {
      total_profiles: profiles.length,
      total_employees: employees.length,
      issues: {
        profiles_with_invalid_roles: [],
        profiles_with_legacy_roles: [],
        profiles_without_roles: [],
        profiles_with_job_role_mismatch: [],
        employees_with_missing_profile: [],
        employees_with_job_role_mismatch: []
      },
      profiles_data: []
    };

    // 1 a 5: Validações de Perfil
    for (const profile of profiles) {
      const currentRoles = profile.roles || [];
      const currentJobRoles = profile.job_roles || [];

      // Validar 2 e 4: Roles inválidas (não existem no catálogo)
      const invalidRoles = currentRoles.filter(r => !systemRolesCatalog.includes(r));
      if (invalidRoles.length > 0) {
        report.issues.profiles_with_invalid_roles.push({
          profile_id: profile.id,
          profile_name: profile.name,
          invalid_roles: invalidRoles
        });
      }

      // Validar 3: Roles legadas (contendo underscore)
      const legacyRoles = currentRoles.filter(r => r.includes('_') && !r.includes('.'));
      if (legacyRoles.length > 0) {
        report.issues.profiles_with_legacy_roles.push({
          profile_id: profile.id,
          profile_name: profile.name,
          legacy_roles: legacyRoles
        });
      }

      // Validar 5: Perfis sem roles
      if (currentRoles.length === 0) {
        report.issues.profiles_without_roles.push({
          profile_id: profile.id,
          profile_name: profile.name
        });
      }

      // Adicionar dados do perfil ao relatório geral
      report.profiles_data.push({
        id: profile.id,
        name: profile.name,
        type: profile.type,
        permission_type: profile.permission_type,
        job_roles: currentJobRoles,
        roles: currentRoles,
        roles_count: currentRoles.length
      });
    }

    // 6 e 7: Validações de Colaboradores (Employees)
    for (const emp of employees) {
      // Validar 6: Apontando para perfil inexistente
      if (emp.profile_id && !profileMap.has(emp.profile_id)) {
        report.issues.employees_with_missing_profile.push({
          employee_id: emp.id,
          employee_name: emp.full_name,
          missing_profile_id: emp.profile_id
        });
      }

      // Validar 7: Cargo diferente do perfil
      if (emp.profile_id && emp.job_role) {
        const empProfile = profileMap.get(emp.profile_id);
        if (empProfile && empProfile.job_roles && empProfile.job_roles.length > 0) {
          // Verifica se o cargo do employee está dentro dos cargos suportados pelo perfil
          let isMismatch = !empProfile.job_roles.includes(emp.job_role);
          
          // Se o employee tem um job_role que não está na lista padrão, ele cai no 'Colaborador Básico' (que tem job_role 'outros')
          const isCustomRole = !['socio', 'diretor', 'gerente', 'supervisor_loja', 'lider_tecnico', 'financeiro', 'rh', 'tecnico', 'comercial', 'consultor_vendas', 'marketing', 'administrativo', 'acelerador', 'consultor', 'mentor', 'outros', 'socio_interno'].includes(emp.job_role);
          if (isCustomRole && empProfile.name === 'Colaborador Básico') {
            isMismatch = false; // Não é mismatch se ele caiu no genérico corretamente
          }

          if (isMismatch) {
            report.issues.employees_with_job_role_mismatch.push({
              employee_id: emp.id,
              employee_name: emp.full_name,
              employee_job_role: emp.job_role,
              profile_id: empProfile.id,
              profile_name: empProfile.name,
              profile_job_roles: empProfile.job_roles
            });
          }
        }
      }
    }

    return Response.json(report);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});