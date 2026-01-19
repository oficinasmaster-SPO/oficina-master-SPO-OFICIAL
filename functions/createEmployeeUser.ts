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

    // 7. Enviar email automaticamente via Base44
    console.log("📤 Enviando email de convite via Base44...");
    
    let emailStatus = 'não enviado';
    
    try {
      const emailBody = `
        <h2>Bem-vindo(a) ao time da ${workshopData.name}! 🎉</h2>
        
        <p>Olá <strong>${name}</strong>,</p>
        
        <p>Você foi convidado(a) para fazer parte da equipe da <strong>${workshopData.name}</strong> na plataforma Oficinas Master.</p>
        
        <h3>📋 Seus dados de acesso:</h3>
        <ul>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Senha temporária:</strong> Oficina@2025</li>
        </ul>
        
        <p>⚠️ <strong>Importante:</strong> Por segurança, altere sua senha no primeiro acesso.</p>
        
        <p style="margin: 30px 0;">
          <a href="${inviteLink}" 
             style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Acessar Plataforma
          </a>
        </p>
        
        <p>Se o botão não funcionar, copie e cole este link no navegador:</p>
        <p style="background-color: #f3f4f6; padding: 10px; border-radius: 4px; word-break: break-all;">
          ${inviteLink}
        </p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        
        <p style="color: #6b7280; font-size: 14px;">
          Esta é uma mensagem automática da plataforma Oficinas Master.<br>
          Em caso de dúvidas, entre em contato com a gestão da sua oficina.
        </p>
      `;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: `Bem-vindo(a) à ${workshopData.name} - Oficinas Master`,
        body: emailBody,
        from_name: workshopData.name || 'Oficinas Master'
      });

      // Atualizar convite
      await base44.asServiceRole.entities.EmployeeInvite.update(invite.id, {
        status: 'enviado',
        last_resent_at: new Date().toISOString()
      });

      emailStatus = 'enviado';
      console.log("✅ Email enviado com sucesso via Base44!");
      
    } catch (emailError) {
      console.error("⚠️ Erro ao enviar email:", emailError.message);
      emailStatus = 'erro: ' + emailError.message;
    }

    // 8. Retornar sucesso
    return Response.json({ 
      success: true,
      message: 'Colaborador criado e email de convite enviado!',
      email: email,
      temporary_password: "Oficina@2025",
      employee_id: employee.id,
      invite_link: inviteLink,
      email_status: emailStatus
    });

  } catch (error) {
    console.error("❌ Erro:", error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});