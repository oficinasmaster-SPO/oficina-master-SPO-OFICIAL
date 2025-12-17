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

    // Coletar todas as system roles
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
          accessible: true,
          roles: matchedRoles,
          permission_count: matchedRoles.length,
          total_possible: roles.length,
          coverage_percentage: Math.round((matchedRoles.length / roles.length) * 100)
        };
      }
      return acc;
    }, {});

    // Analytics por role
    const roleAnalytics = customRoles.map(role => ({
      role_id: role.id,
      role_name: role.name,
      users_with_role: profileUsers.length,
      system_roles_count: role.system_roles?.length || 0,
      modules_accessible: Object.keys(systemRolesMap).filter(module =>
        systemRolesMap[module].some(sr => role.system_roles?.includes(sr))
      ).length
    }));

    // Distribuição de permissões
    const permissionDistribution = Object.entries(accessibleModules).map(([module, data]) => ({
      module,
      permissions: data.permission_count,
      coverage: data.coverage_percentage
    }));

    // Gerar relatório
    const report = {
      profile: {
        id: profile.id,
        name: profile.name,
        type: profile.type,
        status: profile.status,
        description: profile.description,
        users_count: profileUsers.length
      },
      custom_roles: customRoles.map(role => ({
        id: role.id,
        name: role.name,
        description: role.description,
        system_roles_count: role.system_roles?.length || 0,
        system_roles: role.system_roles || []
      })),
      permissions_summary: {
        total_custom_roles: customRoles.length,
        total_system_roles: allSystemRoles.length,
        unique_system_roles: [...new Set(allSystemRoles)].length,
        accessible_modules: Object.keys(accessibleModules).length,
        total_modules: Object.keys(systemRolesMap).length,
        users_affected: profileUsers.length,
        coverage_percentage: Math.round((Object.keys(accessibleModules).length / Object.keys(systemRolesMap).length) * 100)
      },
      accessible_modules: accessibleModules,
      permission_distribution: permissionDistribution,
      role_analytics: roleAnalytics,
      users_affected: profileUsers.map(u => ({
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        position: u.position,
        job_role: u.job_role
      })),
      generated_at: new Date().toISOString(),
      generated_by: user.email
    };

    return Response.json({
      success: true,
      report
    });

  } catch (error) {
    console.error("Error generating report:", error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});