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

    // PRE-1 (2026-06-10): Guard 'admin only' removido.
    // Sócios, gerentes e diretores (role='user') precisam cadastrar colaboradores.
    // Controle de acesso via RBAC no frontend (hasPermission('employees.create')).

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
      consulting_firm_id: bodyConsultingFirmId,
      role = "user",
      data_nascimento,
      idempotencyKey,
      // PRE-3: campos RH para paridade com registerEmployeeComplete
      cpf,
      rg,
      hire_date,
      salary,
      commission,
      bonus,
      benefits,
      production_parts,
      production_parts_sales,
      production_services,
      production_percentage,
      endereco,
      profile_picture_url,
      job_description_id
    } = body;

    if (idempotencyKey && idempotencyCache.has(idempotencyKey)) {
      const cached = idempotencyCache.get(idempotencyKey);
      return Response.json(cached.body, { status: cached.status });
    }
    
    if (!name || typeof name !== 'string' || name.length > 255 ||
        !email || typeof email !== 'string' || email.length > 255) {
      return Response.json({ success: false, error: { code: 'MISSING_FIELDS', message: 'Campos obrigatórios ausentes ou inválidos (name, email)' } }, { status: 400 });
    }

    // Para usuário interno: consulting_firm_id é obrigatório (sem workshop)
    // Para usuário externo: workshop_id é obrigatório
    const isInternalUser = !workshop_id && !!bodyConsultingFirmId;
    if (!workshop_id && !bodyConsultingFirmId) {
      return Response.json({ success: false, error: { code: 'MISSING_FIELDS', message: 'Informe workshop_id (externo) ou consulting_firm_id (interno)' } }, { status: 400 });
    }

    async function validateBusinessRules(data, context) {
      const { email, workshop_id, profile_id, isInternalUser } = data;
      const { base44 } = context;
      
      // Só valida workshop se for usuário externo
      if (!isInternalUser) {
        const workshop = await base44.asServiceRole.entities.Workshop.get(workshop_id);
        if (!workshop) {
          throw { code: 'INVALID_STATE', message: 'Oficina especificada não existe' };
        }
      }
      
      if (profile_id) {
        const profile = await base44.asServiceRole.entities.UserProfile.get(profile_id);
        if (!profile) {
          throw { code: 'INVALID_STATE', message: 'Perfil especificado não existe' };
        }
      }

      // Verifica duplicidade por email
      const filterField = isInternalUser ? {} : { workshop_id };
      const existingEmployees = await base44.asServiceRole.entities.Employee.filter({ email, ...filterField });
      if (existingEmployees && existingEmployees.length > 0) {
        throw { code: 'BUSINESS_RULE_VIOLATION', message: 'Já existe um colaborador com este email' };
      }
    }

    // Se profile_id não foi enviado, busca perfil compatível como fallback
    let finalProfileIdResolved = profile_id;
    if (!finalProfileIdResolved) {
      try {
        const profileType = isInternalUser ? 'interno' : 'externo';
        const profiles = await base44.asServiceRole.entities.UserProfile.filter({ type: profileType, status: 'ativo' });
        if (profiles && profiles.length > 0) {
          finalProfileIdResolved = profiles[0].id;
          console.log("📋 Profile_id resolvido automaticamente:", finalProfileIdResolved);
        }
      } catch(e) {
        console.warn("⚠️ Não foi possível resolver profile_id automaticamente:", e.message);
      }
    }

    try {
      await validateBusinessRules({ email, workshop_id, profile_id: finalProfileIdResolved, isInternalUser }, { base44 });
    } catch (ruleError) {
      return Response.json({ success: false, error: ruleError }, { status: 400 });
    }
    
    // 4. Sanitizar payload de role enviada
    // Se quiser garantir que mesmo admin não crie outros admins inadvertidamente, você pode forçar 'user' aqui,
    // mas se for permitido admin criar admin, apenas restrinja aos dois valores.
    const safeRole = 'user'; // Colaboradores sempre criados como 'user' — nunca admin

    console.log("👤 Convidando usuário:", email);
    
    // Determinar consulting_firm_id e nome da organização
    let consulting_firm_id = bodyConsultingFirmId || null;
    let workshop_name = 'Oficinas Master Acelerador';
    
    if (!isInternalUser && workshop_id) {
      // Usuário externo: busca dados da oficina
      try {
        const ws = await base44.asServiceRole.entities.Workshop.get(workshop_id);
        if (ws) {
          consulting_firm_id = ws.consulting_firm_id || consulting_firm_id;
          if (ws.name) workshop_name = ws.name;
        }
      } catch(e) {
        console.error("⚠️ Aviso: Falha ao buscar dados da oficina:", e.message);
      }
    } else if (isInternalUser && consulting_firm_id) {
      // Usuário interno: busca nome da consultoria
      try {
        const firm = await base44.asServiceRole.entities.ConsultingFirm.get(consulting_firm_id);
        if (firm?.name) workshop_name = firm.name;
      } catch(e) {
        console.warn("⚠️ Aviso: Falha ao buscar nome da consultoria:", e.message);
      }
    }
    
    // O profile_id resolvido é a fonte da verdade para as permissões
    const finalProfileId = finalProfileIdResolved || profile_id;

    // Convidar usuário via Base44 usando SERVICE ROLE (não afeta sessão do admin)
    console.log("📧 Convidando usuário via Base44 com role:", safeRole);
    // Verificar se User já existe no sistema antes de chamar inviteUser
    // inviteUser lança "User not found" se o email já existe na plataforma Base44
    let inviteResult = null;
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email: email });
    
    if (existingUsers && existingUsers.length > 0) {
      // User já existe — reutilizar o ID existente
      inviteResult = existingUsers[0];
      console.log("ℹ️ User já existe no sistema, reutilizando:", inviteResult.id);
      
      // Verificar se já pertence a outra oficina
      if (!isInternalUser && inviteResult.workshop_id && inviteResult.workshop_id !== workshop_id) {
        return Response.json({ 
          success: false, 
          error: { 
            code: 'BUSINESS_RULE_VIOLATION',
            message: 'Este e-mail já está vinculado a outra oficina.' 
          }
        }, { status: 400 });
      }
    } else {
      // User não existe — criar via inviteUser
      console.log("🆕 Criando novo User para:", email);
      inviteResult = await base44.users.inviteUser(email, safeRole);
      
      if (!inviteResult?.id) {
        throw new Error(`Falha ao criar usuário: resposta inválida para o email ${email}`);
      }
      console.log("✅ User criado via inviteUser:", inviteResult.id);
    }
    
    console.log("✅ User pronto — sessão do admin mantida");

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
      status: "enviado",
      metadata: { 
        role: safeRole,
        // Campos lidos por createUserOnFirstAccess para resolver workshop/profile
        profile_id: finalProfileId,
        workshop_id: workshop_id,
        company_id: workshop_id,
        consulting_firm_id: consulting_firm_id,
        invited_at: new Date().toISOString()
      }
    });

    console.log("✅ Convite criado:", invite.id);

    // Criar Employee com os dados
    // PRE-2: Atualizar Workshop.partner_ids quando job_role='socio'
    if (job_role === 'socio' && workshop_id) {
      try {
        const ws = await base44.asServiceRole.entities.Workshop.get(workshop_id);
        if (ws) {
          const currentPartnerIds = ws.partner_ids || [];
          if (!currentPartnerIds.includes(inviteResult.id)) {
            await base44.asServiceRole.entities.Workshop.update(workshop_id, {
              partner_ids: [...currentPartnerIds, inviteResult.id]
            });
            console.log("✅ [PRE-2] Workshop.partner_ids atualizado para sócio");
          }
        }
      } catch(e) {
        console.warn("⚠️ [PRE-2] Erro ao atualizar partner_ids:", e.message);
      }
    }

    console.log("👥 Criando Employee...");
    const employee = await base44.asServiceRole.entities.Employee.create({
      workshop_id: isInternalUser ? null : workshop_id,
      consulting_firm_id: consulting_firm_id,
      user_id: inviteResult.id,
      full_name: name,
      email: email,
      telefone: telefone || '',
      position: position || 'Colaborador',
      job_role: job_role || 'outros',
      area: area || 'administrativo',
      profile_id: finalProfileId,
      user_status: 'inativo', // aguarda aceite do convite
      user_type: isInternalUser ? 'internal' : 'external',
      is_internal: isInternalUser,
      tipo_vinculo: isInternalUser ? 'interno' : 'cliente',
      admin_responsavel_id: currentUser.id,
      hire_date: hire_date || new Date().toISOString().split('T')[0],
      data_nascimento: data_nascimento || null,
      // PRE-3: campos RH
      cpf: cpf || null,
      rg: rg || null,
      salary: salary || 0,
      commission: commission || 0,
      bonus: bonus || 0,
      benefits: benefits || [],
      production_parts: production_parts || 0,
      production_parts_sales: production_parts_sales || 0,
      production_services: production_services || 0,
      production_percentage: production_percentage || 0,
      endereco: endereco || null,
      profile_picture_url: profile_picture_url || null,
      job_description_id: job_description_id || null,
      status: 'ativo'
    });

    console.log("✅ Employee criado:", employee.id);

    // A senha será definida pelo usuário no primeiro acesso via Sign up

    // Atualizar User com dados customizados usando SERVICE ROLE (não afeta sessão)
    console.log("🔄 Atualizando dados do User...");
    // PRE-5: User.profile_id, User.job_role, User.is_internal removidos — campos deprecated.
    // Autorização via Employee.profile_id → UserProfile.roles (fonte canônica).
    const userData = {
      workshop_id: isInternalUser ? null : workshop_id,
      consulting_firm_id: consulting_firm_id,
      position: position || 'Colaborador',
      area: area || 'administrativo',
      telefone: telefone || '',
      hire_date: hire_date || new Date().toISOString().split('T')[0],
      user_type: isInternalUser ? 'internal' : 'external',
      // user_status removido: User schema não tem este campo (ignorado silenciosamente)
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
    console.error('❌ ERRO DETALHADO createUserDirectly:', error?.message, error?.stack);
    return Response.json({ 
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error?.message || 'Erro interno no servidor' }
    }, { status: 500 });
  }
});