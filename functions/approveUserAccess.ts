import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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
    const currentUser = existingUsers[0];

    // Buscar perfil automaticamente se não fornecido
    const jobRole = employee.job_role || currentUser.job_role || 'outros';
    let finalProfileId = profile_id || employee.profile_id || currentUser.profile_id;
    
    if (!finalProfileId) {
      try {
        const allProfiles = await base44.asServiceRole.entities.UserProfile.list();
        const matchingProfile = (allProfiles || []).find(
          (p) =>
            p.status === "ativo" &&
            p.job_roles &&
            Array.isArray(p.job_roles) &&
            p.job_roles.includes(jobRole)
        );
        
        if (matchingProfile) {
          finalProfileId = matchingProfile.id;
          console.log(`✅ Auto-vinculado ao perfil: ${matchingProfile.name} (job_role: ${jobRole})`);
        }
      } catch (error) {
        console.warn("⚠️ Erro ao buscar perfil:", error);
      }
    }

    // Atualizar User para status approved
    const userData = {
      user_status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: admin.id,
      full_name: currentUser.full_name || employee.full_name,
      position: employee.position,
      job_role: jobRole,
      area: employee.area || currentUser.area,
      telefone: employee.telefone || currentUser.telefone,
      profile_picture_url: employee.profile_picture_url || currentUser.profile_picture_url
    };
    
    if (finalProfileId) {
      userData.profile_id = finalProfileId;
    }

    if (employee.workshop_id) {
      userData.workshop_id = employee.workshop_id;
    }

    console.log("📊 Aprovando User:", userId);
    await base44.asServiceRole.entities.User.update(userId, userData);

    // Atualizar Employee com profile_id e status
    await base44.asServiceRole.entities.Employee.update(employee.id, {
      user_id: userId,
      user_status: 'approved',
      profile_id: finalProfileId || null
    });

    console.log("✅ Acesso aprovado!");

    return Response.json({ 
      success: true,
      user_id: userId,
      profile_id: finalProfileId,
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