import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const { employee_id } = body;
    
    if (!employee_id) {
      return Response.json({ error: 'ID do colaborador obrigatório' }, { status: 400 });
    }

    console.log("🔄 Reenviando convite para:", employee_id);

    // Buscar Employee
    let employee;
    try {
      employee = await base44.asServiceRole.entities.Employee.get(employee_id);
    } catch (err) {
      console.error("Erro ao buscar Employee:", err.message);
      return Response.json({ error: 'Colaborador não encontrado' }, { status: 404 });
    }
    
    if (!employee) {
      return Response.json({ error: 'Colaborador não encontrado' }, { status: 404 });
    }

    // Buscar convite existente
    const existingInvites = await base44.asServiceRole.entities.EmployeeInvite.filter({ 
      employee_id: employee_id 
    });

    let invite;
    
    if (existingInvites && existingInvites.length > 0) {
      // Atualizar convite existente - GERAR NOVO TOKEN
      invite = existingInvites[0];
      
      // Gerar novo invite_token aleatório
      const newInviteToken = Math.random().toString(36).substring(2, 15) + 
                            Math.random().toString(36).substring(2, 15);
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      
      await base44.asServiceRole.entities.EmployeeInvite.update(invite.id, {
        invite_token: newInviteToken,
        status: 'enviado',
        expires_at: expiresAt.toISOString(),
        resent_count: (invite.resent_count || 0) + 1,
        last_resent_at: new Date().toISOString()
      });
      
      // Atualizar o objeto invite com o novo token para usar na construção do link
      invite.invite_token = newInviteToken;
      
      console.log("✅ Convite atualizado com novo token:", newInviteToken);

      // RESETAR SENHA SE O USUÁRIO EXISTIR
      if (employee.user_id) {
        console.log("🔐 Resetando senha para 'Oficina@2026'...");
        const apiUrl = `https://base44.app/api/apps/${Deno.env.get('BASE44_APP_ID')}/users/${employee.user_id}/password`;
        
        try {
          const passResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-base44-key': Deno.env.get('BASE44_SERVICE_ROLE_KEY')
            },
            body: JSON.stringify({ password: "Oficina@2026" })
          });
          
          if (!passResponse.ok) {
            console.error("⚠️ Falha ao resetar senha:", await passResponse.text());
          } else {
            console.log("✅ Senha resetada com sucesso");
          }
        } catch (e) {
          console.error("⚠️ Erro ao chamar API de senha:", e);
        }
      }

    } else {
      // Criar novo convite
      const inviteToken = Math.random().toString(36).substring(2, 15) + 
                         Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      invite = await base44.asServiceRole.entities.EmployeeInvite.create({
        workshop_id: employee.workshop_id,
        employee_id: employee.id,
        name: employee.full_name || employee.name,
        email: employee.email,
        position: employee.position,
        area: employee.area,
        job_role: employee.job_role,
        profile_id: employee.profile_id,
        invite_token: inviteToken,
        invite_type: 'workshop',
        expires_at: expiresAt.toISOString(),
        status: "enviado"
      });
      
      // Ensure the token is bound correctly for the response
      invite.invite_token = inviteToken;

      console.log("✅ Novo convite criado");
    }

    // Gerar link de convite com domínio correto + workshop_id para rastreamento
    const inviteDomain = `https://oficinasmastergtr.com`;
    // Usa o token que acabou de ser gerado ou o atual do banco
    const currentToken = invite.invite_token;
    const inviteLink = `${inviteDomain}/PrimeiroAcesso?token=${currentToken}&profile_id=${employee.profile_id}`;

    console.log("🔗 Link gerado para reenvio:", inviteLink);
    console.log("🔑 Token utilizado:", currentToken);

    let workshop_name = 'Oficinas Master Acelerador';
    try {
      const ws = await base44.asServiceRole.entities.Workshop.get(employee.workshop_id);
      if (ws && ws.name) workshop_name = ws.name;
    } catch(e) {}

    const emailHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Convite - Oficinas Master</title>
</head>

