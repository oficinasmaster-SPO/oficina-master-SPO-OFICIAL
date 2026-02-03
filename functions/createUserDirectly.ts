import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Validar autenticação SEM alterar sessão
    let currentUser = null;
    try {
      currentUser = await base44.auth.me();
    } catch (e) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }
    
    if (!currentUser) {
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

    console.log("👤 Convidando usuário:", email);

    // Buscar workshop para pegar identificador
    const workshop = await base44.asServiceRole.entities.Workshop.get(workshop_id);
    const workshopId = workshop?.identificador || workshop_id;

    // Contar employees existentes para gerar Profile ID automático
    const allEmployees = await base44.asServiceRole.entities.Employee.filter({ workshop_id: workshop_id });
    const employeeCount = Array.isArray(allEmployees) ? allEmployees.length + 1 : 1;
    
    // Gerar Profile ID: 001.01, 001.02, etc
    const generatedProfileId = `${workshopId}.${String(employeeCount).padStart(2, '0')}`;
    const finalProfileId = profile_id || generatedProfileId;

    // Convidar usuário via Base44 usando SERVICE ROLE (não afeta sessão do admin)
    console.log("📧 Convidando usuário via Base44 com role:", role);
    const cleanEmail = email.trim().toLowerCase();
    const inviteResult = await base44.asServiceRole.users.inviteUser(cleanEmail, role);
    
    console.log("✅ Convite enviado pelo Base44 (email automático) - sessão do admin mantida");

    // Gerar token de convite
    const inviteToken = Math.random().toString(36).substring(2, 15) + 
                       Math.random().toString(36).substring(2, 15);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 dias

    // Criar convite
    const invite = await base44.asServiceRole.entities.EmployeeInvite.create({
      workshop_id: workshop_id,
      name: name,
      email: cleanEmail,
      telefone: telefone || '',
      position: position || 'Colaborador',
      area: area || 'tecnico',
      job_role: job_role || 'outros',
      profile_id: finalProfileId,
      invite_token: inviteToken,
      invite_type: 'workshop',
      expires_at: expiresAt.toISOString(),
      status: "pendente",
      metadata: { 
        role: role,
        workshop_id: workshop_id,
        profile_id: finalProfileId,
        invited_at: new Date().toISOString()
      }
    });

    console.log("✅ Convite criado:", invite.id);

    // Criar Employee com os dados
    console.log("👥 Criando Employee...");
    const employee = await base44.asServiceRole.entities.Employee.create({
      workshop_id: workshop_id,
      user_id: inviteResult.id,
      full_name: name,
      email: cleanEmail,
      telefone: telefone || '',
      position: position || 'Colaborador',
      job_role: job_role || 'outros',
      area: area || 'tecnico',
      profile_id: finalProfileId,
      user_status: 'pending',
      is_internal: true,
      tipo_vinculo: 'interno',
      admin_responsavel_id: currentUser.id,
      hire_date: new Date().toISOString().split('T')[0],
      data_nascimento: data_nascimento || null
    });

    console.log("✅ Employee criado:", employee.id);

    // Atualizar User com dados customizados usando SERVICE ROLE (não afeta sessão)
    console.log("🔄 Atualizando dados do User...");
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
      admin_responsavel_id: currentUser.id
    };

    if (data_nascimento) {
      userData.data_nascimento = data_nascimento;
    }

    // Atualizar via SERVICE ROLE (não afeta sessão do admin logado)
    await base44.asServiceRole.entities.User.update(inviteResult.id, userData);
    console.log("✅ Dados customizados salvos no User");

    // Gerar link de convite com profile_id (sem workshop_id)
    const inviteDomain = `https://oficinasmastergtr.com`;
    const inviteLink = `${inviteDomain}/PrimeiroAcesso?token=${invite.invite_token}&profile_id=${finalProfileId}`;

    return Response.json({ 
      success: true,
      message: 'Usuário criado com sucesso. E-mail de convite enviado pelo Base44.',
      user_id: inviteResult.id,
      email: cleanEmail,
      temporary_password: "Oficina@2025",
      profile_id: finalProfileId,
      invite_link: inviteLink,
      invite_id: invite.id,
      employee_id: employee.id
    });

  } catch (error) {
    console.error("❌ Erro:", error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});