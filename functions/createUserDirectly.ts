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

    // Verificar se já existe User com este email
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email: email });
    if (existingUsers && existingUsers.length > 0) {
      return Response.json({ 
        error: 'Já existe um usuário com este email' 
      }, { status: 400 });
    }

    // Buscar workshop para pegar identificador
    const workshop = await base44.asServiceRole.entities.Workshop.get(workshop_id);
    const workshopId = workshop?.identificador || workshop_id;

    // Contar usuários existentes para gerar Profile ID automático
    const allUsers = await base44.asServiceRole.entities.User.filter({ workshop_id: workshop_id });
    const userCount = Array.isArray(allUsers) ? allUsers.length + 1 : 1;
    
    // Gerar Profile ID: 001.01, 001.02, etc
    const generatedProfileId = `${workshopId}.${String(userCount).padStart(2, '0')}`;
    const finalProfileId = profile_id || generatedProfileId;

    // Criar usuário diretamente com asServiceRole
    console.log("👤 Criando usuário Base44 com role:", role);
    const createdUser = await base44.asServiceRole.entities.User.create({
      full_name: name,
      email: email,
      role: role
    });

    console.log("✅ Usuário Base44 criado:", createdUser.id);

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

    // Atualizar User com todos os dados
    console.log("📝 Preparando dados para atualizar User com workshop_id:", workshop_id);
    
    const userData = {
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
      admin_responsavel_id: user.id
    };

    if (data_nascimento) {
      userData.data_nascimento = data_nascimento;
    }

    console.log("📤 Dados que serão salvos:", JSON.stringify(userData, null, 2));
    
    await base44.asServiceRole.entities.User.update(createdUser.id, userData);
    console.log("✅ User atualizado com dados completos");
    
    // Verificar se foi salvo
    const verifyUser = await base44.asServiceRole.entities.User.get(createdUser.id);
    console.log("🔍 Verificação: workshop_id salvo =", verifyUser.workshop_id);
    
    if (!verifyUser.workshop_id) {
      console.error("❌ CRÍTICO: workshop_id não foi salvo!");
    }

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