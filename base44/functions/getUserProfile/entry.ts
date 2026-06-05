import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Autenticar usuário
    const authUser = await base44.auth.me();
    if (!authUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse do payload
    const { user_id } = await req.json().catch(() => ({}));
    const targetUserId = user_id || authUser.id;

    console.log("🔍 [getUserProfile] Buscando dados para user_id:", targetUserId);

    // Buscar User alvo
    const users = await base44.asServiceRole.entities.User.filter({ id: targetUserId });
    const targetUser = Array.isArray(users) ? users[0] : null;
    
    if (!targetUser) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Buscar Employee pelo user_id
    let employees = await base44.asServiceRole.entities.Employee.filter({ 
      user_id: targetUserId 
    });

    console.log("📦 [getUserProfile] Employees encontrados:", employees?.length || 0);

    let employeeData = null;
    let workshopData = null;
    let profileData = null;

    if (employees && employees.length > 0) {
      const employee = employees[0];
      employeeData = employee;
      console.log("✅ [getUserProfile] Employee encontrado:", employee.id);

      // Buscar Workshop
      if (employee.workshop_id) {
        const workshops = await base44.asServiceRole.entities.Workshop.filter({ id: employee.workshop_id });
        workshopData = Array.isArray(workshops) ? workshops[0] : null;
      }

      // Buscar UserProfile
      if (employee.profile_id) {
        const profiles = await base44.asServiceRole.entities.UserProfile.filter({ id: employee.profile_id });
        profileData = Array.isArray(profiles) ? profiles[0] : null;
      }
    }

    // Retornar dados completos
    return Response.json({ 
      success: true,
      user: targetUser,
      employee: employeeData,
      workshop: workshopData,
      profile: profileData,
      message: employeeData ? 'Complete data returned' : 'User found but no employee record'
    });
  } catch (error) {
    console.error("❌ [getUserProfile] Erro:", error);
    return Response.json({ 
      error: error.message || 'Internal server error',
      profile_id: null
    }, { status: 500 });
  }
});