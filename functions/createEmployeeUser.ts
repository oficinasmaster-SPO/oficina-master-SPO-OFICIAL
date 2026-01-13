import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const { name, email, telefone, position, area, job_role, profile_id, workshop_id } = body;
    
    if (!name || !email || !workshop_id) {
      return Response.json({ error: 'Nome, email e oficina obrigatórios' }, { status: 400 });
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

    // 3. Convidar usuário Base44
    const temporaryPassword = "Oficina@2025";
    
    try {
      await base44.users.inviteUser(email, "user");
      console.log("✅ Usuário convidado:", email);
    } catch (inviteError) {
      console.error("⚠️ Erro ao convidar usuário:", inviteError.message);
      // Continua mesmo se falhar o convite
    }

    // 4. Criar registro de convite no sistema
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
        status: "enviado"
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

    // 7. Enviar email de convite (somente se email for domínio interno)
    const isInternalEmail = email && (email.includes('@oficinasmaster.com') || email.includes('@base44'));
    
    if (isInternalEmail) {
      try {
        console.log("📧 Enviando email para:", email);
        
        const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">🎉 Bem-vindo(a) à ${workshopData.name}!</h1>
          </div>
          
          <div style="padding: 30px; background: #f9fafb;">
            <p style="font-size: 16px; color: #374151;">Olá, <strong>${name}</strong>!</p>
            
            <p style="font-size: 16px; color: #374151;">
              Você foi convidado(a) para fazer parte da equipe <strong>${workshopData.name}</strong> 
              na plataforma Oficinas Master.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
              <h3 style="margin-top: 0; color: #1f2937;">🔑 Seus Dados de Acesso:</h3>
              <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 5px 0;"><strong>Senha Temporária:</strong> Oficina@2025</p>
              <p style="font-size: 12px; color: #6b7280; margin-top: 10px;">
                ⚠️ Você deverá trocar esta senha no primeiro acesso
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteLink}" 
                 style="display: inline-block; background: #3b82f6; color: white; padding: 15px 40px; 
                        text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                Acessar Plataforma
              </a>
            </div>
            
            <p style="font-size: 14px; color: #6b7280; text-align: center;">
              Este link é válido por 7 dias. Se não funcionar, copie e cole no navegador:<br>
              <code style="background: #e5e7eb; padding: 5px 10px; border-radius: 4px; display: inline-block; margin-top: 10px; font-size: 12px;">
                ${inviteLink}
              </code>
            </p>
          </div>
          
          <div style="background: #1f2937; padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
            <p style="margin: 0;">© 2025 Oficinas Master - Plataforma de Gestão Automotiva</p>
          </div>
        </div>
      `;

        await base44.integrations.Core.SendEmail({
          from_name: workshopData.name || "Oficinas Master",
          to: email,
          subject: `🎉 Bem-vindo(a) à ${workshopData.name} - Acesse sua conta`,
          body: emailBody
        });

        console.log("✅ Email enviado com sucesso!");

        // Atualizar status do convite
        if (invite) {
          await base44.asServiceRole.entities.EmployeeInvite.update(invite.id, {
            status: 'enviado',
            last_resent_at: new Date().toISOString(),
            resent_count: (invite.resent_count || 0) + 1
          });
        }
      } catch (emailError) {
        console.error("❌ Erro ao enviar email:", emailError);
        console.warn("⚠️ Criando colaborador mesmo com erro de email");
      }
    } else {
      console.log("ℹ️ Email externo - pulando envio de email");
    }

    // 8. Retornar sucesso
    return Response.json({ 
      success: true,
      message: 'Colaborador criado com sucesso!',
      email: email,
      temporary_password: temporaryPassword,
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