import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { name, email, workshop_id, employee_id } = body;
    
    if (!name || !email || !workshop_id) {
      return Response.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    console.log("📧 Enviando convite para:", email);

    // Buscar oficina
    const workshop = await base44.asServiceRole.entities.Workshop.get(workshop_id);
    
    if (!workshop) {
      return Response.json({ error: 'Oficina não encontrada' }, { status: 404 });
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

    // Montar link do convite
    const origin = new URL(req.url).origin;
    const inviteLink = `${origin}/PrimeiroAcesso?token=${invite.invite_token}`;
    
    console.log("🔗 Link gerado:", inviteLink);

    // Email HTML
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">🎉 Bem-vindo(a) à ${workshop.name}!</h1>
        </div>
        
        <div style="padding: 30px; background: #f9fafb;">
          <p style="font-size: 16px; color: #374151;">Olá, <strong>${name}</strong>!</p>
          
          <p style="font-size: 16px; color: #374151;">
            Você foi convidado(a) para fazer parte da equipe <strong>${workshop.name}</strong> 
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

    // Enviar email via ActiveCampaign
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

    // 2. Criar e enviar campanha one-to-one
    const campaignData = {
      campaign: {
        type: 'single',
        name: `Convite Colaborador - ${email} - ${Date.now()}`,
        subject: `🎉 Bem-vindo(a) à ${workshop.name} - Acesse sua conta`,
        fromName: workshop.name || 'Oficinas Master',
        fromEmail: 'noreply@oficinasmaster.com.br',
        htmlcontent: emailBody,
        textcontent: `Olá ${name}, você foi convidado para ${workshop.name}. Acesse: ${inviteLink}`,
        p: [contactResult.contact.id], // Lista de contatos (apenas este)
        sendAs: 'html'
      }
    };

    const campaignResponse = await fetch(`${AC_API_URL}/api/3/campaigns`, {
      method: 'POST',
      headers: {
        'Api-Token': AC_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(campaignData)
    });

    if (!campaignResponse.ok) {
      const errorText = await campaignResponse.text();
      console.error("❌ Erro ao criar campanha:", errorText);
      throw new Error(`Erro ao criar campanha no ActiveCampaign: ${campaignResponse.status}`);
    }

    const campaignResult = await campaignResponse.json();
    const campaignId = campaignResult.campaign.id;
    console.log("✅ Campanha criada:", campaignId);

    // 3. Enviar a campanha imediatamente
    const sendResponse = await fetch(`${AC_API_URL}/api/3/campaigns/${campaignId}/actions/send`, {
      method: 'POST',
      headers: {
        'Api-Token': AC_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!sendResponse.ok) {
      const errorText = await sendResponse.text();
      console.error("❌ Erro ao enviar campanha:", errorText);
      throw new Error(`Erro ao enviar campanha: ${sendResponse.status}`);
    }

    console.log("✅ Email enviado com sucesso via ActiveCampaign!");

    // Atualizar status do convite
    await base44.asServiceRole.entities.EmployeeInvite.update(invite.id, {
      status: 'enviado',
      last_resent_at: new Date().toISOString(),
      resent_count: (invite.resent_count || 0) + 1
    });

    return Response.json({ 
      success: true,
      message: 'Email enviado com sucesso!',
      invite_link: inviteLink
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