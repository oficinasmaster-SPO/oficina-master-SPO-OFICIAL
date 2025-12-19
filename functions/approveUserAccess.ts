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

    // Buscar User existente (já deve existir com status pending)
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email: employee.email });
    
    if (!existingUsers || existingUsers.length === 0) {
      return Response.json({ 
        error: 'Usuário não encontrado. O colaborador precisa completar o cadastro primeiro.' 
      }, { status: 404 });
    }

    const userId = existingUsers[0].id;
    
    // Buscar dados atualizados do User antes de aprovar
    const currentUser = existingUsers[0];

    // Atualizar User para status active e configurar profile_id
    const jobRole = employee.job_role || currentUser.job_role || 'outros';
    
    const userData = {
      user_status: 'active',
      approved_at: new Date().toISOString(),
      approved_by: admin.id,
      full_name: currentUser.full_name || employee.full_name,
      position: employee.position,
      job_role: jobRole,
      area: employee.area || currentUser.area,
      telefone: employee.telefone || currentUser.telefone,
      profile_picture_url: employee.profile_picture_url || currentUser.profile_picture_url
    };

    // 🔄 AUTO-VINCULAÇÃO: Buscar perfil baseado em job_role
    let finalProfileId = profile_id || currentUser.profile_id;
    
    // Se não tem perfil definido, tentar encontrar um automaticamente
    if (!finalProfileId) {
      try {
        const allProfiles = await base44.asServiceRole.entities.UserProfile.list();
        const matchingProfile = allProfiles.find(
          (p) =>
            p.status === "ativo" &&
            p.job_roles &&
            Array.isArray(p.job_roles) &&
            p.job_roles.includes(jobRole)
        );
        
        if (matchingProfile) {
          finalProfileId = matchingProfile.id;
          console.log(`✅ Auto-vinculado ao perfil: ${matchingProfile.name} (job_role: ${jobRole})`);
        } else {
          console.warn(`⚠️ Nenhum perfil encontrado para job_role: ${jobRole}`);
        }
      } catch (error) {
        console.warn("⚠️ Erro ao buscar perfil:", error);
      }
    }
    
    if (finalProfileId) {
      userData.profile_id = finalProfileId;
    }

    // Adicionar workshop_id se for colaborador de oficina
    if (employee.workshop_id) {
      userData.workshop_id = employee.workshop_id;
    }

    console.log("📊 Dados do User na aprovação:", userData);

    await base44.asServiceRole.entities.User.update(userId, userData);
    console.log("✅ User aprovado e ativado:", userId);

    // Vincular user_id ao Employee e sincronizar status
    await base44.asServiceRole.entities.Employee.update(employee.id, {
      user_id: userId,
      user_status: 'ativo' // Employee usa 'ativo', não 'active'
    });

    console.log("✅ Employee atualizado com status ativo");

    // Registrar aprovação no log de auditoria
    try {
      await base44.asServiceRole.functions.invoke('auditLog', {
        user_id: admin.id,
        action: 'user_approved',
        entity_type: 'User',
        entity_id: userId,
        details: {
          approved_user_email: employee.email,
          approved_user_name: employee.full_name,
          profile_id: userData.profile_id || null,
          workshop_id: employee.workshop_id || null,
          is_internal: isInternalUser
        }
      });
    } catch (auditError) {
      console.error("⚠️ Erro ao registrar auditoria:", auditError);
    }

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