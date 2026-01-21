import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const { 
      name, 
      email, 
      telefone, 
      position, 
      area, 
      job_role, 
      profile_id, 
      workshop_id, 
      role = "user",
      data_nascimento 
    } = body;
    
    if (!name || !email || !workshop_id) {
      return Response.json({ error: 'Nome, email e workshop_id obrigatórios' }, { status: 400 });
    }
    
    if (!['user', 'admin'].includes(role)) {
      return Response.json({ error: 'Role deve ser "user" ou "admin"' }, { status: 400 });
    }

    console.log("👤 Criando usuário diretamente:", email);

    // Buscar workshop para pegar identificador
    const workshop = await base44.asServiceRole.entities.Workshop.get(workshop_id);
    const workshopId = workshop?.identificador || workshop_id;

    // Contar employees existentes para gerar Profile ID automático
    const allEmployees = await base44.asServiceRole.entities.Employee.filter({ workshop_id: workshop_id });
    const employeeCount = Array.isArray(allEmployees) ? allEmployees.length + 1 : 1;
    
    // Gerar Profile ID: 001.01, 001.02, etc
    const generatedProfileId = `${workshopId}.${String(employeeCount).padStart(2, '0')}`;
    const finalProfileId = profile_id || generatedProfileId;

    // Convidar usuário via Base44
    console.log("👤 Convidando usuário via Base44 com role:", role);
    await base44.users.inviteUser(email, role);
    
    console.log("✅ Convite Base44 enviado para:", email);

    // Gerar token de convite
    const inviteToken = Math.random().toString(36).substring(2, 15) + 
                       Math.random().toString(36).substring(2, 15);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 dias

    // Criar convite
    const invite = await base44.asServiceRole.entities.EmployeeInvite.create({
      workshop_id: workshop_id,
      name: name,
      email: email,
      telefone: telefone || '',
      position: position || 'Colaborador',
      area: area || 'tecnico',
      job_role: job_role || 'outros',
      profile_id: finalProfileId,
      invite_token: inviteToken,
      invite_type: 'workshop',
      expires_at: expiresAt.toISOString(),
      status: "pendente",
      metadata: { role: role }
    });

    console.log("✅ Convite criado:", invite.id);

    // Criar Employee com os dados
    console.log("👥 Criando Employee...");
    const employee = await base44.asServiceRole.entities.Employee.create({
      workshop_id: workshop_id,
      user_id: createdUser.id,
      full_name: name,
      email: email,
      telefone: telefone || '',
      position: position || 'Colaborador',
      job_role: job_role || 'outros',
      area: area || 'tecnico',
      profile_id: finalProfileId,
      user_status: 'pending',
      is_internal: true,
      tipo_vinculo: 'interno',
      admin_responsavel_id: user.id,
      hire_date: new Date().toISOString().split('T')[0],
      data_nascimento: data_nascimento || null
    });

    console.log("✅ Employee criado:", employee.id);

    // Atualizar User com todos os dados
    const userData = {
      full_name: name,
      workshop_id: workshop_id,
      profile_id: finalProfileId,
      position: position || 'Colaborador',
      job_role: job_role || 'outros',
      area: area || 'tecnico',
      telefone: telefone || '',
      hire_date: new Date().toISOString().split('T')[0],
      user_status: 'pending',
      is_internal: true,
      invite_id: invite.id,
      admin_responsavel_id: user.id,
      profile_picture_url: null
    };

    if (data_nascimento) {
      userData.data_nascimento = data_nascimento;
    }

    await base44.asServiceRole.entities.User.update(createdUser.id, userData);
    console.log("✅ User atualizado com dados completos");

    // Gerar link de convite
    const inviteDomain = `https://oficinasmastergtr.com`;
    const inviteLink = `${inviteDomain}/PrimeiroAcesso?token=${invite.invite_token}&workshop_id=${workshop_id}&profile_id=${finalProfileId}`;

    return Response.json({ 
      success: true,
      message: 'Usuário criado diretamente na entidade User',
      user_id: createdUser.id,
      email: email,
      profile_id: finalProfileId,
      invite_link: inviteLink,
      invite_id: invite.id
    });

  } catch (error) {
    console.error("❌ Erro:", error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});