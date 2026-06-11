import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

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

    console.log("👤 Criando colaborador e usuário por convite:", email);

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

    // 1b. Gerar ID sequencial para o colaborador e Profile ID automático
    const idResponse = await base44.functions.invoke('generateEmployeeId', { workshop_id: workshop_id });
    
    if (!idResponse.data.success) {
      console.warn("⚠️ Aviso: Não foi possível gerar ID do colaborador");
    }

    const employeeId = idResponse.data?.employee_id || null;

    // P2 FIX (2026-06-10): substituído profile_id = 'workshopId.01' (string não-UUID) por
    // busca do perfil canônico via job_role. O valor antigo causava UserProfile.get('001.01')
    // → 404 silencioso → permissions=[]. Agora usa JOB_ROLE_TO_PROFILE_ID (IDs fixos).
    const JOB_ROLE_TO_PROFILE_ID = {
      'socio':            '6a272f8ea3fa8dd02ca7350e',
      'diretor':          '6a272f8a983951dfc5cf3493',
      'gerente':          '6a272f8976cba10c3232779a',
      'supervisor_loja':  '6a272f91b92f3d2dfe6344be',
      'rh':               '6a272f883b2162c800073ace',
      'financeiro':       '6a285fc9f76402dd73736656',
      'administrativo':   '6a285fc9f76402dd73736656',
      'lider_tecnico':    '6a272f85fc4b85767f964421',
      'comercial':        '6a272f96bc6eedd434194fcf',
      'consultor_vendas': '6a272f96bc6eedd434194fcf',
      'marketing':        '6a272f99aaeffc72c503fa5e',
      'consultor':        '6a272f95957fe29d2e8a888a',
    };
    const FALLBACK_PROFILE_ID = '6a272f876b16129b2f5f31be'; // Técnico - Acesso Operacional
    const resolvedProfileId = (profile_id && profile_id.length === 24)
      ? profile_id  // ID UUID válido passado pelo chamador
      : (JOB_ROLE_TO_PROFILE_ID[job_role] || FALLBACK_PROFILE_ID);

    // 2. Criar Employee com profile_id canônico (UUID válido)
    const employee = await base44.asServiceRole.entities.Employee.create({
      identificador: employeeId,
      full_name: name,
      email: email,
      telefone: telefone || '',
      position: position || 'Colaborador',
      area: area || 'tecnico',
      job_role: job_role || 'outros',
      status: 'ativo',
      tipo_vinculo: 'interno',
      is_internal: true,
      workshop_id: workshop_id,
      profile_id: resolvedProfileId,
      user_status: 'ativo',
      hire_date: new Date().toISOString().split('T')[0]
    });

    console.log("✅ Employee criado:", employee.id);

    // 3. Criar registro de convite no sistema
    let inviteId;
    try {
      const inviteToken = Math.random().toString(36).substring(2, 15) + 
                         Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 dias

      const invite = await base44.asServiceRole.entities.EmployeeInvite.create({
        workshop_id: workshop_id,
        employee_id: employee.id,
        name: name,
        email: email,
        telefone: telefone || '',
        position: position || 'Colaborador',
        area: area || 'tecnico',
        job_role: job_role || 'outros',
        profile_id: resolvedProfileId,
        invite_token: inviteToken,
        invite_type: 'workshop',
        expires_at: expiresAt.toISOString(),
        status: "pendente",
        metadata: { role: role }
      });

      inviteId = invite.id;
      console.log("✅ Convite criado no sistema");
    } catch (inviteDbError) {
      console.error("⚠️ Erro ao criar convite no banco:", inviteDbError.message);
    }

    // 4. CRIAR USER E DEIXAR A AUTOMAÇÃO FAZER O MERGE
    try {
      console.log("👤 [PASSO 1] Criando User com base44.users.inviteUser...");
      console.log("   Email:", email, "| Role:", role);
      
      // Criar usuário no Base44
      await base44.users.inviteUser(email, role);
      console.log(`✅ [PASSO 1] Comando de inviteUser enviado com role: ${role}`);
      console.log(`✅ [PASSO 2] A atualização complementar do usuário (workshop_id, profile, etc) e vínculo com Employee será feita automaticamente pela Automação de Backend (createEmployeeOnUserCreation) engatilhada no evento 'create' da entidade User.`);
      
    } catch (userError) {
      console.error("❌ [ERRO CRÍTICO] Falha ao solicitar criação de User:");
      console.error("   Mensagem:", userError.message);
      
      return Response.json({ 
        success: false,
        error: 'Falha ao iniciar criação do usuário no sistema',
        details: userError.message,
        employee_created: true,
        employee_id: employee.id
      }, { status: 500 });
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
      ? `${inviteDomain}/PrimeiroAcesso?token=${invite.invite_token}&workshop_id=${workshop_id}&profile_id=${resolvedProfileId}&employee_id=${employee.id}`
      : `${inviteDomain}/PrimeiroAcesso`;

    console.log("🔗 Convite encontrado:", invite?.invite_token, "Link:", inviteLink);

    // ⏸️ ENVIO DE EMAIL DESABILITADO - Focar em WhatsApp
    console.log("📱 Link disponível para compartilhar via WhatsApp");
    const emailStatus = 'desabilitado - usar WhatsApp';

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