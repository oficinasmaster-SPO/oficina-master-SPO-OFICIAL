import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  console.log("🔵 [registerInvitedEmployee] Iniciando...");

  try {
    const base44 = createClientFromRequest(req);
    
    const { token, name, email, phone, profile_picture_url } = await req.json();

    console.log("📥 Token recebido:", token);
    console.log("📧 Email:", email);

    // Buscar convite com service role
    console.log("🔍 Buscando convite...");
    const invites = await base44.asServiceRole.entities.EmployeeInvite.filter({ invite_token: token });
    console.log("📊 Convites encontrados:", invites?.length || 0);
    
    const invite = invites[0];

    if (!invite) {
      console.error("❌ Convite não encontrado com token:", token);
      return Response.json({ error: 'Convite não encontrado. Verifique o link ou solicite novo convite.' }, { status: 404 });
    }
    
    console.log("✅ Convite encontrado:", invite.id, "Status:", invite.status);

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return Response.json({ error: 'Convite expirado' }, { status: 400 });
    }

    if (invite.status === 'concluido') {
      return Response.json({ error: 'Convite já utilizado' }, { status: 400 });
    }

    const isInternal = invite.invite_type === 'internal';
    const finalEmail = email || invite.email;

    let ownerId = null;
    if (!isInternal && invite.workshop_id) {
      const workshop = await base44.asServiceRole.entities.Workshop.get(invite.workshop_id);
      ownerId = workshop?.owner_id;
    }

    // Criar/Atualizar Employee
    const existingEmps = await base44.asServiceRole.entities.Employee.filter({ email: finalEmail });
    
    const empData = {
      full_name: name || invite.name,
      telefone: phone || '',
      profile_picture_url: profile_picture_url || '',
      position: invite.position || 'Colaborador',
      area: invite.area || 'tecnico',
      job_role: invite.job_role || 'outros',
      status: 'ativo',
      tipo_vinculo: isInternal ? 'interno' : 'cliente',
      is_internal: isInternal,
      first_login_at: new Date().toISOString()
    };

    if (!isInternal && invite.workshop_id) {
      empData.workshop_id = invite.workshop_id;
      if (ownerId) empData.owner_id = ownerId;
    }

    let employee;
    if (existingEmps && existingEmps.length > 0) {
      employee = await base44.asServiceRole.entities.Employee.update(existingEmps[0].id, empData);
    } else {
      employee = await base44.asServiceRole.entities.Employee.create({
        email: finalEmail,
        hire_date: new Date().toISOString().split('T')[0],
        ...empData
      });
    }

    console.log("✅ Employee criado/atualizado:", employee.id);
    
    // CRÍTICO: Buscar User pelo email e vincular ao Employee
    try {
      const users = await base44.asServiceRole.entities.User.filter({ email: finalEmail });
      if (users && users.length > 0) {
        const userId = users[0].id;
        await base44.asServiceRole.entities.Employee.update(employee.id, { 
          user_id: userId 
        });
        console.log("🔗 User vinculado ao Employee:", userId);
      } else {
        console.warn("⚠️ User não encontrado para vincular ao Employee");
      }
    } catch (linkError) {
      console.error("❌ Erro ao vincular User ao Employee:", linkError);
    }

    // 🔄 AUTO-VINCULAÇÃO: Buscar perfil baseado em job_role
    let profileId = null;
    const jobRole = invite.job_role || 'outros';
    
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
        profileId = matchingProfile.id;
        console.log(`✅ Auto-vinculado ao perfil: ${matchingProfile.name} (job_role: ${jobRole})`);
        
        // Atualizar Employee com profile_id
        await base44.asServiceRole.entities.Employee.update(employee.id, { 
          profile_id: profileId 
        });
      } else {
        console.warn(`⚠️ Nenhum perfil encontrado para job_role: ${jobRole}`);
      }
    } catch (error) {
      console.warn("⚠️ Erro ao buscar perfil:", error);
    }

    await base44.asServiceRole.entities.EmployeeInvite.update(invite.id, {
      status: 'concluido',
      completed_at: new Date().toISOString(),
      employee_id: employee.id
    });

    console.log("🎉 Sucesso!");

    return Response.json({ 
      success: true, 
      employee_id: employee.id
    });

  } catch (error) {
    console.error('❌', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});