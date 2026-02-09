import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { profile_id } = await req.json();

    if (!profile_id) {
      return Response.json({ error: 'profile_id required' }, { status: 400 });
    }

    // Buscar perfil
    const profile = await base44.asServiceRole.entities.UserProfile.get(profile_id);
    
    if (!profile) {
      return Response.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Buscar custom roles do perfil
    const customRoles = profile.custom_role_ids 
      ? await Promise.all(
          profile.custom_role_ids.map(id => 
            base44.asServiceRole.entities.CustomRole.get(id).catch(() => null)
          )
        ).then(roles => roles.filter(r => r !== null))
      : [];

    // Buscar usuários vinculados ao perfil
    const allUsers = await base44.asServiceRole.entities.User.list();
    const profileUsers = allUsers.filter(u => u.profile_id === profile_id);

    // Coletar todas roles
    const allSystemRoles = customRoles.reduce((acc, role) => {
      return [...acc, ...(role.system_roles || [])];
    }, []);

    // Mapear módulos acessíveis com contagem
    const systemRolesMap = {
      dashboard: ['dashboard.view', 'dashboard.edit', 'dashboard.export'],
      workshop: ['workshop.view', 'workshop.edit', 'workshop.manage_goals'],
      employees: ['employees.view', 'employees.create', 'employees.edit', 'employees.delete', 'employees.manage_permissions'],
      financeiro: ['financeiro.view', 'financeiro.edit', 'financeiro.approve', 'financeiro.export'],
      diagnostics: ['diagnostics.view', 'diagnostics.create', 'diagnostics.ai_access'],
      processes: ['processes.view', 'processes.create', 'processes.edit', 'documents.upload'],
      culture: ['culture.view', 'culture.edit', 'culture.manage_rituals'],
      training: ['training.view', 'training.create', 'training.manage', 'training.evaluate'],
      operations: ['operations.view_qgp', 'operations.manage_tasks', 'operations.daily_log'],
      acceleration: ['acceleration.view', 'acceleration.manage'],
      admin: ['admin.users', 'admin.profiles', 'admin.system_config', 'admin.audit']
    };

    const accessibleModules = Object.entries(systemRolesMap).reduce((acc, [module, roles]) => {
      const matchedRoles = roles.filter(role => allSystemRoles.includes(role));
      if (matchedRoles.length > 0) {
        acc[module] = {
          accessible,
          roles,
          permission_count.length,
          total_possible.length,
          coverage_percentage.round((matchedRoles.length / roles.length) * 100)
        };
      }
      return acc;
    }, {});

    // Analytics por role
    const roleAnalytics = customRoles.map(role => ({
      role_id.id,
      role_name.name,
      users_with_role.length,
      system_roles_count.system_roles?.length || 0,
      modules_accessible.keys(systemRolesMap).filter(module =>
        systemRolesMap[module].some(sr => role.system_roles?.includes(sr))
      ).length
    }));

    // Distribuição de permissões
    const permissionDistribution = Object.entries(accessibleModules).map(([module, data]) => ({
      module,
      permissions.permission_count,
      coverage.coverage_percentage
    }));

    // Gerar relatório
    const report = {
      profile: {
        id.id,
        name.name,
        type.type,
        status.status,
        description.description,
        users_count.length
      },
      custom_roles.map(role => ({
        id.id,
        name.name,
        description.description,
        system_roles_count.system_roles?.length || 0,
        system_roles.system_roles || []
      })),
      permissions_summary: {
        total_custom_roles.length,
        total_system_roles.length,
        unique_system_roles: [...new Set(allSystemRoles)].length,
        accessible_modules.keys(accessibleModules).length,
        total_modules.keys(systemRolesMap).length,
        users_affected.length,
        coverage_percentage.round((Object.keys(accessibleModules).length / Object.keys(systemRolesMap).length) * 100)
      },
      accessible_modules,
      permission_distribution,
      role_analytics,
      users_affected.map(u => ({
        id.id,
        email.email,
        full_name.full_name,
        position.position,
        job_role.job_role
      })),
      generated_at Date().toISOString(),
      generated_by.email
    };

    return Response.json({
      success,
      report
    });

  } catch (error) {
    console.error("Error generating report:", error);
    return Response.json({ 
      success,
      error.message 
    }, { status: 500 });
  }
});
