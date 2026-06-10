import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const summaryOnly = body.summary_only === true;
    const categoryFilter = body.category_filter || null;
    
    // ── ETAPA 1: Buscar todos os Users ativos ──
    const allUsers = [];
    let skip = 0;
    const limit = 200;
    let hasMore = true;
    
    while (hasMore) {
      const batch = await base44.asServiceRole.entities.User.list('-created_date', limit, skip);
      if (!batch || batch.length === 0) { hasMore = false; break; }
      allUsers.push(...batch);
      skip += batch.length;
      if (batch.length < limit) hasMore = false;
    }
    
    // Filtrar apenas ativos (não disabled, não deletados)
    const activeUsers = allUsers.filter(u => !u.disabled);
    
    // ── ETAPA 2: Buscar todos os Employees ──
    const allEmployees = [];
    skip = 0;
    hasMore = true;
    
    while (hasMore) {
      const batch = await base44.asServiceRole.entities.Employee.list('-created_date', limit, skip);
      if (!batch || batch.length === 0) { hasMore = false; break; }
      allEmployees.push(...batch);
      skip += batch.length;
      if (batch.length < limit) hasMore = false;
    }
    
    // Set de user_ids que têm Employee vinculado
    const employeeUserIds = new Set();
    for (const emp of allEmployees) {
      const uid = emp.user_id;
      if (uid) employeeUserIds.add(uid);
    }

    // Mapa de email → employee (para cruzamento alternativo)
    const employeeByEmail = new Map();
    for (const emp of allEmployees) {
      const email = emp.email?.toLowerCase();
      if (email) employeeByEmail.set(email, emp);
    }
    
    // ── ETAPA 3: Identificar órfãos e classificar ──
    const orphanUsers = [];
    const withEmployee = [];

    for (const user of activeUsers) {
      const employeeUserIdMatch = employeeUserIds.has(user.id);
      const employeeEmailMatch = employeeByEmail.get(user.email?.toLowerCase());
      const hasEmployee = employeeUserIdMatch || !!employeeEmailMatch;

      const userRecord = {
        user_id: user.id,
        email: user.email,
        role: user.role,
        workshop_id: user.data?.workshop_id || user.workshop_id || null,
        created_date: user.created_date,
        profile_id: user.data?.profile_id || user.profile_id || null,
        has_employee: hasEmployee,
      };

      if (hasEmployee) {
        withEmployee.push(userRecord);
      } else {
        orphanUsers.push(userRecord);
      }
    }

    // ── ETAPA 4: Classificar cada usuário órfão ──
    const classifiedOrphans = orphanUsers.map(u => {
      const isService = allUsers.find(au => au.id === u.user_id)?.is_service || false;
      const isTestAgent = allUsers.find(au => au.id === u.user_id)?.is_test_agent_user || false;
      const userData = allUsers.find(au => au.id === u.user_id)?.data || {};

      const cadastroEmAndamento = userData.cadastro_em_andamento === true;
      const firstAccessCompleted = userData.first_access_completed;
      const profileCompleted = userData.profile_completed;
      const hasWorkshopId = !!u.workshop_id;

      let category;
      let categoryLabel;

      // D) SISTEMA: service accounts, automações, integrações
      if (isService || isTestAgent) {
        category = 'SISTEMA';
        categoryLabel = 'Service account / automação / integração';
      }
      // A) ADMIN_INTERNO: admin da plataforma (equipe Oficinas Master)
      else if (u.role === 'admin') {
        category = 'ADMIN_INTERNO';
        categoryLabel = 'Administrador interno (equipe Oficinas Master)';
      }
      // B) CADASTRO_INCOMPLETO: onboarding não finalizado
      else if (cadastroEmAndamento || firstAccessCompleted === false || profileCompleted === false || !hasWorkshopId) {
        category = 'CADASTRO_INCOMPLETO';
        categoryLabel = 'Cadastro iniciado mas não concluído';
      }
      // C) USUARIO_ORFAO: onboarding completo, tem workshop, deveria ter Employee
      else {
        category = 'USUARIO_ORFAO';
        categoryLabel = 'Usuário legítimo com onboarding completo mas sem Employee vinculado';
      }

      return {
        ...u,
        category,
        category_label: categoryLabel,
        is_service: isService,
        is_test_agent: isTestAgent,
        cadastro_em_andamento: cadastroEmAndamento,
        first_access_completed: firstAccessCompleted,
        profile_completed: profileCompleted,
        has_workshop_id: hasWorkshopId,
      };
    });

    // ── ETAPA 5: Agrupamento ──
    const grouping = {
      ADMIN_INTERNO: classifiedOrphans.filter(u => u.category === 'ADMIN_INTERNO').length,
      CADASTRO_INCOMPLETO: classifiedOrphans.filter(u => u.category === 'CADASTRO_INCOMPLETO').length,
      USUARIO_ORFAO: classifiedOrphans.filter(u => u.category === 'USUARIO_ORFAO').length,
      SISTEMA: classifiedOrphans.filter(u => u.category === 'SISTEMA').length,
    };
    grouping.TOTAL = Object.values(grouping).reduce((a, b) => a + b, 0);

    // ── ETAPA 6: Detalhes dos USUARIO_ORFAO ──
    const usuariosOrfaos = classifiedOrphans
      .filter(u => u.category === 'USUARIO_ORFAO')
      .map(u => ({
        email: u.email,
        workshop_id: u.workshop_id,
        profile_id: u.profile_id,
        created_date: u.created_date,
        user_id: u.user_id,
        role: u.role,
      }));

    // ── ETAPA 7: Análise para responder as 5 perguntas ──
    
    // Estatísticas adicionais para responder às perguntas
    const totalActive = activeUsers.length;
    const totalWithEmployee = withEmployee.length;
    const totalWithoutEmployee = orphanUsers.length;
    
    // Dos 92 usuários COM Employee, quantos têm profile_id no Employee?
    const withEmployeeIds = new Set(withEmployee.map(u => u.user_id));
    const usersWithEmployeeProfile = new Set();
    const usersWithOnlyUserProfile = new Set();
    
    for (const emp of allEmployees) {
      if (!emp.user_id || !withEmployeeIds.has(emp.user_id)) continue;
      if (emp.profile_id) {
        usersWithEmployeeProfile.add(emp.user_id);
      }
    }
    
    // Usuários com Employee mas SEM profile_id no Employee (dependem do fallback user.profile_id)
    for (const user of withEmployee) {
      if (!usersWithEmployeeProfile.has(user.user_id)) {
        const fullUser = allUsers.find(u => u.id === user.user_id);
        if (fullUser?.data?.profile_id || fullUser?.profile_id) {
          usersWithOnlyUserProfile.add(user.user_id);
        }
      }
    }

    const usingEmployeeProfileId = usersWithEmployeeProfile.size;
    const usingUserProfileIdFallback = usersWithOnlyUserProfile.size;

    const percentUsingEmployeeProfile = totalWithEmployee > 0 
      ? ((usingEmployeeProfileId / totalWithEmployee) * 100).toFixed(1) 
      : '0.0';

    const rbacAnalysis = {
      usuarios_com_employee_usando_employee_profile_id: usingEmployeeProfileId,
      usuarios_com_employee_usando_fallback_user_profile_id: usingUserProfileIdFallback,
      percentual_usando_employee_profile_id: `${percentUsingEmployeeProfile}%`,
      respostas: {
        q1_quantos_sem_employee_sao_legitimos: grouping.USUARIO_ORFAO,
        q2_quantos_cadastros_incompletos: grouping.CADASTRO_INCOMPLETO,
        q3_quantos_erros_modelagem: grouping.ADMIN_INTERNO + grouping.SISTEMA,
        q4_podemos_remover_fallback_user_profile_id: grouping.USUARIO_ORFAO === 0 
          ? 'SIM — zero órfãos legítimos, fallback nunca é usado na prática'
          : `NÃO AINDA — existem ${grouping.USUARIO_ORFAO} usuários órfãos legítimos que dependem do fallback. Precisa criar Employee para eles primeiro.`,
        q5_percentual_usando_exclusivamente_employee_profile_id: `${percentUsingEmployeeProfile}%`,
      }
    };

    const responsePayload = {
      resumo: {
        total_usuarios_ativos: totalActive,
        total_com_employee: totalWithEmployee,
        total_sem_employee: totalWithoutEmployee,
        total_employees: allEmployees.length,
        employees_com_user_id: allEmployees.filter(e => e.user_id).length,
        employees_sem_user_id: allEmployees.filter(e => !e.user_id).length,
      },
      etapa_5_agrupamento: grouping,
      etapa_7_analise_rbac: rbacAnalysis,
    };

    if (!summaryOnly) {
      if (categoryFilter) {
        responsePayload.etapa_3_usuarios_sem_employee = classifiedOrphans.filter(u => u.category === categoryFilter);
        responsePayload.etapa_6_usuarios_orfaos_detalhes = usuariosOrfaos;
      } else {
        responsePayload.etapa_3_usuarios_sem_employee = classifiedOrphans;
        responsePayload.etapa_6_usuarios_orfaos_detalhes = usuariosOrfaos;
      }
    }

    return Response.json(responsePayload);
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});