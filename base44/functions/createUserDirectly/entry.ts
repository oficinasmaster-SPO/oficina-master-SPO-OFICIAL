import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Validar autenticação SEM alterar sessão
    let currentUser = null;
    try {
      currentUser = await base44.auth.me();
    } catch (e) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }
    
    if (!currentUser) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await req.json();
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
      data_nascimento 
    } = body;
    
    // Validação estrita: profile_id agora é obrigatório para garantir permissões corretas
    if (!name || !email || !workshop_id || !profile_id) {
      return Response.json({ error: 'Nome, email, workshop_id e profile_id são obrigatórios' }, { status: 400 });
    }
    
    if (!['user', 'admin'].includes(role)) {
      return Response.json({ error: 'Role deve ser "user" ou "admin"' }, { status: 400 });
    }

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
    console.log("📧 Convidando usuário via Base44 com role:", role);
    const inviteResult = await base44.asServiceRole.users.inviteUser(email, role);
    
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
        role: role,
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
    const inviteLink = `${inviteDomain}/PrimeiroAcesso?token=${invite.invite_token}&profile_id=${finalProfileId}`;

    // Disparar o Email Customizado utilizando a integração nativa
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #2563eb; color: white; padding: 24px; text-align: center;">
          <h2 style="margin: 0; font-size: 20px;">Bem-vindo à ${workshop_name}!</h2>
        </div>
        <div style="padding: 24px; background-color: #f9fafb; color: #374151;">
          <p>Olá <strong>${name}</strong>,</p>
          <p>Você foi convidado(a) para fazer parte da equipe <strong>${workshop_name}</strong>.</p>
          
          <div style="background-color: white; border-left: 4px solid #2563eb; padding: 16px; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>📧 Email:</strong> ${email}</p>
            <p style="margin: 4px 0;"><strong>🔑 Senha:</strong> Você criará sua senha no primeiro acesso (Use a opção Criar conta / Sign up)</p>
            <p style="margin: 4px 0;"><strong>⏰ Validade:</strong> 7 dias</p>
          </div>
          
          <p>Para completar seu cadastro e acessar a plataforma, clique no botão abaixo:</p>
          
          <div style="text-align: center; margin: 24px 0;">
            <a href="${inviteLink}" style="background-color: #2563eb; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Acessar Plataforma</a>
          </div>
          
          <div style="background-color: white; border: 1px solid #e5e7eb; padding: 16px; border-radius: 6px; font-size: 14px;">
            <p style="margin-top: 0; margin-bottom: 8px;">Ou copie e cole este link no seu navegador:</p>
            <p style="margin: 0; color: #2563eb; word-break: break-all; background-color: #f9fafb; padding: 12px; border: 1px solid #e5e7eb; border-radius: 4px; font-family: monospace;">
              ${inviteLink}
            </p>
          </div>
          
          <p style="font-size: 14px; margin-top: 24px;"><strong>Importante:</strong> Por segurança, você deverá alterar sua senha no primeiro acesso.</p>
        </div>
        <div style="background-color: #f3f4f6; padding: 16px; text-align: center; font-size: 12px; color: #6b7280;">
          <p style="margin: 4px 0;">Este é um email automático. Em caso de dúvidas, entre em contato com o administrador.</p>
          <p style="margin: 4px 0;">&copy; ${new Date().getFullYear()} ${workshop_name}. Todos os direitos reservados.</p>
        </div>
      </div>
    `;

    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: `Convite de Acesso - ${workshop_name}`,
        body: emailHtml
      });
      console.log("✅ Email HTML customizado enviado com sucesso!");
    } catch (e) {
      console.error("⚠️ Erro ao enviar email HTML customizado:", e);
    }

    return Response.json({ 
      success: true,
      message: 'Usuário criado e E-mail de convite enviado.',
      user_id: inviteResult.id,
      email: email,
      profile_id: finalProfileId,
      invite_link: inviteLink,
      invite_id: invite.id,
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