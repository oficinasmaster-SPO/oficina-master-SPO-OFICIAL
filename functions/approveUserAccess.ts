import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verificar se é admin
    const admin = await base44.auth.me();
    if (!admin || admin.role !== 'admin') {
      return Response.json({ error: 'Apenas administradores podem aprovar usuários' }, { status: 403 });
    }

    const { employee_id, profile_id } = await req.json();

    if (!employee_id) {
      return Response.json({ error: 'Employee ID obrigatório' }, { status: 400 });
    }

    console.log("🔍 Aprovando acesso do Employee:", employee_id);

    // Buscar Employee
    const employee = await base44.asServiceRole.entities.Employee.get(employee_id);
    
    if (!employee) {
      return Response.json({ error: 'Colaborador não encontrado' }, { status: 404 });
    }

    const isInternalUser = employee.tipo_vinculo === 'interno' || employee.is_internal === true;

    // Criar registro na entidade User (autenticação)
    let userId;
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email: employee.email });
    
    const userData = {
      full_name: employee.full_name,
      position: employee.position,
      job_role: employee.job_role || 'outros',
      area: employee.area || 'administrativo',
      telefone: employee.telefone || '',
      is_internal: isInternalUser,
      user_status: 'active',
      approved_at: new Date().toISOString(),
      approved_by: admin.id,
      invite_id: employee.id
    };

    // Adicionar workshop_id apenas para colaboradores de oficina
    if (!isInternalUser && employee.workshop_id) {
      userData.workshop_id = employee.workshop_id;
    }

    // Adicionar profile_id se fornecido (para internos)
    if (profile_id) {
      userData.profile_id = profile_id;
    } else if (employee.profile_id) {
      userData.profile_id = employee.profile_id;
    }

    if (existingUsers && existingUsers.length > 0) {
      // Atualizar User existente
      await base44.asServiceRole.entities.User.update(existingUsers[0].id, userData);
      userId = existingUsers[0].id;
      console.log("✅ User atualizado:", userId);
    } else {
      // Criar novo User
      const newUser = await base44.asServiceRole.entities.User.create({
        email: employee.email,
        role: isInternalUser ? 'user' : 'user',
        ...userData
      });
      userId = newUser.id;
      console.log("✅ User criado:", userId);
    }

    // Vincular user_id ao Employee
    await base44.asServiceRole.entities.Employee.update(employee.id, {
      user_id: userId,
      user_status: 'active'
    });

    // Criar permissões baseadas no perfil
    try {
      if (isInternalUser && userData.profile_id) {
        console.log("🔐 Criando permissões para usuário interno...");
        const profile = await base44.asServiceRole.entities.UserProfile.get(userData.profile_id);

        if (profile) {
          // Verificar se já existe permissão
          const existingPerms = await base44.asServiceRole.entities.UserPermission.filter({ 
            user_id: userId 
          });

          if (!existingPerms || existingPerms.length === 0) {
            await base44.asServiceRole.entities.UserPermission.create({
              user_id: userId,
              user_email: employee.email,
              profile_id: userData.profile_id,
              profile_name: profile.name,
              custom_roles: profile.roles || [],
              custom_role_ids: profile.custom_role_ids || [],
              module_permissions: profile.module_permissions || {},
              sidebar_permissions: profile.sidebar_permissions || {},
              is_active: true,
              created_at: new Date().toISOString()
            });
            console.log("✅ Permissões internas criadas!");
          }
        }
      } else if (!isInternalUser && employee.workshop_id) {
        console.log("🔐 Criando permissões para colaborador de oficina...");
        await base44.asServiceRole.functions.invoke('createDefaultPermissions', {
          user_id: userId,
          workshop_id: employee.workshop_id,
          job_role: employee.job_role || 'outros'
        });
        console.log("✅ Permissões de oficina criadas!");
      }
    } catch (permError) {
      console.error("⚠️ Erro ao criar permissões:", permError);
    }

    // Atualizar convite para concluído
    try {
      const invites = await base44.asServiceRole.entities.EmployeeInvite.filter({ 
        email: employee.email,
        employee_id: employee.id
      });

      if (invites && invites.length > 0) {
        await base44.asServiceRole.entities.EmployeeInvite.update(invites[0].id, {
          status: 'concluido',
          completed_at: new Date().toISOString(),
          created_user_id: userId
        });
      }
    } catch (inviteError) {
      console.log("⚠️ Erro ao atualizar convite (não crítico):", inviteError);
    }

    return Response.json({ 
      success: true,
      user_id: userId,
      message: 'Acesso aprovado com sucesso! Usuário pode fazer login agora.'
    });

  } catch (error) {
    console.error('❌ Erro ao aprovar usuário:', error);
    return Response.json({ 
      success: false, 
      error: error.message || 'Erro ao aprovar acesso' 
    }, { status: 500 });
  }
});