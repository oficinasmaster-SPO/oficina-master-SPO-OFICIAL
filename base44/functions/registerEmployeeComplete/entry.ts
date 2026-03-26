import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ success: false, error: 'Não autenticado' }, { status: 401 });

    const body = await req.json();
    const { formData, workshop_id, isPartner, userRoles } = body;

    if (!formData || !workshop_id) {
      return Response.json({ success: false, error: 'Dados incompletos' }, { status: 400 });
    }

    const email = formData.email.trim().toLowerCase();
    const workshop = await base44.asServiceRole.entities.Workshop.get(workshop_id);
    const consulting_firm_id = workshop ? workshop.consulting_firm_id : null;

    // 0. Validar se o e-mail já está em uso nesta mesma oficina/filial
    const existingEmployees = await base44.asServiceRole.entities.Employee.filter({
      workshop_id: workshop_id,
      email: email
    });

    if (existingEmployees && existingEmployees.length > 0) {
      return Response.json({ success: false, error: 'Este e-mail já está cadastrado para um colaborador nesta unidade.' }, { status: 400 });
    }

    // 1. Criar Employee (RH)
    const newEmployee = await base44.asServiceRole.entities.Employee.create({
      ...formData,
      email: email,
      workshop_id: workshop_id,
      consulting_firm_id: consulting_firm_id,
      owner_id: workshop?.owner_id || user.id,
      profile_id: formData.user_profile_id || null,
      is_partner: isPartner
    });

    // 2. Atualizar Workshop se for sócio
    if (isPartner && workshop) {
      const currentPartnerIds = workshop.partner_ids || [];
      if (!currentPartnerIds.includes(user.id)) {
        await base44.asServiceRole.entities.Workshop.update(workshop.id, {
          partner_ids: [...currentPartnerIds, user.id]
        });
      }
    }

    // 3. Verificar/Criar User
    let userId = null;
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email: email }, '-created_date', 1);
    
    if (existingUsers && existingUsers.length > 0) {
      const existingUser = existingUsers[0];
      userId = existingUser.id;
      await base44.asServiceRole.entities.User.update(userId, {
        workshop_id: workshop_id,
        consulting_firm_id: consulting_firm_id,
        position: formData.position,
        job_role: formData.job_role || 'outros',
        area: formData.area || 'tecnico',
        telefone: formData.telefone || '',
        hire_date: formData.hire_date || new Date().toISOString().split('T')[0],
        user_status: 'ativo'
      });
    } else {
      await base44.users.inviteUser(email, 'user');
      
      let createdUser = null;
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 200));
        const users = await base44.asServiceRole.entities.User.filter({ email: email }, '-created_date', 1);
        if (users && users.length > 0) {
          createdUser = users[0];
          break;
        }
      }

      if (createdUser) {
        userId = createdUser.id;
        const workshopIdentifier = workshop?.identificador || workshop_id;
        const finalProfileId = formData.user_profile_id || `${workshopIdentifier}.auto`;

        await base44.asServiceRole.entities.User.update(userId, {
          full_name: formData.full_name,
          workshop_id: workshop_id,
          consulting_firm_id: consulting_firm_id,
          profile_id: finalProfileId,
          position: formData.position || 'Colaborador',
          job_role: formData.job_role || 'outros',
          area: formData.area || 'tecnico',
          telefone: formData.telefone || '',
          hire_date: formData.hire_date || new Date().toISOString().split('T')[0],
          user_status: 'pending',
          is_internal: true,
          admin_responsavel_id: user.id
        });
      }
    }

    // 4. Vincular ID do usuário no Employee
    if (userId) {
      await base44.asServiceRole.entities.Employee.update(newEmployee.id, { user_id: userId });
    }

    // 5. Criar Convite
    const inviteToken = crypto.randomUUID().replace(/-/g, '');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invite = await base44.asServiceRole.entities.EmployeeInvite.create({
      workshop_id: workshop_id,
      employee_id: newEmployee.id,
      name: formData.full_name,
      email: email,
      position: formData.position,
      area: formData.area,
      job_role: formData.job_role,
      invite_token: inviteToken,
      expires_at: expiresAt.toISOString(),
      status: "enviado",
      profile_id: formData.user_profile_id || null
    });

    // 6. Enviar p/ Email (Resend) e ActiveCampaign
    const origin = req.headers.get("origin") || 'https://oficinasmastergtr.com';
    const inviteLink = `${origin}/PrimeiroAcesso?token=${inviteToken}&profile_id=${formData.user_profile_id || invite.profile_id}`;

    // 6.1 Enviar email de convite via Resend
    try {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      if (RESEND_API_KEY) {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">Bem-vindo à ${workshop?.name || 'nossa equipe'}!</h1>
            </div>
            
            <div style="padding: 24px; color: #374151;">
              <p style="font-size: 16px;">Olá <strong>${formData.full_name}</strong>,</p>
              <p style="font-size: 16px;">Você foi convidado(a) para fazer parte da equipe <strong>${workshop?.name || 'nossa empresa'}</strong>.</p>
              
              <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
                <p style="margin: 8px 0;">📧 <strong>Email:</strong> ${email}</p>
                <p style="margin: 8px 0;">🔑 <strong>Senha temporária:</strong> (Crie sua senha via Sign up/Criar Conta)</p>
                <p style="margin: 8px 0;">⏰ <strong>Validade:</strong> 7 dias</p>
              </div>
              
              <p style="font-size: 16px; text-align: center; margin-bottom: 24px;">Para completar seu cadastro e acessar a plataforma, clique no botão abaixo:</p>
              
              <div style="text-align: center; margin-bottom: 32px;">
                <a href="${inviteLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Acessar Plataforma</a>
              </div>
              
              <div style="border: 1px solid #e5e7eb; padding: 16px; border-radius: 6px; background-color: #ffffff; margin-bottom: 24px;">
                <p style="margin-top: 0; margin-bottom: 8px; font-size: 14px; color: #6b7280;">Ou copie e cole este link no seu navegador:</p>
                <p style="margin: 0; font-size: 14px; color: #2563eb; word-break: break-all;">${inviteLink}</p>
              </div>
              
              <p style="font-size: 14px; margin-bottom: 0;"><strong>Importante:</strong> Por segurança, você deverá alterar sua senha no primeiro acesso.</p>
            </div>
            
            <div style="background-color: #f3f4f6; padding: 16px; text-align: center; font-size: 12px; color: #6b7280;">
              <p style="margin: 0 0 4px 0;">Este é um email automático. Em caso de dúvidas, entre em contato com o administrador.</p>
              <p style="margin: 0;">© ${new Date().getFullYear()} ${workshop?.name || 'Oficinas Master'}. Todos os direitos reservados.</p>
            </div>
          </div>
        `;
        
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: `Oficinas Master <onboarding@resend.dev>`,
            to: [email],
            subject: `Convite para acessar a plataforma - ${workshop?.name || 'Oficinas Master'}`,
            html: emailHtml
          })
        });
      }
    } catch (e) {
      console.error("Erro ao enviar email via Resend:", e);
    }

    // 6.2 Enviar p/ ActiveCampaign
    try {
      const AC_API_KEY = Deno.env.get("ACTIVECAMPAIGN_API_KEY");
      const AC_API_URL = Deno.env.get("ACTIVECAMPAIGN_API_URL");
      if (AC_API_KEY && AC_API_URL) {
        const contactResponse = await fetch(`${AC_API_URL}/api/3/contact/sync`, {
          method: 'POST',
          headers: { 'Api-Token': AC_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contact: {
              email: email,
              firstName: formData.full_name.split(' ')[0],
              lastName: formData.full_name.split(' ').slice(1).join(' ') || '',
              fieldValues: [{ field: '1', value: workshop?.name || '' }]
            }
          })
        });

        if (contactResponse.ok) {
          const contactResult = await contactResponse.json();
          await fetch(`${AC_API_URL}/api/3/notes`, {
            method: 'POST',
            headers: { 'Api-Token': AC_API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              note: {
                note: `🔑 DADOS DO CONVITE\n\nLink: ${inviteLink}\nSenha Temporária: Oficina@2025\nEmail: ${email}\nNome: ${formData.full_name}`,
                relid: contactResult.contact.id,
                reltype: 'Subscriber'
              }
            })
          });
        }
      }
    } catch(e) {
      console.error("ActiveCampaign background error:", e);
    }

    return Response.json({
      success: true,
      message: 'Colaborador cadastrado e convite processado.',
      employee_id: newEmployee.id
    });

  } catch (error) {
    console.error("registerEmployeeComplete Error:", error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});