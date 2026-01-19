import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const { name, email, telefone, position, area, job_role, profile_id, workshop_id, role = "user" } = body;
    
    if (!name || !email || !workshop_id) {
      return Response.json({ error: 'Nome, email e oficina obrigatórios' }, { status: 400 });
    }
    
    // Validar role
    if (!['user', 'admin'].includes(role)) {
      return Response.json({ error: 'Role deve ser "user" ou "admin"' }, { status: 400 });
    }

    console.log("👤 Criando colaborador:", email);

    // 1. Verificar se já existe Employee com este email
    const existingEmployees = await base44.asServiceRole.entities.Employee.filter({ 
      email: email, 
      workshop_id: workshop_id 
    });

    if (existingEmployees && existingEmployees.length > 0) {
      return Response.json({ 
        error: 'Já existe um colaborador com este email nesta oficina' 
      }, { status: 400 });
    }

    // 2. Criar Employee
    const employee = await base44.asServiceRole.entities.Employee.create({
      full_name: name,
      email: email,
      telefone: telefone || '',
      position: position || 'Colaborador',
      area: area || 'tecnico',
      job_role: job_role || 'outros',
      status: 'ativo',
      tipo_vinculo: 'cliente',
      workshop_id: workshop_id,
      profile_id: profile_id || null,
      user_status: 'ativo',
      hire_date: new Date().toISOString().split('T')[0]
    });

    console.log("✅ Employee criado:", employee.id);

    // 3. Criar registro de convite no sistema (usuário será criado quando acessar)
    try {
      const inviteToken = Math.random().toString(36).substring(2, 15) + 
                         Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 dias

      await base44.asServiceRole.entities.EmployeeInvite.create({
        workshop_id: workshop_id,
        employee_id: employee.id,
        name: name,
        email: email,
        telefone: telefone || '',
        position: position || 'Colaborador',
        area: area || 'tecnico',
        job_role: job_role || 'outros',
        profile_id: profile_id || null,
        invite_token: inviteToken,
        invite_type: 'workshop',
        expires_at: expiresAt.toISOString(),
        status: "pendente",
        metadata: { role: role } // Salvar role para criar usuário depois
      });

      console.log("✅ Convite criado no sistema");
    } catch (inviteDbError) {
      console.error("⚠️ Erro ao criar convite no banco:", inviteDbError.message);
    }

    // 5. Buscar oficina para enviar email
    let workshopData;
    try {
      workshopData = await base44.asServiceRole.entities.Workshop.get(workshop_id);
    } catch (workshopError) {
      console.error("⚠️ Erro ao buscar workshop:", workshopError);
      workshopData = { name: "Oficina" }; // Fallback
    }

    // 6. Buscar token do convite
    const invites = await base44.asServiceRole.entities.EmployeeInvite.filter({ 
      email: email,
      workshop_id: workshop_id
    }, '-created_date', 1);

    const invite = invites[0];
    const origin = new URL(req.url).origin;
    const inviteLink = invite 
      ? `${origin}/PrimeiroAcesso?token=${invite.invite_token}`
      : `${origin}/PrimeiroAcesso`;

    // 7. Enviar dados para Zapier via integração Base44
    console.log("📤 Enviando dados para Zapier...");
    
    let zapierStatus = 'não configurado';
    
    try {
      const webhookData = {
        event: 'employee_invite',
        timestamp: new Date().toISOString(),
        employee: {
          name: name,
          email: email,
          telefone: telefone || '',
          position: position || 'Colaborador',
          area: area || 'tecnico',
          job_role: job_role || 'outros'
        },
        workshop: {
          id: workshop_id,
          name: workshopData.name
        },
        invite: {
          link: inviteLink,
          token: invite.invite_token,
          temporary_password: "Oficina@2025",
          expires_at: invite.expires_at
        }
      };

      await base44.asServiceRole.integrations.Zapier.TriggerZap({
        event_name: 'employee_invite',
        data: webhookData
      });

      await base44.asServiceRole.entities.EmployeeInvite.update(invite.id, {
        status: 'enviado',
        last_resent_at: new Date().toISOString()
      });

      zapierStatus = 'enviado';
      console.log("✅ Dados enviados para Zapier com sucesso!");
      
    } catch (zapierError) {
      console.error("⚠️ Erro ao enviar para Zapier:", zapierError.message);
      zapierStatus = 'erro: ' + zapierError.message;
    }

    // 8. Retornar sucesso
    return Response.json({ 
      success: true,
      message: 'Colaborador criado! Dados enviados para automação.',
      email: email,
      temporary_password: "Oficina@2025",
      employee_id: employee.id,
      invite_link: inviteLink,
      zapier_status: zapierStatus
    });

  } catch (error) {
    console.error("❌ Erro:", error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});