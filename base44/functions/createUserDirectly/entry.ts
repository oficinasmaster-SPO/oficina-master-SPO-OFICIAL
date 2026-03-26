import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const idempotencyCache = new Map();

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // 1. Validar autenticação
    let currentUser = null;
    try {
      currentUser = await base44.auth.me();
    } catch (e) {
      return Response.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Não autenticado' } }, { status: 401 });
    }
    
    if (!currentUser || !currentUser.id) {
      return Response.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Não autenticado' } }, { status: 401 });
    }

    if (currentUser.role !== 'admin') {
       return Response.json({ success: false, error: { code: 'FORBIDDEN', message: 'Apenas administradores podem convidar usuários' } }, { status: 403 });
    }

    let body;
    try {
      body = await req.json();
    } catch (e) {
      return Response.json({ success: false, error: { code: 'INVALID_INPUT', message: 'Payload inválido' } }, { status: 400 });
    }

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
      data_nascimento,
      idempotencyKey
    } = body;

    if (idempotencyKey && idempotencyCache.has(idempotencyKey)) {
      const cached = idempotencyCache.get(idempotencyKey);
      return Response.json(cached.body, { status: cached.status });
    }
    
    if (!name || typeof name !== 'string' || name.length > 255 ||
        !email || typeof email !== 'string' || email.length > 255 ||
        !workshop_id || typeof workshop_id !== 'string' ||
        !profile_id || typeof profile_id !== 'string') {
      return Response.json({ success: false, error: { code: 'MISSING_FIELDS', message: 'Campos obrigatórios ausentes ou inválidos (name, email, workshop_id, profile_id)' } }, { status: 400 });
    }

    if (currentUser.data?.workshop_id && currentUser.data?.workshop_id !== workshop_id) {
       return Response.json({ success: false, error: { code: 'FORBIDDEN', message: 'Acesso cross-tenant negado' } }, { status: 403 });
    }

    // Validação de Plano
    try {
      const existingUsers = await base44.asServiceRole.entities.User.filter({ workshop_id });
      const planCheck = await base44.functions.invoke('checkPlanAccess', {
        tenantId: workshop_id,
        feature: 'users',
        action: 'check_limit',
        currentUsage: existingUsers ? existingUsers.length : 0
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

    async function validateBusinessRules(data, context) {
      const { email, workshop_id, profile_id } = data;
      const { base44 } = context;
      
      const workshop = await base44.asServiceRole.entities.Workshop.get(workshop_id);
      if (!workshop) {
        throw { code: 'INVALID_STATE', message: 'Oficina especificada não existe' };
      }
      
      const profile = await base44.asServiceRole.entities.UserProfile.get(profile_id);
      if (!profile) {
        throw { code: 'INVALID_STATE', message: 'Perfil especificado não existe' };
      }

      const existingEmployees = await base44.asServiceRole.entities.Employee.filter({ email, workshop_id });
      if (existingEmployees && existingEmployees.length > 0) {
        throw { code: 'BUSINESS_RULE_VIOLATION', message: 'Já existe um colaborador com este email nesta oficina' };
      }
    }

    try {
      await validateBusinessRules({ email, workshop_id, profile_id }, { base44 });
    } catch (ruleError) {
      return Response.json({ success: false, error: ruleError }, { status: 400 });
    }
    
    // 4. Sanitizar payload de role enviada
    // Se quiser garantir que mesmo admin não crie outros admins inadvertidamente, você pode forçar 'user' aqui,
    // mas se for permitido admin criar admin, apenas restrinja aos dois valores.
    const safeRole = ['user', 'admin'].includes(role) ? role : 'user';

    console.log("👤 Convidando usuário:", email);
    
    // Buscar a oficina para obter a qual consultoria ela pertence (necessário no multi-tenant)
    let consulting_firm_id = null;
    let workshop_name = 'Oficinas Master Acelerador';
    try {
      const ws = await base44.asServiceRole.entities.Workshop.get(workshop_id);
      if (ws) {
        consulting_firm_id = ws.consulting_firm_id || null;
        if (ws.name) workshop_name = ws.name;
      }
    } catch(e) {
      console.error("⚠️ Aviso: Falha ao buscar dados da oficina:", e.message);
    }
    
    // O profile_id enviado é a fonte da verdade para as permissões
    const finalProfileId = profile_id;

    // Convidar usuário via Base44 usando SERVICE ROLE (não afeta sessão do admin)
    console.log("📧 Convidando usuário via Base44 com role:", safeRole);
    const inviteResult = await base44.asServiceRole.users.inviteUser(email, safeRole);
    
    console.log("✅ Convite enviado pelo Base44 (email automático) - sessão do admin mantida");

    // Gerar token de convite
    const inviteToken = Math.random().toString(36).substring(2, 15) + 
                       Math.random().toString(36).substring(2, 15);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 dias

    // Criar convite com METADADOS SEGUROS (Fonte da verdade)
    const invite = await base44.asServiceRole.entities.EmployeeInvite.create({
      workshop_id: workshop_id,
      consulting_firm_id: consulting_firm_id,
      name: name,
      email: email,
      telefone: telefone || '',
      position: position || 'Colaborador',
      area: area || 'tecnico',
      job_role: job_role || 'outros',
      profile_id: finalProfileId, // Informativo na entidade raiz
      invite_token: inviteToken,
      invite_type: 'workshop',
      expires_at: expiresAt.toISOString(),
      status: "pendente",
      metadata: { 
        // DADOS SEGUROS: Estes valores prevalecem sobre qualquer parâmetro de URL
        role: safeRole,
        company_id: workshop_id, // Alias para workshop_id conforme solicitado
        workshop_id: workshop_id,
        consulting_firm_id: consulting_firm_id,
        profile_id: finalProfileId,
        invited_at: new Date().toISOString()
      }
    });

    console.log("✅ Convite criado:", invite.id);

    // Criar Employee com os dados
    console.log("👥 Criando Employee...");
    const employee = await base44.asServiceRole.entities.Employee.create({
      workshop_id: workshop_id,
      consulting_firm_id: consulting_firm_id,
      user_id: inviteResult.id,
      full_name: name,
      email: email,
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

    // A senha será definida pelo usuário no primeiro acesso via Sign up

    // Atualizar User com dados customizados usando SERVICE ROLE (não afeta sessão)
    console.log("🔄 Atualizando dados do User...");
    const userData = {
      workshop_id: workshop_id,
      consulting_firm_id: consulting_firm_id,
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
    const inviteLink = `${inviteDomain}/PrimeiroAcesso?token=${inviteToken}&profile_id=${finalProfileId}`;

    // Disparar o Email Customizado utilizando a integração nativa
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
          Olá <strong>${name}</strong>,
        </p>

        <p style="color:#374151; font-size:14px; margin:10px 0;">
          Você foi adicionado à oficina <strong>${workshop_name}</strong>.
          Para começar, acesse a plataforma e configure sua senha.
        </p>

        <!-- BOX INFORMAÇÕES -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB; border-radius:10px; margin:20px 0;">
          <tr>
            <td style="padding:14px; font-size:14px; color:#111827;">
              <p style="margin:6px 0;"><strong>Email:</strong> ${email}</p>
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
            to: [email],
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
          to: email,
          subject: `Convite de Acesso - ${workshop_name}`,
          body: emailHtml
        });
      }
    } catch (e) {
      console.error("⚠️ Erro ao enviar email HTML customizado:", e);
    }

    console.log(JSON.stringify({
      level: 'AUDIT',
      userId: currentUser.id,
      action: 'CREATE',
      entity: 'Employee/User',
      before: null,
      after: { email, workshop_id, profile_id },
      timestamp: new Date().toISOString()
    }));

    const responseBody = { 
      success: true,
      data: {
        message: 'Usuário criado e E-mail de convite enviado.',
        user_id: inviteResult.id,
        email: email,
        profile_id: finalProfileId,
        invite_link: inviteLink,
        invite_id: invite.id,
        employee_id: employee.id
      }
    };

    if (idempotencyKey) {
      idempotencyCache.set(idempotencyKey, { body: responseBody, status: 200 });
      setTimeout(() => idempotencyCache.delete(idempotencyKey), 5 * 60 * 1000);
    }

    return Response.json(responseBody);

  } catch (error) {
    console.error(JSON.stringify({
      level: 'ERROR',
      action: 'CREATE_USER_DIRECTLY',
      message: error.message,
      timestamp: new Date().toISOString()
    }));
    return Response.json({ 
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Erro interno no servidor' }
    }, { status: 500 });
  }
});