/**
 * auditOrphanUsers — Auditoria de Users sem Employee vinculado
 *
 * Contrato de resposta (Regra Nº 11):
 * { success, status: "PASS"|"WARNING"|"FAIL", issues_found, duration_ms, details: {...} }
 *
 * Event type de auditoria (Regra Nº 13): MANUAL_ORPHAN_AUDIT
 *
 * Classifica cada usuário órfão em:
 * ADMIN_INTERNO     — admin da plataforma (esperado, sem Employee)
 * CADASTRO_INCOMPLETO — onboarding não finalizado (monitorar)
 * USUARIO_ORFAO     — onboarding completo mas sem Employee (problema real)
 * SISTEMA           — service account / automação
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  const startTime = Date.now();
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me().catch(() => null);
    const isInternalCall = req.headers.get('x-internal-call') === 'true';
    if (!isInternalCall && (!currentUser || currentUser.role !== 'admin')) {
      return Response.json({ error: 'Apenas administradores' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const summaryOnly    = body.summary_only === true;
    const categoryFilter = body.category_filter || null;

    const limit = 200;

    const allUsers = [];
    let skip = 0, hasMore = true;
    while (hasMore) {
      const batch = await base44.asServiceRole.entities.User.list('-created_date', limit, skip);
      if (!batch?.length) { hasMore = false; break; }
      allUsers.push(...batch);
      skip += batch.length;
      if (batch.length < limit) hasMore = false;
    }
    const activeUsers = allUsers.filter(u => !u.disabled);

    const allEmployees = [];
    skip = 0; hasMore = true;
    while (hasMore) {
      const batch = await base44.asServiceRole.entities.Employee.list('-created_date', limit, skip);
      if (!batch?.length) { hasMore = false; break; }
      allEmployees.push(...batch);
      skip += batch.length;
      if (batch.length < limit) hasMore = false;
    }

    const employeeUserIds = new Set(allEmployees.map(e => e.user_id).filter(Boolean));
    const employeeByEmail = new Map(allEmployees.map(emp => [emp.email?.toLowerCase(), emp]).filter(([k]) => k));

    const orphanUsers = [];
    const withEmployee = [];
    for (const user of activeUsers) {
      const hasEmployee = employeeUserIds.has(user.id) || !!employeeByEmail.get(user.email?.toLowerCase());
      const rec = {
        user_id: user.id, email: user.email, role: user.role,
        workshop_id: user.data?.workshop_id || user.workshop_id || null,
        created_date: user.created_date,
        profile_id: user.data?.profile_id || user.profile_id || null,
        has_employee: hasEmployee,
      };
      if (hasEmployee) withEmployee.push(rec);
      else orphanUsers.push(rec);
    }

    const classifiedOrphans = orphanUsers.map(u => {
      const fullUser = allUsers.find(au => au.id === u.user_id);
      const userData = fullUser?.data || {};
      const isService    = fullUser?.is_service || false;
      const isTestAgent  = fullUser?.is_test_agent_user || false;
      const cadastroEmAndamento = userData.cadastro_em_andamento === true;
      const firstAccessCompleted = userData.first_access_completed;
      const profileCompleted = userData.profile_completed;
      const hasWorkshopId = !!u.workshop_id;

      let category, categoryLabel;
      if (isService || isTestAgent) {
        category = 'SISTEMA';
        categoryLabel = 'Service account / automação / integração';
      } else if (u.role === 'admin') {
        category = 'ADMIN_INTERNO';
        categoryLabel = 'Administrador interno (equipe Oficinas Master)';
      } else if (cadastroEmAndamento || firstAccessCompleted === false || profileCompleted === false || !hasWorkshopId) {
        category = 'CADASTRO_INCOMPLETO';
        categoryLabel = 'Cadastro iniciado mas não concluído';
      } else {
        category = 'USUARIO_ORFAO';
        categoryLabel = 'Usuário legítimo com onboarding completo mas sem Employee vinculado';
      }
      return { ...u, category, category_label: categoryLabel, is_service: isService, is_test_agent: isTestAgent,
        cadastro_em_andamento: cadastroEmAndamento, first_access_completed: firstAccessCompleted,
        profile_completed: profileCompleted, has_workshop_id: hasWorkshopId };
    });

    const grouping = {
      ADMIN_INTERNO:       classifiedOrphans.filter(u => u.category === 'ADMIN_INTERNO').length,
      CADASTRO_INCOMPLETO: classifiedOrphans.filter(u => u.category === 'CADASTRO_INCOMPLETO').length,
      USUARIO_ORFAO:       classifiedOrphans.filter(u => u.category === 'USUARIO_ORFAO').length,
      SISTEMA:             classifiedOrphans.filter(u => u.category === 'SISTEMA').length,
    };
    grouping.TOTAL = Object.values(grouping).reduce((a, b) => a + b, 0);

    // RBAC analysis
    const withEmployeeIds = new Set(withEmployee.map(u => u.user_id));
    const usersWithEmployeeProfile = new Set();
    for (const emp of allEmployees) {
      if (emp.user_id && withEmployeeIds.has(emp.user_id) && emp.profile_id) usersWithEmployeeProfile.add(emp.user_id);
    }
    const usingEmployeeProfileId = usersWithEmployeeProfile.size;
    const percentUsingEmployeeProfile = withEmployee.length > 0
      ? ((usingEmployeeProfileId / withEmployee.length) * 100).toFixed(1) : '0.0';

    // issues_found = apenas USUARIO_ORFAO (os demais são esperados)
    const issues_found = grouping.USUARIO_ORFAO;
    const status = issues_found === 0 ? 'PASS' : issues_found > 5 ? 'FAIL' : 'WARNING';
    const duration_ms = Date.now() - startTime;

    // Regra Nº 13
    try {
      await base44.asServiceRole.entities.SystemEventLog.create({
        event_type: 'MANUAL_ORPHAN_AUDIT',
        entity_type: 'User',
        triggered_by: isInternalCall ? 'system' : 'admin',
        status: status === 'FAIL' ? 'error' : status === 'WARNING' ? 'warning' : 'success',
        details: {
          function_name: 'auditOrphanUsers',
          executed_by: currentUser?.email || 'system',
          duration_ms, issues_found, ...grouping,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (_) {}

    const responsePayload = {
      success: status !== 'FAIL',
      status,
      issues_found,
      duration_ms,
      details: {
        total_usuarios_ativos: activeUsers.length,
        total_com_employee: withEmployee.length,
        total_sem_employee: orphanUsers.length,
        total_employees: allEmployees.length,
        employees_com_user_id: allEmployees.filter(e => e.user_id).length,
        employees_sem_user_id: allEmployees.filter(e => !e.user_id).length,
        grouping,
        rbac_analysis: {
          usando_employee_profile_id: usingEmployeeProfileId,
          percentual: `${percentUsingEmployeeProfile}%`,
          pode_remover_fallback: grouping.USUARIO_ORFAO === 0,
        },
      },
    };

    if (!summaryOnly) {
      responsePayload.details.usuarios = categoryFilter
        ? classifiedOrphans.filter(u => u.category === categoryFilter)
        : classifiedOrphans;
    }

    return Response.json(responsePayload);

  } catch (error) {
    return Response.json({ success: false, status: 'FAIL', issues_found: -1, duration_ms: Date.now() - startTime, details: { error: error.message } }, { status: 500 });
  }
});