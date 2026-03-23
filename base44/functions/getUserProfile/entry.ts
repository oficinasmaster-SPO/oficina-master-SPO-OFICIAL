import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Autenticar usuário
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log("🔍 [getUserProfile] Buscando Employee para:", user.email);

    // Buscar Employee pelo email OU user_id do usuário usando service role
    let employees = await base44.asServiceRole.entities.Employee.filter({ 
      email: user.email 
    });

    // Se não encontrar por email, buscar por user_id
    if (!employees || employees.length === 0) {
      console.log("⚠️ [getUserProfile] Tentando buscar por user_id:", user.id);
      employees = await base44.asServiceRole.entities.Employee.filter({ 
        user_id: user.id 
      });
    }

    console.log("📦 [getUserProfile] Employees encontrados:", employees?.length || 0);

    if (!employees || employees.length === 0) {
      console.log("⚠️ [getUserProfile] Employee não encontrado para:", user.email);
      
      // Retorna perfil do próprio User se existir
      return Response.json({ 
        success: true,
        employee_id: null,
        profile_id: user.profile_id || null,
        custom_role_ids: user.custom_role_ids || [],
        job_role: user.job_role || null,
        message: 'Using User profile data'
      }, { status: 200 });
    }

    const employee = employees[0];
    console.log("✅ [getUserProfile] Employee encontrado:", employee.id);
    console.log("📋 [getUserProfile] Profile ID:", employee.profile_id);

    // Vincular user_id ao Employee se ainda não tiver
    if (!employee.user_id || employee.user_id !== user.id) {
      await base44.asServiceRole.entities.Employee.update(employee.id, {
        user_id: user.id
      });
      console.log("🔗 [getUserProfile] User vinculado ao Employee");
    }

    // Retornar sucesso mesmo se não tiver profile_id
    // O sistema de permissões tratará com permissões vazias até a aprovação
    return Response.json({ 
      success: true,
      employee_id: employee.id,
      profile_id: employee.profile_id || null,
      custom_role_ids: employee.custom_role_ids || [],
      job_role: employee.job_role || null,
      message: employee.profile_id ? 'Profile found' : 'No profile assigned yet'
    });
  } catch (error) {
    console.error("❌ [getUserProfile] Erro:", error);
    return Response.json({ 
      error: error.message || 'Internal server error',
      profile_id: null
    }, { status: 500 });
  }
});