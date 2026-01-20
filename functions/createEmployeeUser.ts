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
      employee_id: employee.id
    }, '-created_date', 1);

    const invite = Array.isArray(invites) && invites.length > 0 ? invites[0] : null;
    
    // Gerar domínio correto
    const inviteDomain = `https://oficinasmastergtr.com`;
    
    const inviteLink = invite && invite.invite_token
      ? `${inviteDomain}/PrimeiroAcesso?token=${invite.invite_token}`
      : `${inviteDomain}/PrimeiroAcesso`;

    console.log("🔗 Convite encontrado:", invite?.invite_token, "Link:", inviteLink);

    // 7. Enviar email via Resend
    console.log("📧 Enviando email de convite via Resend...");

    let emailStatus = 'não enviado';

    try {
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .info-box { background: white; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Bem-vindo à ${workshopData.name}!</h1>
            </div>
            <div class="content">
              <p>Olá <strong>${name}</strong>,</p>
              <p>Você foi convidado(a) para fazer parte da equipe <strong>${workshopData.name}</strong> como <strong>${position || 'Colaborador'}</strong>.</p>

              <div class="info-box">
                <p><strong>📧 Email:</strong> ${email}</p>
                <p><strong>🔑 Senha temporária:</strong> Oficina@2025</p>
                <p><strong>⏰ Validade:</strong> 7 dias</p>
              </div>

              <p>Para completar seu cadastro e acessar a plataforma, clique no botão abaixo:</p>

              <div style="text-align: center;">
                <a href="${inviteLink}" class="button">Acessar Plataforma</a>
              </div>

              <p style="font-size: 14px; color: #6b7280;">
                Ou copie e cole este link no seu navegador:<br>
                <a href="${inviteLink}">${inviteLink}</a>
              </p>

              <p><strong>Importante:</strong> Por segurança, você deverá alterar sua senha no primeiro acesso.</p>
            </div>
            <div class="footer">
              <p>Este é um email automático. Em caso de dúvidas, entre em contato com o administrador.</p>
              <p>&copy; ${new Date().getFullYear()} ${workshopData.name}. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Tentar enviar via Resend primeiro
      try {
        const emailResult = await base44.asServiceRole.functions.invoke('sendEmailResend', {
          to: email,
          subject: `Convite para ${workshopData.name} - Complete seu cadastro`,
          html: emailHtml,
          from_name: workshopData.name
        });

        if (emailResult.data?.success) {
          await base44.asServiceRole.entities.EmployeeInvite.update(invite.id, {
            status: 'enviado',
            last_resent_at: new Date().toISOString()
          });
          emailStatus = 'enviado';
          console.log("✅ Email enviado com sucesso via Resend!");
        } else {
          emailStatus = 'erro: ' + (emailResult.data?.error || 'Falha desconhecida');
          console.error("⚠️ Erro ao enviar via Resend:", emailResult.data);
        }
      } catch (resendError) {
        // Fallback para ActiveCampaign se Resend falhar
        console.log("⚠️ Tentando enviar via ActiveCampaign...");
        try {
          const acResponse = await base44.asServiceRole.functions.invoke('sendEmployeeInvite', {
            name: name,
            email: email,
            workshop_id: workshop_id,
            employee_id: employee.id,
            invite_link: inviteLink,
            invite_token: invite.invite_token
          });
          
          if (acResponse.data?.success) {
            await base44.asServiceRole.entities.EmployeeInvite.update(invite.id, {
              status: 'enviado',
              last_resent_at: new Date().toISOString()
            });
            emailStatus = 'enviado via ActiveCampaign';
            console.log("✅ Email enviado via ActiveCampaign!");
          } else {
            emailStatus = 'erro: ' + (acResponse.data?.error || 'Falha em ambos sistemas');
            console.error("⚠️ Erro também no ActiveCampaign:", acResponse.data);
          }
        } catch (acError) {
          emailStatus = 'erro: ' + acError.message;
          console.error("⚠️ Erro em ambos sistemas de email:", acError.message);
        }
      }

    } catch (emailError) {
      console.error("⚠️ Erro ao enviar email:", emailError.message);
      emailStatus = 'erro: ' + emailError.message;
    }

    // 8. Retornar sucesso
    console.log("✅ Resposta final:", {
      success: true,
      email: email,
      invite_link: inviteLink,
      email_status: emailStatus
    });

    return Response.json({ 
      success: true,
      message: 'Colaborador criado! Email de convite enviado.',
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