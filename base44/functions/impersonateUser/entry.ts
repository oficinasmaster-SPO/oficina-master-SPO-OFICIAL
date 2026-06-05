import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verificar se é admin
    const admin = await base44.auth.me();
    if (!admin || admin.role !== 'admin') {
      return Response.json({ 
        error: 'Apenas administradores podem impersonar usuários' 
      }, { status: 403 });
    }

    const { target_user_id } = await req.json();

    if (!target_user_id) {
      return Response.json({ error: 'ID do usuário é obrigatório' }, { status: 400 });
    }

    console.log(`🎭 Admin ${admin.email} impersonando usuário:`, target_user_id);

    // Buscar usuário alvo
    const targetUser = await base44.asServiceRole.entities.User.get(target_user_id);
    
    if (!targetUser) {
      return Response.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Buscar Employee vinculado para dados extras
    let employeeData = null;
    try {
      const employees = await base44.asServiceRole.entities.Employee.filter({ user_id: target_user_id });
      if (employees && employees.length > 0) {
        employeeData = employees[0];
      }
    } catch (e) {
      console.log('Sem employee vinculado:', e.message);
    }

    // Registrar auditoria
    try {
      await base44.asServiceRole.functions.invoke('logRBACAction', {
        action: 'impersonation_started',
        admin_id: admin.id,
        admin_email: admin.email,
        target_user_id: targetUser.id,
        target_email: targetUser.email,
        target_name: targetUser.full_name,
        timestamp: new Date().toISOString()
      });
    } catch (auditError) {
      console.warn("⚠️ Auditoria falhou (não crítico):", auditError.message);
    }

    console.log("✅ Dados de impersonação preparados com sucesso");

    return Response.json({ 
      success: true,
      message: `Visualizando como: ${targetUser.email}`,
      admin: {
        id: admin.id,
        email: admin.email,
        full_name: admin.full_name
      },
      target_user: {
        id: targetUser.id,
        email: targetUser.email,
        full_name: targetUser.full_name,
        role: targetUser.role,
        workshop_id: targetUser.workshop_id || targetUser.data?.workshop_id,
        position: employeeData?.position || null,
        job_role: employeeData?.job_role || null,
        profile_id: employeeData?.profile_id || null,
        user_type: employeeData?.user_type || null,
      }
    });

  } catch (error) {
    console.error('❌ Erro ao impersonar usuário:', error);
    return Response.json({ 
      success: false, 
      error: error.message || 'Erro ao impersonar usuário' 
    }, { status: 500 });
  }
});