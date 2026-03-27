import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const idempotencyCache = new Map();

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || !user.id) {
      return Response.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Não autenticado' } }, { status: 401 });
    }

    let body;
    try {
      body = await req.json();
    } catch(e) {
      return Response.json({ success: false, error: { code: 'INVALID_INPUT', message: 'Payload inválido' } }, { status: 400 });
    }

    const { employee_id, idempotencyKey, updated_date } = body;

    if (idempotencyKey && idempotencyCache.has(idempotencyKey)) {
      const cached = idempotencyCache.get(idempotencyKey);
      return Response.json(cached.body, { status: cached.status });
    }

    if (!employee_id || typeof employee_id !== 'string') {
      return Response.json({ success: false, error: { code: 'MISSING_FIELDS', message: 'employee_id é obrigatório e deve ser string' } }, { status: 400 });
    }

    // --- Verificação de permissão ---
    let canDelete = false;
    
    if (user.role === 'admin') {
      canDelete = true;
    } else {
      try {
        let profile = null;
        if (user.profile_id) {
          profile = await base44.entities.UserProfile.get(user.profile_id);
        } else {
          const employees = await base44.entities.Employee.filter({ user_id: user.id });
          if (employees && employees.length > 0 && employees[0].profile_id) {
            profile = await base44.entities.UserProfile.get(employees[0].profile_id);
          }
        }

        if (profile && profile.job_roles && profile.job_roles.length > 0) {
          if (profile.job_roles.includes('socio')) {
            canDelete = true;
          } else {
            const settings = await base44.asServiceRole.entities.SystemSetting.filter({ key: 'granular_permissions' });
            if (settings && settings.length > 0) {
              const granularConfig = JSON.parse(settings[0].value || '{}');
              for (const jobRole of profile.job_roles) {
                const roleConfig = granularConfig[jobRole];
                if (roleConfig?.resources?.employees?.actions?.includes('delete')) {
                  canDelete = true;
                  break;
                }
              }
            }
          }
        }
      } catch (e) {
        console.error("Erro ao verificar permissão:", e);
      }
    }

    if (!canDelete) {
      return Response.json({ success: false, error: { code: 'FORBIDDEN', message: 'Acesso negado: sem permissão para excluir colaborador' } }, { status: 403 });
    }
    // --- Fim da verificação ---

    // Buscar o employee
    const employee = await base44.entities.Employee.get(employee_id);
    if (!employee) {
      return Response.json({ success: false, error: { code: 'NOT_FOUND', message: 'Colaborador não encontrado' } }, { status: 404 });
    }

    if (updated_date && employee.updated_date && new Date(updated_date).getTime() !== new Date(employee.updated_date).getTime()) {
      return Response.json({ success: false, error: { code: 'CONFLICT_MODIFICATION', message: 'Registro modificado por outro usuário. Recarregue a página.' } }, { status: 409 });
    }

    if (user.role !== 'admin' && user.data?.workshop_id && employee.workshop_id !== user.data?.workshop_id) {
      return Response.json({ success: false, error: { code: 'FORBIDDEN', message: 'Acesso cross-tenant negado' } }, { status: 403 });
    }

    async function validateBusinessRules(data, context) {
      const { employee } = data;
      const { base44 } = context;

      if (employee.user_id) {
         const workshops = await base44.asServiceRole.entities.Workshop.filter({ owner_id: employee.user_id });
         if (workshops && workshops.length > 0) {
            throw { code: 'BUSINESS_RULE_VIOLATION', message: 'Não é possível excluir o proprietário da oficina. Transfira a posse primeiro.' };
         }
      }
    }

    try {
      await validateBusinessRules({ employee }, { base44 });
    } catch (ruleError) {
      return Response.json({ success: false, error: ruleError }, { status: 400 });
    }

    // Deletar o usuário vinculado (se existir)
    if (employee.user_id) {
      try {
        await base44.entities.User.delete(employee.user_id);
        console.log(`User ${employee.user_id} deletado com sucesso`);
      } catch (e) {
        console.error(`Erro ao deletar User ${employee.user_id}:`, e.message);
      }
    }

    // Deletar convites pendentes do mesmo email, para não sujar o sistema
    if (employee.email) {
      try {
        const invites = await base44.entities.EmployeeInvite.filter({ email: employee.email });
        for (const invite of invites) {
          await base44.entities.EmployeeInvite.delete(invite.id);
        }
      } catch (e) {
        console.error(`Erro ao deletar convites para ${employee.email}:`, e.message);
      }
    }

    // Deletar o employee
    await base44.entities.Employee.delete(employee.id);

    console.log(JSON.stringify({
      level: 'AUDIT',
      userId: user.id,
      action: 'DELETE',
      entity: 'Employee',
      before: { employee_id: employee.id, user_id: employee.user_id },
      after: null,
      timestamp: new Date().toISOString()
    }));

    const responseBody = { 
      success: true, 
      data: { message: 'Colaborador e usuário excluídos com sucesso' }
    };

    if (idempotencyKey) {
      idempotencyCache.set(idempotencyKey, { body: responseBody, status: 200 });
      setTimeout(() => idempotencyCache.delete(idempotencyKey), 5 * 60 * 1000);
    }

    return Response.json(responseBody);

  } catch (error) {
    console.error(JSON.stringify({
      level: 'ERROR',
      action: 'DELETE_EMPLOYEE_CASCADE',
      message: error.message,
      timestamp: new Date().toISOString()
    }));
    return Response.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Erro interno no servidor' } }, { status: 500 });
  }
});