<body style="margin:0; padding:0; background:#F4F6F8; font-family:Arial, sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6F8;">
  <tr>
    <td align="center">

  <!-- CONTAINER -->
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; background:#FFFFFF; border-radius:12px; overflow:hidden;">

    <!-- HEADER -->
    <tr>
      <td style="background:linear-gradient(135deg,#0F172A,#1E293B); padding:20px; text-align:center; color:#FFFFFF;">
        <h2 style="margin:0; font-size:20px;">Oficinas Master</h2>
        <p style="margin:4px 0 0; font-size:12px; opacity:0.8;">
          Sistema de Gestão para Oficinas
        </p>
      </td>
    </tr>

    <!-- CONTEÚDO -->
    <tr>
      <td style="padding:20px;">

        <h2 style="margin-top:0; color:#111827; font-size:20px;">
          Seu acesso foi liberado
        </h2>

        <p style="color:#374151; font-size:14px; margin:10px 0;">
          Olá <strong>${employee.full_name || employee.name}</strong>,
        </p>

        <p style="color:#374151; font-size:14px; margin:10px 0;">
          Você foi adicionado à oficina <strong>${workshop_name}</strong>.
          Para começar, acesse a plataforma e configure sua senha.
        </p>

        <!-- BOX INFORMAÇÕES -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB; border-radius:10px; margin:20px 0;">
          <tr>
            <td style="padding:14px; font-size:14px; color:#111827;">
              <p style="margin:6px 0;"><strong>Email:</strong> ${employee.email}</p>
              <p style="margin:6px 0;"><strong>Acesso inicial:</strong> criar senha no primeiro login</p>
              <p style="margin:6px 0;"><strong>Validade do convite:</strong> 7 dias</p>
            </td>
          </tr>
        </table>

        <!-- BOTÃO -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:25px 0;">
          <tr>
            <td align="center">
              <a href="${inviteLink}"
                 style="display:block; width:100%; max-width:320px; margin:auto; background:#EF4444; color:#FFFFFF; padding:14px; border-radius:8px; text-decoration:none; font-weight:bold; font-size:14px;">
                 Acessar Plataforma
              </a>
            </td>
          </tr>
        </table>

        <!-- LINK ALTERNATIVO -->
        <p style="font-size:12px; color:#6B7280; margin-bottom:6px;">
          Se o botão não funcionar, copie e cole o link abaixo:
        </p>

        <p style="font-size:12px; background:#F3F4F6; padding:10px; border-radius:6px; word-break:break-all; color:#111827;">
          ${inviteLink}
        </p>

        <!-- AVISO -->
        <p style="font-size:12px; color:#6B7280; margin-top:20px;">
          Por segurança, recomendamos alterar sua senha após o primeiro acesso.
        </p>
      </td>
    </tr>
    <!-- FOOTER -->
    <tr>
        <td style="background:#F9FAFB; padding:16px; text-align:center; font-size:12px; color:#6B7280;">
          © 2026 Oficinas Master • Sistema de Gestão para Oficinas<br>
          Este é um e-mail automático. Não responda.
        </td>
    </tr>
  </table>

    </td>
  </tr>
</table>

</body>
</html>`;

    try {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      let resendFailed = false;

      if (RESEND_API_KEY) {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'Oficinas Master <onboarding@resend.dev>',
            to: [employee.email],
            subject: `Convite de Acesso - ${workshop_name}`,
            html: emailHtml
          })
        });
        
        const data = await response.json();
        if (!response.ok) {
          console.error("❌ Erro Resend:", data);
          resendFailed = true;
        } else {
          console.log("✅ Email HTML enviado com sucesso via Resend! ID:", data.id);
        }
      }
      
      if (!RESEND_API_KEY || resendFailed) {
        console.warn("⚠️ Fallback: Usando Core.SendEmail...");
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: employee.email,
          subject: `Convite de Acesso - ${workshop_name}`,
          body: emailHtml
        });
      }
    } catch (e) {
      console.error("⚠️ Erro ao enviar email HTML no reenvio:", e);
    }

    return Response.json({ 
      success: true,
      message: 'Convite reenviado com sucesso!',
      email: employee.email,
      temporary_password: "Oficina@2026",
      invite_link: inviteLink,
      invite_token: invite.invite_token,
      action: 'resent'
    });

  } catch (error) {
    console.error("❌ Erro:", error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});