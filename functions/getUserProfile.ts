import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Autenticar usuário
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log("🔍 [getUserProfile] Buscando Employee para:", user.email);

    // Buscar Employee pelo email do usuário usando service role
    const employees = await base44.asServiceRole.entities.Employee.filter({ 
      email: user.email 
    });

    console.log("📦 [getUserProfile] Employees encontrados:", employees?.length || 0);

    if (!employees || employees.length === 0) {
      return Response.json({ 
        error: 'Employee not found',
        email: user.email,
        profile_id: null
      }, { status: 404 });
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

    return Response.json({ 
      success: true,
      employee_id: employee.id,
      profile_id: employee.profile_id,
      custom_role_ids: employee.custom_role_ids || [],
      job_role: employee.job_role
    });
  } catch (error) {
    console.error("❌ [getUserProfile] Erro:", error);
    return Response.json({ 
      error: error.message || 'Internal server error',
      profile_id: null
    }, { status: 500 });
  }
});