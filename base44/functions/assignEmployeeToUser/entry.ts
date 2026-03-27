import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const idempotencyCache = new Map();

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();
    if (!currentUser || !currentUser.id) {
        return Response.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Não autorizado' } }, { status: 401 });
    }

    let body;
    try {
      body = await req.json();
    } catch(e) {
      return Response.json({ success: false, error: { code: 'INVALID_INPUT', message: 'Payload inválido' } }, { status: 400 });
    }

    const { employeeId, email, workshopId, idempotencyKey, updated_date } = body;

    if (idempotencyKey && idempotencyCache.has(idempotencyKey)) {
      const cached = idempotencyCache.get(idempotencyKey);
      return Response.json(cached.body, { status: cached.status });
    }

    if (!employeeId || typeof employeeId !== 'string' || !email || typeof email !== 'string' || !workshopId || typeof workshopId !== 'string') {
      return Response.json({ success: false, error: { code: 'MISSING_FIELDS', message: 'employeeId, email e workshopId são obrigatórios e devem ser texto' } }, { status: 400 });
    }

    if (currentUser.data?.workshop_id && currentUser.data?.workshop_id !== workshopId) {
      return Response.json({ success: false, error: { code: 'FORBIDDEN', message: 'Acesso cross-tenant negado' } }, { status: 403 });
    }

    // 1. Encontrar o registro de Employee
    const employee = await base44.entities.Employee.get(employeeId);
    
    if (!employee || employee.workshop_id !== workshopId) {
      return Response.json({ success: false, error: { code: 'NOT_FOUND', message: 'Colaborador não encontrado ou não pertence a esta oficina' } }, { status: 404 });
    }

    if (updated_date && employee.updated_date && new Date(updated_date).getTime() !== new Date(employee.updated_date).getTime()) {
      return Response.json({ success: false, error: { code: 'CONFLICT_MODIFICATION', message: 'Registro modificado por outro usuário. Recarregue a página.' } }, { status: 409 });
    }

    // Validação de Plano Global (Fonte de Verdade: Banco/Webhook)
    try {
      const existingUsers = await base44.asServiceRole.entities.User.filter({ workshop_id: workshopId });
      const planCheck = await base44.functions.invoke('checkPlanAccess', {
        tenantId: workshopId,
        feature: 'users',
        action: 'check_limit',
        currentUsage: existingUsers ? existingUsers.length : 0
      });
      if (!planCheck.data?.success) {
        return Response.json({
          success: false,
          error: { code: "PLAN_RESTRICTION", message: planCheck.data?.error?.message || "Limite do plano atingido" }
        }, { status: 403 });
      }
    } catch (e) {
      console.error("Erro na validação do plano:", e);
    }

    // 2. Encontrar o registro de User correspondente ao e-mail
    const users = await base44.entities.User.filter({ email: email });
    
    if (!users || users.length === 0) {
      return Response.json({ success: false, error: { code: 'NOT_FOUND', message: `Nenhum usuário encontrado com o e-mail: ${email}.` } }, { status: 404 });
    }
    
    const user = users[0];

    async function validateBusinessRules(data, context) {
      const { employee, user } = data;
      
      if (employee.user_id && employee.user_id === user.id) {
        throw { code: 'INVALID_STATE', message: 'Colaborador já está vinculado a este usuário' };
      }
      if (user.data?.workshop_id && user.data.workshop_id !== employee.workshop_id) {
        throw { code: 'ACTION_NOT_ALLOWED', message: 'Usuário e colaborador pertencem a oficinas diferentes' };
      }
    }

    try {
      await validateBusinessRules({ employee, user }, { base44 });
    } catch (ruleError) {
      return Response.json({ success: false, error: ruleError }, { status: 400 });
    }

    // 3. Vincular o User ao Employee e atualizar o Employee
    if (employee.user_id !== user.id) {
      await base44.entities.Employee.update(employeeId, {
        user_id: user.id,
        user_status: 'ativo',
      });
    }

    // Opcional: tentar atualizar o role do User se necessário
    if (employee.profile_id) {
        const userProfile = await base44.entities.UserProfile.get(employee.profile_id);
        if (userProfile && userProfile.roles && userProfile.roles.includes('admin') && user.role !== 'admin') {
             try {
                await base44.users.inviteUser(user.email, 'admin');
             } catch (e) {
                 console.log("Erro ao tentar elevar user para admin:", e);
             }
        }
    }

    console.log(JSON.stringify({
      level: 'AUDIT',
      userId: currentUser.id,
      action: 'UPDATE',
      entity: 'Employee',
      before: { user_id: employee.user_id },
      after: { user_id: user.id },
      timestamp: new Date().toISOString()
    }));

    const responseBody = { 
      success: true, 
      data: {
        message: 'Colaborador vinculado ao usuário com sucesso!'
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
      action: 'ASSIGN_EMPLOYEE',
      message: error.message,
      timestamp: new Date().toISOString()
    }));
    return Response.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Erro interno no servidor' } }, { status: 500 });
  }
});