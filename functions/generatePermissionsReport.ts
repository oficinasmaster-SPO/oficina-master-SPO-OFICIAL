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

    // Mapear módulos acessíveis
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
      const hasAccess = roles.some(role => allSystemRoles.includes(role));
      if (hasAccess) {
        acc[module] = {
          accessible: true,
          roles: roles.filter(role => allSystemRoles.includes(role))
        };
      }
      return acc;
    }, {});

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
        accessible_modules: Object.keys(accessibleModules).length,
        users_affected: profileUsers.length
      },
      accessible_modules: accessibleModules,
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