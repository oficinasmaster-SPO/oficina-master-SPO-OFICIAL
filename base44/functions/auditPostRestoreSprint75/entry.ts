/**
 * auditPostRestoreSprint75 — Reconciliação Pós-Restore
 *
 * Sprint 7.5: Valida que dados restaurados respeitam a arquitetura atual.
 * Cobre 6 etapas:
 *   E1 — Users: campos obrigatórios, role, user_type, onboarding flags
 *   E2 — Employees: user_id, profile_id, workshop_id, status
 *   E3 — RLS: entidades críticas sem workshop_id
 *   E4 — RBAC: profiles, roles, permissions
 *   E5 — Ownership legado suspeito
 *   E6 — Onboarding preso (email enviado → usuário nunca integrou workshop)
 *
 * Contrato: { success, status: "PASS"|"WARNING"|"FAIL", issues_found, duration_ms, details }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const VALID_USER_TYPES = ['internal', 'external'];
const VALID_ROLES = ['admin', 'user'];

Deno.serve(async (req) => {
  const startTime = Date.now();
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me().catch(() => null);
    const isInternalCall = req.headers.get('x-internal-call') === 'true';
    if (!isInternalCall && (!currentUser || currentUser.role !== 'admin')) {
      return Response.json({ error: 'Apenas administradores' }, { status: 403 });
    }

    // ═══════════════════════════════════════════════════════
    // CARREGAMENTO PARALELO DE DADOS BASE
    // ═══════════════════════════════════════════════════════
    const [users, employees, workshops, profiles, invites] = await Promise.all([
      base44.asServiceRole.entities.User.list('-created_date', 2000),
      base44.asServiceRole.entities.Employee.list('-created_date', 5000),
      base44.asServiceRole.entities.Workshop.list('-created_date', 2000),
      base44.asServiceRole.entities.UserProfile.list(null, 500),
      base44.asServiceRole.entities.EmployeeInvite.list('-created_date', 5000),
    ]);

    const userIdSet     = new Set(users.map(u => u.id));
    const profileIdSet  = new Set(profiles.map(p => p.id));
    const workshopIdSet = new Set(workshops.map(w => w.id));
    const employeeByUserId = new Map(employees.map(e => [e.user_id, e]));
    const invitesByEmail = new Map();
    for (const inv of invites) {
      if (!inv.email) continue;
      const key = inv.email.toLowerCase();
      const arr = invitesByEmail.get(key) || [];
      arr.push(inv);
      invitesByEmail.set(key, arr);
    }

    // ═══════════════════════════════════════════════════════
    // E1 — AUDITORIA DE USERS
    // ═══════════════════════════════════════════════════════
    const e1 = {
      total: users.length,
      sem_workshop_id: [],
      email_duplicado: [],
      role_invalido: [],
      user_type_invalido: [],
      onboarding_preso: [],
      ok: 0,
    };

    const emailCount = new Map();
    for (const u of users) {
      const email = u.email?.toLowerCase();
      if (email) emailCount.set(email, (emailCount.get(email) || 0) + 1);
    }

    for (const u of users) {
      const issues = [];
      const workshopId = u.workshop_id || u.data?.workshop_id;

      if (!workshopId && u.role !== 'admin') {
        e1.sem_workshop_id.push({ id: u.id, email: u.email, role: u.role });
        issues.push('sem_workshop_id');
      }
      if (emailCount.get(u.email?.toLowerCase()) > 1) {
        e1.email_duplicado.push({ id: u.id, email: u.email });
        issues.push('email_duplicado');
      }
      if (!VALID_ROLES.includes(u.role)) {
        e1.role_invalido.push({ id: u.id, email: u.email, role: u.role });
        issues.push('role_invalido');
      }
      if (u.user_type && !VALID_USER_TYPES.includes(u.user_type)) {
        e1.user_type_invalido.push({ id: u.id, email: u.email, user_type: u.user_type });
        issues.push('user_type_invalido');
      }
      // Onboarding preso: tem workshop_id mas first_access_completed=false E cadastro_em_andamento=false
      // (limbo: cadastrou mas nunca finalizou e também não está em andamento)
      if (workshopId && u.first_access_completed === false && u.cadastro_em_andamento === false) {
        e1.onboarding_preso.push({ id: u.id, email: u.email, first_access_completed: u.first_access_completed, cadastro_em_andamento: u.cadastro_em_andamento });
        issues.push('onboarding_preso');
      }

      if (issues.length === 0) e1.ok++;
    }

    const e1_issues = e1.sem_workshop_id.length + e1.email_duplicado.length
      + e1.role_invalido.length + e1.user_type_invalido.length;

    // ═══════════════════════════════════════════════════════
    // E2 — AUDITORIA DE EMPLOYEES
    // ═══════════════════════════════════════════════════════
    const e2 = {
      total: employees.length,
      sem_user_id: [],
      sem_profile_id: [],
      sem_workshop_id: [],
      profile_inexistente: [],
      workshop_inexistente: [],
      ok: 0,
    };

    for (const emp of employees) {
      const issues = [];

      if (!emp.user_id) {
        e2.sem_user_id.push({ id: emp.id, email: emp.email, full_name: emp.full_name, workshop_id: emp.workshop_id });
        issues.push('sem_user_id');
      }
      if (!emp.profile_id) {
        e2.sem_profile_id.push({ id: emp.id, email: emp.email, full_name: emp.full_name, workshop_id: emp.workshop_id });
        issues.push('sem_profile_id');
      }
      if (!emp.workshop_id) {
        e2.sem_workshop_id.push({ id: emp.id, email: emp.email, full_name: emp.full_name });
        issues.push('sem_workshop_id');
      }
      if (emp.profile_id && !profileIdSet.has(emp.profile_id)) {
        e2.profile_inexistente.push({ id: emp.id, email: emp.email, profile_id: emp.profile_id });
        issues.push('profile_inexistente');
      }
      if (emp.workshop_id && !workshopIdSet.has(emp.workshop_id)) {
        e2.workshop_inexistente.push({ id: emp.id, email: emp.email, workshop_id: emp.workshop_id });
        issues.push('workshop_inexistente');
      }

      if (issues.length === 0) e2.ok++;
    }

    const e2_issues = e2.sem_profile_id.length + e2.profile_inexistente.length
      + e2.sem_workshop_id.length + e2.workshop_inexistente.length;
    // sem_user_id é WARNING (colaboradores que nunca logam são válidos)

    // ═══════════════════════════════════════════════════════
    // E3 — AUDITORIA RLS: entidades críticas sem workshop_id
    // ═══════════════════════════════════════════════════════
    const e3 = { issues: [], checked_entities: [] };

    async function checkRLS(entityName, limit = 2000) {
      try {
        const records = await base44.asServiceRole.entities[entityName].list(null, limit);
        const orphans = records.filter(r => !r.workshop_id);
        e3.checked_entities.push({ entity: entityName, total: records.length, sem_workshop_id: orphans.length });
        if (orphans.length > 0) {
          e3.issues.push({
            entity: entityName,
            count: orphans.length,
            sample: orphans.slice(0, 5).map(r => ({ id: r.id, created_date: r.created_date }))
          });
        }
      } catch (err) {
        e3.checked_entities.push({ entity: entityName, error: err.message });
      }
    }

    // Pessoas
    await checkRLS('CDCRecord');
    await checkRLS('COEXFeedback');
    // Operação
    await checkRLS('Task');
    await checkRLS('Goal');
    await checkRLS('DailyProductivityLog');
    // Financeiro
    await checkRLS('DRELancamento');
    await checkRLS('DFCLancamento');
    await checkRLS('ContaPagar');
    await checkRLS('ContaReceber');
    // Diagnósticos
    await checkRLS('Diagnostic');

    const e3_issues = e3.issues.reduce((sum, i) => sum + i.count, 0);

    // ═══════════════════════════════════════════════════════
    // E4 — AUDITORIA RBAC
    // ═══════════════════════════════════════════════════════
    const e4 = {
      total_profiles: profiles.length,
      profiles_sem_roles: [],
      profiles_sem_sidebar_permissions: [],
      profiles_sem_module_permissions: [],
      profiles_inativos_com_employees: [],
    };

    const empByProfileId = new Map();
    for (const emp of employees) {
      if (!emp.profile_id) continue;
      const arr = empByProfileId.get(emp.profile_id) || [];
      arr.push(emp.id);
      empByProfileId.set(emp.profile_id, arr);
    }

    for (const p of profiles) {
      if (!p.roles || p.roles.length === 0) {
        e4.profiles_sem_roles.push({ id: p.id, name: p.name, type: p.type });
      }
      if (!p.sidebar_permissions || Object.keys(p.sidebar_permissions).length === 0) {
        e4.profiles_sem_sidebar_permissions.push({ id: p.id, name: p.name });
      }
      if (!p.module_permissions || Object.keys(p.module_permissions).length === 0) {
        e4.profiles_sem_module_permissions.push({ id: p.id, name: p.name });
      }
      if (p.status === 'inativo' && empByProfileId.has(p.id)) {
        e4.profiles_inativos_com_employees.push({
          id: p.id, name: p.name,
          employees_count: empByProfileId.get(p.id).length
        });
      }
    }

    const e4_issues = e4.profiles_sem_roles.length + e4.profiles_inativos_com_employees.length;

    // ═══════════════════════════════════════════════════════
    // E5 — AUDITORIA OWNERSHIP LEGADO
    // ═══════════════════════════════════════════════════════
    const e5 = {
      workshops_sem_owner_valido: [],
      workshops_partner_ids_invalidos: [],
    };

    for (const ws of workshops) {
      if (ws.status === 'inativo') continue;

      // owner_id em Workshop é PERMITIDO — mas valida se o user existe
      if (!ws.owner_id || !userIdSet.has(ws.owner_id)) {
        e5.workshops_sem_owner_valido.push({
          workshop_id: ws.id, name: ws.name,
          owner_id: ws.owner_id || null,
          status: ws.status
        });
      }

      // partner_ids inválidos (apontam para users inexistentes)
      if (ws.partner_ids && ws.partner_ids.length > 0) {
        const invalidPartners = ws.partner_ids.filter(pid => !userIdSet.has(pid));
        if (invalidPartners.length > 0) {
          e5.workshops_partner_ids_invalidos.push({
            workshop_id: ws.id, name: ws.name,
            invalid_partner_ids: invalidPartners
          });
        }
      }
    }

    const e5_issues = e5.workshops_sem_owner_valido.length + e5.workshops_partner_ids_invalidos.length;

    // ═══════════════════════════════════════════════════════
    // E6 — AUDITORIA ONBOARDING PRESO
    // ═══════════════════════════════════════════════════════
    const e6 = {
      usuarios_sem_employee: [],
      usuarios_workshop_inexistente: [],
      convites_pendentes_sem_user: [],
      convites_aceitos_sem_employee: [],
    };

    // Users com workshop_id que não tem Employee vinculado
    for (const u of users) {
      if (u.role === 'admin') continue;
      const workshopId = u.workshop_id || u.data?.workshop_id;
      if (!workshopId) continue;

      const emp = employeeByUserId.get(u.id);
      if (!emp) {
        e6.usuarios_sem_employee.push({
          user_id: u.id, email: u.email,
          workshop_id: workshopId,
          first_access_completed: u.first_access_completed,
          role: u.role
        });
      }

      // workshop_id aponta para workshop que não existe mais
      if (workshopId && !workshopIdSet.has(workshopId)) {
        e6.usuarios_workshop_inexistente.push({
          user_id: u.id, email: u.email,
          workshop_id: workshopId
        });
      }
    }

    // Convites enviados/acessados mas sem User correspondente ainda
    const pendingInvites = invites.filter(i => i.status === 'enviado' || i.status === 'acessado');
    for (const inv of pendingInvites) {
      const userExists = users.some(u => u.email?.toLowerCase() === inv.email?.toLowerCase());
      if (!userExists) {
        e6.convites_pendentes_sem_user.push({
          invite_id: inv.id, email: inv.email,
          status: inv.status, expires_at: inv.expires_at,
          workshop_id: inv.workshop_id
        });
      }
    }

    // Convites concluídos mas o Employee ainda não tem user_id (inconsistência de sync)
    const concludedInvites = invites.filter(i => i.status === 'concluido');
    for (const inv of concludedInvites) {
      const matchingUser = users.find(u => u.email?.toLowerCase() === inv.email?.toLowerCase());
      if (matchingUser) {
        const emp = employeeByUserId.get(matchingUser.id);
        if (!emp) {
          e6.convites_aceitos_sem_employee.push({
            invite_id: inv.id, email: inv.email,
            user_id: matchingUser.id, workshop_id: inv.workshop_id
          });
        }
      }
    }

    const e6_issues = e6.usuarios_sem_employee.length + e6.usuarios_workshop_inexistente.length
      + e6.convites_aceitos_sem_employee.length;

    // ═══════════════════════════════════════════════════════
    // RESULTADO CONSOLIDADO
    // ═══════════════════════════════════════════════════════
    const issues_found = e1_issues + e2_issues + e3_issues + e4_issues + e5_issues + e6_issues;
    const critical_issues = e1.email_duplicado.length + e2.profile_inexistente.length
      + e2.workshop_inexistente.length + e5.workshops_sem_owner_valido.length
      + e6.usuarios_workshop_inexistente.length + e6.convites_aceitos_sem_employee.length;

    const status = issues_found === 0 ? 'PASS' : critical_issues > 0 ? 'FAIL' : 'WARNING';
    const duration_ms = Date.now() - startTime;

    // Salvar snapshot no SystemEventLog
    try {
      await base44.asServiceRole.entities.SystemEventLog.create({
        event_type: 'SPRINT75_POST_RESTORE_AUDIT',
        entity_type: 'RBACHealth',
        triggered_by: isInternalCall ? 'system' : 'admin',
        status: status === 'FAIL' ? 'error' : status === 'WARNING' ? 'warning' : 'success',
        details: {
          function_name: 'auditPostRestoreSprint75',
          executed_by: currentUser?.email || 'system',
          duration_ms, issues_found, critical_issues,
          e1_issues, e2_issues, e3_issues, e4_issues, e5_issues, e6_issues,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (_) {}

    return Response.json({
      success: status !== 'FAIL',
      status,
      issues_found,
      critical_issues,
      duration_ms,
      summary: {
        e1_users:       { issues: e1_issues,  sem_workshop: e1.sem_workshop_id.length, email_dup: e1.email_duplicado.length, role_invalido: e1.role_invalido.length, onboarding_preso: e1.onboarding_preso.length },
        e2_employees:   { issues: e2_issues,  sem_profile: e2.sem_profile_id.length, profile_inexistente: e2.profile_inexistente.length, sem_workshop: e2.sem_workshop_id.length, sem_user_id_warning: e2.sem_user_id.length },
        e3_rls:         { issues: e3_issues,  entities_checked: e3.checked_entities.length },
        e4_rbac:        { issues: e4_issues,  sem_roles: e4.profiles_sem_roles.length, inativos_com_emp: e4.profiles_inativos_com_employees.length },
        e5_ownership:   { issues: e5_issues,  sem_owner_valido: e5.workshops_sem_owner_valido.length, partner_ids_invalidos: e5.workshops_partner_ids_invalidos.length },
        e6_onboarding:  { issues: e6_issues,  sem_employee: e6.usuarios_sem_employee.length, workshop_inexistente: e6.usuarios_workshop_inexistente.length, convite_aceito_sem_employee: e6.convites_aceitos_sem_employee.length, convites_pendentes_sem_user: e6.convites_pendentes_sem_user.length },
      },
      details: {
        e1_users: e1,
        e2_employees: e2,
        e3_rls: e3,
        e4_rbac: e4,
        e5_ownership: e5,
        e6_onboarding: e6,
      },
    });

  } catch (err) {
    return Response.json({
      success: false, status: 'FAIL', issues_found: -1,
      duration_ms: Date.now() - startTime,
      details: { error: err.message, stack: err.stack }
    }, { status: 500 });
  }
});