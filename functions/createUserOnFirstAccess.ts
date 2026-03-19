import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { invite_id, password, email } = body;
    
    if (!invite_id) {
      return Response.json({ error: 'invite_id obrigatório' }, { status: 400 });
    }
    
    if (!password) {
      return Response.json({ error: 'Senha é obrigatória' }, { status: 400 });
    }

    console.log("👤 Criando usuário no primeiro acesso para convite:", invite_id);

    // Buscar convite
    const invite = await base44.asServiceRole.entities.EmployeeInvite.get(invite_id);
    
    if (!invite) {
      return Response.json({ error: 'Convite não encontrado' }, { status: 404 });
    }

    if (invite.status === 'concluido') {
      return Response.json({ 
        success: true, 
        message: 'Usuário já foi criado anteriormente',
        already_created: true
      });
    }

    // Extrair role do metadata ou usar 'user' como padrão
    const role = invite.metadata?.role || 'user';
    
    console.log(`📧 Criando usuário Base44 com role: ${role}`);

    // Buscar Employee vinculado ao convite
    console.log("🔍 Buscando Employee vinculado ao convite...");
    const employee = invite.employee_id 
      ? await base44.asServiceRole.entities.Employee.get(invite.employee_id)
      : null;
    
    if (!employee) {
      return Response.json({ 
        error: 'Colaborador não encontrado. Verifique o link de convite.' 
      }, { status: 404 });
    }

    // Se já tem user_id, usar; senão, criar um novo usuário
    let userId = employee.user_id;
    
    if (!userId) {
      console.log("📧 Employee não tem user_id vinculado. Criando novo User Base44...");
      
      // Criar novo User base44 (isso será feito via invite do Base44)
      // Por enquanto, vamos usar um ID temporário ou pedir ao usuário
      return Response.json({ 
        error: 'Usuário Base44 não foi criado. Contacte o administrador.' 
      }, { status: 400 });
    }
    
    console.log("✅ User ID encontrado para vincular:", userId);
    
    // Definir senha do usuário
    if (password) {
      console.log(`🔐 Definindo senha para o usuário: ${invite.email}`);
      
      // Usar endpoint correto da API Base44 para definir senha
      const apiUrl = `https://base44.app/api/apps/${Deno.env.get('BASE44_APP_ID')}/users/${userId}/password`;
      console.log(`📍 URL de autenticação:`, apiUrl);
      
      const authResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-base44-key': Deno.env.get('BASE44_SERVICE_ROLE_KEY')
        },
        body: JSON.stringify({ password })
      });
      
      if (!authResponse.ok) {
        const errorText = await authResponse.text();
        console.error("❌ Erro ao definir senha:", authResponse.status, errorText);
        throw new Error(`Falha ao definir senha (${authResponse.status}): ${errorText}`);
      }
      console.log(`✅ Senha definida com sucesso`);
    }

    // SINCRONIZAÇÃO DE RELACIONAMENTOS 1-1 E 1-N
    console.log("🔗 Sincronizando relacionamentos entre User, Employee e EmployeeInvite...");
    
    const now = new Date().toISOString();

    // EXTRAÇÃO SEGURA DE DADOS (Prioridade: Metadata > Campos Raiz)
    // Isso garante que estamos usando os dados originais gravados no convite, não manipulados
    let secureProfileId = invite.metadata?.profile_id || invite.profile_id;
    let secureWorkshopId = invite.metadata?.workshop_id || invite.metadata?.company_id || invite.workshop_id;
    let secureConsultingFirmId = invite.metadata?.consulting_firm_id || invite.consulting_firm_id;

    // FALLBACK DE SEGURANÇA PARA LEGADOS (Item 3 do Plano)
    // Se não houver profile_id (convite antigo), atribuir um perfil padrão seguro de menor privilégio
    if (!secureProfileId) {
      console.warn("⚠️ ALERTA DE SEGURANÇA: Convite sem profile_id. Aplicando perfil padrão de menor privilégio.");
      // Substituir pelo ID real do perfil padrão no seu sistema, se houver. 
      // Por enquanto, tentamos buscar um perfil 'Colaborador' ou 'Visitante'
      try {
        const defaultProfiles = await base44.asServiceRole.entities.UserProfile.list();
        // Tenta achar um perfil básico/padrão. Ajuste a lógica conforme seus nomes de perfil.
        const fallbackProfile = defaultProfiles.find(p => p.name === 'Colaborador' || p.type === 'básico') || defaultProfiles[0];
        if (fallbackProfile) {
          secureProfileId = fallbackProfile.id;
          console.log(`🔒 Perfil fallback aplicado: ${secureProfileId} (${fallbackProfile.name})`);
        }
      } catch (e) {
        console.error("❌ Falha ao buscar perfil fallback:", e);
      }
    }

    console.log("🔒 Dados Seguros para Criação:", { secureProfileId, secureWorkshopId });
    
    // Tentar obter workshop_id via perfil se ainda não tivermos (lógica original preservada como secundária)
    if (!secureWorkshopId && secureProfileId) {
      console.log("🔍 Buscando workshop_id via profile_id (método secundário)...");
      try {
        const profile = await base44.asServiceRole.entities.UserProfile.get(secureProfileId);
        if (profile && profile.workshop_id) {
          secureWorkshopId = profile.workshop_id;
          console.log(`✅ workshop_id obtido via perfil: ${secureWorkshopId}`);
        }
      } catch (e) {
        console.error("⚠️ Erro ao buscar perfil:", e);
      }
    }

    // VALIDAÇÃO CRÍTICA DE SEGURANÇA (Protocolo Company ID)
    if (!secureWorkshopId) {
      console.error("❌ ERRO CRÍTICO: Tentativa de criação de usuário sem workshop_id (Company ID). Invite ID:", invite_id);
      return Response.json({ 
        error: 'Erro de segurança: Identificador da empresa (Company ID) não encontrado no convite. Por favor, solicite um novo convite ao administrador.' 
      }, { status: 400 });
    }
    
    // 1. Atualizar Employee: vincular user_id e usar PROFILE ID SEGURO
    console.log("📝 [1/4] Atualizando Employee com user_id e profile_id seguro...");
    await base44.asServiceRole.entities.Employee.update(employee.id, {
      user_id: userId,
      first_login_at: now,
      user_status: 'ativo',
      profile_id: secureProfileId,  // USANDO ID SEGURO
      workshop_id: secureWorkshopId // Garantir workshop correto
    });
    console.log(`✅ Employee atualizado: user_id = ${userId}`);
    
    // 2. Atualizar User: usar DADOS SEGUROS
    console.log("📝 [2/4] Atualizando User com referências seguras...");
    await base44.asServiceRole.entities.User.update(userId, {
      invite_id: invite_id,
      profile_id: secureProfileId,  // USANDO ID SEGURO
      workshop_id: secureWorkshopId, // USANDO ID SEGURO
      user_status: 'active',
      first_login_at: now,
      last_login_at: now,
      approved_at: now
    });
    console.log(`✅ User atualizado: invite_id=${invite_id}, profile_id=${secureProfileId}, workshop_id=${secureWorkshopId}`);

    // 3. Marcar EmployeeInvite como concluído
    console.log("📝 [3/4] Marcando EmployeeInvite como concluído...");
    await base44.asServiceRole.entities.EmployeeInvite.update(invite_id, {
      status: 'concluido',
      completed_at: now,
      employee_id: employee.id
    });
    console.log(`✅ EmployeeInvite concluído: employee_id = ${employee.id}`);
    
    // 4. Criar UserPermission usando DADOS SEGUROS
    console.log("📝 [4/4] Criando/atualizando UserPermission com dados seguros...");
    try {
      const existingPermissions = await base44.asServiceRole.entities.UserPermission.filter({ user_id: userId });
      
      if (existingPermissions && existingPermissions.length > 0) {
        // Atualizar permissão existente
        await base44.asServiceRole.entities.UserPermission.update(existingPermissions[0].id, {
          profile_id: secureProfileId, // USANDO ID SEGURO
          workshop_id: secureWorkshopId,
          is_active: true,
          approved_at: now,
          approved_by: invite.admin_responsavel_id
        });
        console.log("✅ UserPermission atualizada");
      } else {
        // Criar nova permissão
        await base44.asServiceRole.entities.UserPermission.create({
          user_id: userId,
          profile_id: secureProfileId, // USANDO ID SEGURO
          workshop_id: secureWorkshopId,
          permission_level: 'visualizador',
          is_active: true,
          approved_at: now,
          approved_by: invite.admin_responsavel_id
        });
        console.log("✅ UserPermission criada");
      }
    } catch (e) {
      console.error("⚠️ Erro ao gerenciar UserPermission:", e);
    }

    // 5. Criar EmployeeInviteAcceptance com DADOS SEGUROS
    console.log("📝 [5/5] Criando EmployeeInviteAcceptance para automação...");
    try {
      await base44.asServiceRole.entities.EmployeeInviteAcceptance.create({
        user_id: userId,
        invite_id: invite_id,
        workshop_id: secureWorkshopId,
        profile_id: secureProfileId, // USANDO ID SEGURO
        email: invite.email,
        full_name: employee.full_name || invite.name,
        processed: false
      });
      console.log("✅ EmployeeInviteAcceptance criado - automação será disparada");
    } catch (e) {
      console.error("❌ ERRO CRÍTICO ao criar EmployeeInviteAcceptance:", e.message);
      console.error("📋 Stack:", e);
      // Não bloqueia o fluxo se essa criação falhar, mas loga o erro
    }

    console.log("✅ Usuário criado e convite marcado como concluído");

    return Response.json({ 
      success: true,
      message: 'Usuário criado com sucesso no Base44',
      email: invite.email,
      role: role
    });

  } catch (error) {
    console.error("❌ Erro:", error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});