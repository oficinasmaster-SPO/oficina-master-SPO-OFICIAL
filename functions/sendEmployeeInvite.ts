import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Usuário não autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const { name, email, position, area, job_role, initial_permission, workshop_id, workshop_name, origin, employee_id } = body;

    if (!name || !email || !workshop_id) {
      return Response.json({ error: 'Campos obrigatórios: nome, email e workshop_id' }, { status: 400 });
    }

    console.log("📧 Iniciando envio de convite para:", email);

    // Buscar Employee se não fornecido
    let finalEmployeeId = employee_id;
    if (!finalEmployeeId) {
      const employees = await base44.asServiceRole.entities.Employee.filter({ 
        email: email, 
        workshop_id: workshop_id 
      });
      if (employees && employees.length > 0) {
        finalEmployeeId = employees[0].id;
      }
    }

    // Gerar token e data de expiração
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Verificar convites existentes
    const existingInvites = await base44.asServiceRole.entities.EmployeeInvite.filter({ 
      email: email, 
      workshop_id: workshop_id 
    });

    let inviteId;
    let isResend = false;

    if (existingInvites && existingInvites.length > 0) {
      // Atualizar convite existente
      const existing = existingInvites[0];
      isResend = true;
      inviteId = existing.id;

      await base44.asServiceRole.entities.EmployeeInvite.update(existing.id, {
        invite_token: token,
        expires_at: expiresAt,
        resent_count: (existing.resent_count || 0) + 1,
        last_resent_at: new Date().toISOString(),
        status: 'enviado'
      });

      console.log("🔄 Convite atualizado:", inviteId);
    } else {
      // Criar novo convite
      const newInvite = await base44.asServiceRole.entities.EmployeeInvite.create({
        name,
        email,
        position: position || 'Colaborador',
        area: area || 'tecnico',
        job_role: job_role || 'outros',
        initial_permission: initial_permission || 'colaborador',
        workshop_id,
        employee_id: finalEmployeeId || null,
        invite_token: token,
        expires_at: expiresAt,
        status: 'enviado'
      });

      inviteId = newInvite.id;
      console.log("✅ Novo convite criado:", inviteId);
    }

    // Criar ou atualizar User
    try {
      const allUsers = await base44.asServiceRole.entities.User.list();
      const existingUser = allUsers.find(u => u.email === email);

      if (!existingUser) {
        const newUser = await base44.asServiceRole.entities.User.create({
          email: email,
          full_name: name,
          role: 'user',
          workshop_id: workshop_id,
          position: position || 'Colaborador',
          job_role: job_role || 'outros',
          area: area || 'tecnico',
          user_status: 'ativo'
        });

        console.log("✅ User criado no banco:", newUser.id);

        // Vincular ao Employee se existir
        if (finalEmployeeId) {
          await base44.asServiceRole.entities.Employee.update(finalEmployeeId, {
            user_id: newUser.id
          });
          console.log("✅ User vinculado ao Employee");
        }
      } else {
        console.log("ℹ️ User já existe:", existingUser.id);
        
        // Atualizar dados do User
        await base44.asServiceRole.entities.User.update(existingUser.id, {
          workshop_id: workshop_id,
          position: position || existingUser.position,
          job_role: job_role || existingUser.job_role,
          area: area || existingUser.area,
          user_status: 'ativo'
        });

        // Vincular ao Employee se existir
        if (finalEmployeeId) {
          await base44.asServiceRole.entities.Employee.update(finalEmployeeId, {
            user_id: existingUser.id
          });
        }
      }
    } catch (userError) {
      console.error("⚠️ Erro ao criar User (não bloqueante):", userError.message);
    }

    // Enviar email
    const baseUrl = origin || req.headers.get('origin') || 'https://app.base44.com';
    const inviteUrl = `${baseUrl}/PrimeiroAcesso?token=${token}`;
    const companyName = workshop_name || 'Oficinas Master';

    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: `🔑 Convite de Acesso - ${companyName}`,
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
            <div style="background-color: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <h2 style="color: #1e40af; margin-bottom: 20px;">Olá, ${name}!</h2>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                Você foi convidado(a) para acessar o sistema de gestão da <strong>${companyName}</strong>.
              </p>

              <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                Cargo: <strong>${position || 'Colaborador'}</strong><br>
                Área: <strong>${area || 'Técnico'}</strong>
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteUrl}" 
                   style="background-color: #2563eb; color: white; padding: 14px 32px; 
                          text-decoration: none; border-radius: 8px; display: inline-block;
                          font-weight: bold; font-size: 16px;">
                  Aceitar Convite
                </a>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
                <strong>⏰ Este link é válido por 7 dias.</strong>
              </p>

              <p style="color: #9ca3af; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                Se você não solicitou este convite, ignore este email.<br>
                Equipe Oficinas Master
              </p>
            </div>
          </div>
        `
      });

      console.log("✅ Email enviado com sucesso para:", email);
      
      return Response.json({ 
        success: true, 
        message: isResend ? 'Convite reenviado com sucesso' : 'Convite enviado com sucesso',
        invite_id: inviteId,
        invite_url: inviteUrl
      });

    } catch (emailError) {
      console.error("❌ Erro ao enviar email:", emailError);
      return Response.json({ 
        success: false,
        error: 'Convite salvo no banco, mas falha ao enviar email',
        details: emailError.message,
        invite_id: inviteId,
        invite_url: inviteUrl
      }, { status: 500 });
    }

  } catch (error) {
    console.error("❌ Erro geral:", error);
    return Response.json({ 
      success: false,
      error: 'Erro ao processar convite',
      details: error.message 
    }, { status: 500 });
  }
});