import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const idempotencyCache = new Map();

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const currentUser = await base44.auth.me();
    if (!currentUser || !currentUser.id) {
      return Response.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Não autenticado' } }, { status: 401 });
    }
    if (currentUser.role !== 'admin') {
      return Response.json({ success: false, error: { code: 'FORBIDDEN', message: 'Apenas administradores podem aprovar' } }, { status: 403 });
    }

    let body;
    try {
      body = await req.json();
    } catch (e) {
      return Response.json({ success: false, error: { code: 'INVALID_INPUT', message: 'Payload inválido' } }, { status: 400 });
    }

    const { employee_id, profile_id, idempotencyKey, updated_date } = body;

    if (idempotencyKey && idempotencyCache.has(idempotencyKey)) {
      const cached = idempotencyCache.get(idempotencyKey);
      return Response.json(cached.body, { status: cached.status });
    }

    if (!employee_id || typeof employee_id !== 'string') {
      return Response.json({ success: false, error: { code: 'MISSING_FIELDS', message: 'employee_id é obrigatório e deve ser texto' } }, { status: 400 });
    }

    const employee = await base44.entities.Employee.get(employee_id);
    
    if (!employee) {
      return Response.json({ success: false, error: { code: 'NOT_FOUND', message: 'Colaborador não encontrado' } }, { status: 404 });
    }

    if (currentUser.data?.workshop_id && employee.workshop_id !== currentUser.data?.workshop_id) {
      return Response.json({ success: false, error: { code: 'FORBIDDEN', message: 'Acesso cross-tenant negado' } }, { status: 403 });
    }

    if (updated_date && employee.updated_date && new Date(updated_date).getTime() !== new Date(employee.updated_date).getTime()) {
      return Response.json({ success: false, error: { code: 'CONFLICT_MODIFICATION', message: 'Registro modificado por outro usuário. Recarregue a página.' } }, { status: 409 });
    }

    async function validateBusinessRules(data, context) {
      const { employee, currentUser } = data;
      
      if (employee.user_status === 'active' || employee.user_status === 'ativo') {
        throw { code: 'INVALID_STATE', message: 'Colaborador já está ativo e aprovado' };
      }
    }

    try {
      await validateBusinessRules({ employee, currentUser }, { base44 });
    } catch (ruleError) {
      return Response.json({ success: false, error: ruleError }, { status: 400 });
    }

    console.log('📋 Employee:', { id: employee.id, email: employee.email, user_id: employee.user_id });

    // Buscar User por email OU usar user_id do Employee
    let userId = employee.user_id;
    
    if (!userId) {
      console.log('🔍 Buscando User por email:', employee.email);
      const users = await base44.entities.User.filter({ email: employee.email });
      
      console.log('👥 Users encontrados:', users?.length || 0);
      
      if (!users || users.length === 0) {
        return Response.json({ 
          success: false,
          error: { code: 'NOT_FOUND', message: 'Usuário precisa fazer o primeiro login antes de ser aprovado. Peça ao usuário para criar a senha primeiro.' }
        }, { status: 404 });
      }

      userId = users[0].id;
      console.log('✅ User encontrado:', userId);
    }

    // Buscar User atualizado para pegar dados corretos
    const userRecord = await base44.entities.User.get(userId);
    const jobRole = employee.job_role || userRecord?.job_role || 'outros';
    let finalProfileId = profile_id || employee.profile_id || userRecord?.profile_id;
    
    if (!finalProfileId) {
      const allProfiles = await base44.entities.UserProfile.list();
      const match = (allProfiles || []).find(p => 
        p.status === "ativo" && 
        p.job_roles?.includes(jobRole)
      );
      if (match) finalProfileId = match.id;
    }

    const employeeActiveStatus = employee.tipo_vinculo === 'cliente' ? 'ativo' : 'active';

    await base44.entities.User.update(userId, {
      user_status: 'active',
      approved_at: new Date().toISOString(),
      approved_by: admin.id,
      profile_id: finalProfileId || null,
      workshop_id: employee.workshop_id || null
    });

    await base44.entities.Employee.update(employee.id, {
      user_id: userId,
      user_status: employeeActiveStatus,
      profile_id: finalProfileId || null
    });

    // Buscar o perfil e vincular as custom_role_ids ao UserProfile
    if (finalProfileId) {
      try {
        const selectedProfile = await base44.entities.UserProfile.get(finalProfileId);
        
        if (selectedProfile && selectedProfile.custom_role_ids && selectedProfile.custom_role_ids.length > 0) {
          // Atualizar User com as custom_role_ids do perfil
          await base44.entities.User.update(userId, {
            custom_role_ids: selectedProfile.custom_role_ids
          });

          // Atualizar Employee também
          await base44.entities.Employee.update(employee.id, {
            custom_role_ids: selectedProfile.custom_role_ids
          });
          
          console.log('✅ Custom roles vinculadas:', selectedProfile.custom_role_ids);
        }
      } catch (error) {
        console.error('⚠️ Erro ao vincular custom roles (não crítico):', error);
      }
    }

    console.log(JSON.stringify({
      level: 'AUDIT',
      userId: currentUser.id,
      action: 'UPDATE',
      entity: 'Employee/User',
      before: { user_status: employee.user_status, profile_id: employee.profile_id },
      after: { user_status: employeeActiveStatus, profile_id: finalProfileId },
      timestamp: new Date().toISOString()
    }));

    const responseBody = { 
      success: true,
      data: {
        user_id: userId,
        profile_id: finalProfileId
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
      action: 'APPROVE_USER_ACCESS',
      message: error.message,
      timestamp: new Date().toISOString()
    }));
    return Response.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Erro interno no servidor' } }, { status: 500 });
  }
});