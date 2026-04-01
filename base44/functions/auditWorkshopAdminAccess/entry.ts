import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    
    if (!caller || caller.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { workshopId, userId } = await req.json();

    // Se workshopId e userId fornecidos, audita um caso específico
    // Se não, audita TODOS os admins de oficina
    const results = [];

    if (workshopId && userId) {
      const result = await auditSingleUser(base44, userId, workshopId);
      results.push(result);
    } else {
      // Buscar todos workshops
      const workshops = await base44.asServiceRole.entities.Workshop.list('-created_date', 200);
      
      for (const ws of workshops) {
        if (!ws.owner_id) continue;
        const result = await auditSingleUser(base44, ws.owner_id, ws.id);
        results.push(result);
      }
    }

    // Resumo
    const totalAudited = results.length;
    const withProblems = results.filter(r => r.problems.length > 0);
    const problemTypes = {};
    
    for (const r of withProblems) {
      for (const p of r.problems) {
        problemTypes[p.type] = (problemTypes[p.type] || 0) + 1;
      }
    }

    return Response.json({
      summary: {
        totalAudited,
        withProblems: withProblems.length,
        noProblems: totalAudited - withProblems.length,
        problemBreakdown: problemTypes,
      },
      audits: results,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function auditSingleUser(base44, userId, workshopId) {
  const problems = [];
  const checks = {};
  
  // 1. Verificar se User existe e tem role correto
  let user = null;
  try {
    user = await base44.asServiceRole.entities.User.get(userId);
    checks.userExists = true;
    checks.userRole = user.role;
    checks.userEmail = user.email;
    checks.userFullName = user.full_name;
    checks.userWorkshopId = user.workshop_id || user.data?.workshop_id;
    
    if (user.role !== 'admin') {
      problems.push({
        type: 'ROLE_NOT_ADMIN',
        severity: 'critical',
        detail: `User role é "${user.role}" mas deveria ser "admin" como owner da oficina`,
      });
    }
  } catch (e) {
    checks.userExists = false;
    problems.push({
      type: 'USER_NOT_FOUND',
      severity: 'critical',
      detail: `User ${userId} não encontrado no banco`,
    });
    return { userId, workshopId, problems, checks };
  }

  // 2. Verificar Workshop existe e owner_id aponta para este user
  let workshop = null;
  try {
    workshop = await base44.asServiceRole.entities.Workshop.get(workshopId);
    checks.workshopExists = true;
    checks.workshopName = workshop.name;
    checks.workshopOwnerId = workshop.owner_id;
    checks.workshopConsultingFirmId = workshop.consulting_firm_id;
    
    if (workshop.owner_id !== userId) {
      problems.push({
        type: 'OWNER_MISMATCH',
        severity: 'warning',
        detail: `Workshop owner_id (${workshop.owner_id}) não é este user (${userId})`,
      });
    }
  } catch (e) {
    checks.workshopExists = false;
    problems.push({
      type: 'WORKSHOP_NOT_FOUND',
      severity: 'critical',
      detail: `Workshop ${workshopId} não encontrado`,
    });
    return { userId, workshopId, problems, checks };
  }

  // 3. Verificar se user.workshop_id aponta pro workshop correto
  const userWsId = user.workshop_id || user.data?.workshop_id;
  if (!userWsId) {
    problems.push({
      type: 'USER_NO_WORKSHOP_ID',
      severity: 'critical',
      detail: 'User não tem workshop_id definido no perfil',
    });
  } else if (userWsId !== workshopId) {
    problems.push({
      type: 'USER_WORKSHOP_MISMATCH',
      severity: 'warning',
      detail: `User workshop_id (${userWsId}) diferente do workshop auditado (${workshopId})`,
    });
  }
  checks.userWorkshopIdMatch = userWsId === workshopId;

  // 4. Verificar Employee existe e está vinculado
  let employee = null;
  try {
    const employees = await base44.asServiceRole.entities.Employee.filter({ 
      user_id: userId, 
      workshop_id: workshopId 
    });
    if (employees.length > 0) {
      employee = employees[0];
      checks.employeeExists = true;
      checks.employeeId = employee.id;
      checks.employeeJobRole = employee.job_role;
      checks.employeeStatus = employee.status;
      checks.employeeProfileId = employee.profile_id;
      
      if (!['socio', 'socio_interno', 'diretor'].includes(employee.job_role)) {
        problems.push({
          type: 'EMPLOYEE_WRONG_ROLE',
          severity: 'info',
          detail: `Employee job_role é "${employee.job_role}" (esperado: socio/diretor para owner)`,
        });
      }
    } else {
      // Tentar por email
      const byEmail = await base44.asServiceRole.entities.Employee.filter({
        email: user.email,
        workshop_id: workshopId
      });
      if (byEmail.length > 0) {
        employee = byEmail[0];
        checks.employeeExists = true;
        checks.employeeId = employee.id;
        checks.employeeLinkedByEmail = true;
        
        if (!employee.user_id || employee.user_id !== userId) {
          problems.push({
            type: 'EMPLOYEE_NOT_LINKED',
            severity: 'critical',
            detail: `Employee encontrado por email mas user_id não está vinculado (atual: ${employee.user_id || 'null'})`,
          });
        }
      } else {
        checks.employeeExists = false;
        problems.push({
          type: 'NO_EMPLOYEE_RECORD',
          severity: 'critical',
          detail: `Nenhum Employee encontrado para este user na oficina`,
        });
      }
    }
  } catch (e) {
    checks.employeeError = e.message;
  }

  // 5. Verificar RLS - Testar se o user consegue ler o Workshop via RLS
  // Simula as condições de RLS do Workshop
  checks.rlsChecks = {
    isOwner: workshop.owner_id === userId,
    isPartner: Array.isArray(workshop.partner_ids) && workshop.partner_ids.includes(userId),
    consultingFirmMatch: false,
    workshopIdMatch: userWsId === workshopId,
  };
  
  // Consulting firm match
  const userConsultingFirm = user.consulting_firm_id || user.data?.consulting_firm_id;
  if (userConsultingFirm && workshop.consulting_firm_id) {
    checks.rlsChecks.consultingFirmMatch = userConsultingFirm === workshop.consulting_firm_id;
  }
  
  // Se nenhuma condição RLS é atendida, tem problema
  const rlsSatisfied = checks.rlsChecks.isOwner || 
                       checks.rlsChecks.isPartner || 
                       checks.rlsChecks.consultingFirmMatch ||
                       checks.rlsChecks.workshopIdMatch ||
                       user.role === 'admin';
  
  if (!rlsSatisfied) {
    problems.push({
      type: 'RLS_NO_ACCESS',
      severity: 'critical',
      detail: 'Nenhuma condição de RLS do Workshop é satisfeita para este user',
    });
  }

  // 6. Verificar entidades filhas - Testar acesso a dados da oficina
  const dataChecks = {};
  
  // Employees da oficina
  try {
    const emps = await base44.asServiceRole.entities.Employee.filter({ workshop_id: workshopId });
    dataChecks.employeesCount = emps.length;
  } catch (e) {
    dataChecks.employeesError = e.message;
  }

  // Diagnostics
  try {
    const diags = await base44.asServiceRole.entities.Diagnostic.filter({ workshop_id: workshopId });
    dataChecks.diagnosticsCount = diags.length;
  } catch (e) {
    dataChecks.diagnosticsError = e.message;
  }

  // Goals
  try {
    const goals = await base44.asServiceRole.entities.Goal.filter({ workshop_id: workshopId });
    dataChecks.goalsCount = goals.length;
  } catch (e) {
    dataChecks.goalsError = e.message;
  }

  // DRE
  try {
    const dres = await base44.asServiceRole.entities.DREMonthly.filter({ workshop_id: workshopId });
    dataChecks.dreCount = dres.length;
  } catch (e) {
    dataChecks.dreError = e.message;
  }

  checks.dataAvailability = dataChecks;

  // 7. Verificar consulting_firm_id consistency
  if (workshop.consulting_firm_id) {
    const userCF = user.consulting_firm_id || user.data?.consulting_firm_id;
    if (userCF && userCF !== workshop.consulting_firm_id) {
      problems.push({
        type: 'CONSULTING_FIRM_MISMATCH',
        severity: 'warning',
        detail: `User consulting_firm_id (${userCF}) != Workshop consulting_firm_id (${workshop.consulting_firm_id})`,
      });
    }
    if (employee && employee.consulting_firm_id && employee.consulting_firm_id !== workshop.consulting_firm_id) {
      problems.push({
        type: 'EMPLOYEE_CONSULTING_FIRM_MISMATCH',
        severity: 'warning',
        detail: `Employee consulting_firm_id (${employee.consulting_firm_id}) != Workshop consulting_firm_id (${workshop.consulting_firm_id})`,
      });
    }
  }

  return {
    userId,
    userEmail: user.email,
    userFullName: user.full_name,
    workshopId,
    workshopName: workshop.name,
    problems,
    checks,
  };
}