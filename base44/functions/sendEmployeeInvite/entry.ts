import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { 
      name, 
      email, 
      workshop_id, 
      employee_id,
      telefone,
      position,
      area,
      job_role,
      profile_id,
      role = "user"
    } = body;
    
    if (!name || !email || !workshop_id) {
      return Response.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    console.log("📧 Enviando convite para:", email);

    // Buscar oficina
    const workshop = await base44.asServiceRole.entities.Workshop.get(workshop_id);
    
    if (!workshop) {
      return Response.json({ error: 'Oficina não encontrada' }, { status: 404 });
    }

    // Validação de Plano
    try {
      const allUsersForPlanCheck = await base44.asServiceRole.entities.User.filter({ workshop_id });
      const planCheck = await base44.functions.invoke('checkPlanAccess', {
        tenantId: workshop_id,
        feature: 'users',
        action: 'check_limit',
        currentUsage: allUsersForPlanCheck ? allUsersForPlanCheck.length : 0
      });
      if (!planCheck.data?.success) {
        return Response.json({
          success: false,
          error: {
            code: "PLAN_RESTRICTION",
            message: "Limite do plano atingido"
          }
        }, { status: 403 });
      }
    } catch (e) {
      console.error("Erro na validação do plano:", e);
    }

    // Verificar se User já existe
    let userExists = false;
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email: email });
    if (existingUsers && existingUsers.length > 0) {
      userExists = true;
      console.log("✅ User já existe para:", email);
    }

    // Se User não existe, criar agora com todos os dados
    if (!userExists) {
      console.log("🆕 Criando User completo para:", email);
      
      // Criar usuário Base44 (A criação no banco será consolidada quando o usuário aceitar o convite no fluxo PrimeiroAcesso / EmployeeInviteAcceptance)
      await base44.users.inviteUser(email, role);
      
      console.log("✅ Comando de inviteUser enviado. O webhook de EmployeeInviteAcceptance fará o merge dos dados do Employee e User.");
    }

    // Buscar convite criado
    const invites = await base44.asServiceRole.entities.EmployeeInvite.filter({ 
      email: email,
      workshop_id: workshop_id
    }, '-created_date', 1);

    const invite = invites[0];
    
    if (!invite) {
      return Response.json({ error: 'Convite não encontrado' }, { status: 404 });
    }

    // Montar link do convite com profile_id em vez de workshop_id
    const origin = new URL(req.url).origin;
    const finalProfileId = profile_id || invite.profile_id;
    const inviteLink = `${origin}/PrimeiroAcesso?token=${invite.invite_token}&profile_id=${finalProfileId}`;
    
    console.log("🔗 Link gerado:", inviteLink);

    // Preparar dados para ActiveCampaign (NÃO envia email direto)
    console.log("📤 Enviando email via ActiveCampaign...");
    console.log("📧 Destinatário:", email);
    
    const AC_API_KEY = Deno.env.get("ACTIVECAMPAIGN_API_KEY");
    const AC_API_URL = Deno.env.get("ACTIVECAMPAIGN_API_URL");
    
    if (!AC_API_KEY || !AC_API_URL) {
      throw new Error("ActiveCampaign não configurado. Configure ACTIVECAMPAIGN_API_KEY e ACTIVECAMPAIGN_API_URL");
    }

    // 1. Criar ou atualizar contato
    const contactData = {
      contact: {
        email: email,
        firstName: name.split(' ')[0],
        lastName: name.split(' ').slice(1).join(' ') || '',
        fieldValues: [
          {
            field: '1', // Customizar conforme seus campos no AC
            value: workshop.name
          }
        ]
      }
    };

    const contactResponse = await fetch(`${AC_API_URL}/api/3/contact/sync`, {
      method: 'POST',
      headers: {
        'Api-Token': AC_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(contactData)
    });

    if (!contactResponse.ok) {
      const errorText = await contactResponse.text();
      console.error("❌ Erro ao criar contato:", errorText);
      throw new Error(`Erro ao criar contato no ActiveCampaign: ${contactResponse.status}`);
    }

    const contactResult = await contactResponse.json();
    console.log("✅ Contato criado/atualizado:", contactResult.contact.id);

    // 2. Salvar link do convite nas notas do contato
    const noteData = {
      note: {
        note: `🔑 DADOS DO CONVITE\n\nLink: ${inviteLink}\nSenha Temporária: Oficina@2025\nOficina: ${workshop.name}\nEmail: ${email}\nNome: ${name}`,
        relid: contactResult.contact.id,
        reltype: 'Subscriber'
      }
    };

    await fetch(`${AC_API_URL}/api/3/notes`, {
      method: 'POST',
      headers: {
        'Api-Token': AC_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(noteData)
    });

    console.log("✅ Contato adicionado ao ActiveCampaign");

    // Enviar email via Resend
    try {
      const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #2563eb;">Você foi convidado para a oficina ${workshop.name}</h2>
          <p>Olá ${name},</p>
          <p>Você recebeu um convite para acessar a plataforma do sistema SPO.</p>
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold; color: #1e293b;">Seus dados de acesso:</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 5px 0;"><strong>Senha:</strong> Crie sua senha acessando a opção 'Criar conta'</p>
          </div>
          <a href="${inviteLink}" style="display: inline-block; background-color: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; margin: 10px 0;">Acessar Plataforma</a>
          <p style="color: #64748b; font-size: 14px; margin-top: 20px;">Próximos passos: Clique no link acima, registre sua senha e acesse seu painel.</p>
          <p style="color: #64748b; font-size: 14px; word-break: break-all;">Link direto: ${inviteLink}</p>
        </div>
      `;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: `Você foi convidado para ${workshop.name}`,
        body: emailBody
      });
      console.log("✅ Email enviado via Base44 SendEmail");
    } catch (emailErr) {
      console.error("⚠️ Erro ao enviar email via Base44:", emailErr);
    }

    // Atualizar status do convite
    await base44.asServiceRole.entities.EmployeeInvite.update(invite.id, {
      status: 'enviado',
      last_resent_at: new Date().toISOString(),
      resent_count: (invite.resent_count || 0) + 1
    });

    return Response.json({ 
      success: true,
      message: '✅ Convite adicionado ao ActiveCampaign! Verifique se a automação "convite-colaborador" está ativa.',
      invite_link: inviteLink,
      contact_id: contactResult.contact.id,
      activecampaign_status: 'Tag adicionada - automação irá disparar email'
    });

  } catch (error) {
    console.error("❌ Erro ao enviar email:", error);
    console.error("❌ Stack completo:", error.stack);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});