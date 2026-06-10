import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Coletar todos os usuários (não-disabled, não-service)
    const allUsers = [];
    let skip = 0;
    const limit = 200;
    let hasMore = true;
    
    while (hasMore) {
      const batch = await base44.asServiceRole.entities.User.list('-created_date', limit, skip);
      if (!batch || batch.length === 0) { hasMore = false; break; }
      allUsers.push(...batch);
      skip += batch.length;
      if (batch.length < limit) hasMore = false;
    }
    
    // Coletar todos os Employees
    const allEmployees = [];
    skip = 0;
    hasMore = true;
    
    while (hasMore) {
      const batch = await base44.asServiceRole.entities.Employee.list('-created_date', limit, skip);
      if (!batch || batch.length === 0) { hasMore = false; break; }
      allEmployees.push(...batch);
      skip += batch.length;
      if (batch.length < limit) hasMore = false;
    }
    
    // Set de user_ids que têm Employee vinculado
    const employeeUserIds = new Set();
    for (const emp of allEmployees) {
      const uid = emp.data?.user_id || emp.user_id;
      if (uid) employeeUserIds.add(uid);
    }
    
    // Classificar usuários
    const totalUsers = allUsers.length;
    const activeUsers = allUsers.filter(u => !u.disabled && !u.is_service);
    const activeWithEmployee = activeUsers.filter(u => employeeUserIds.has(u.id));
    const activeWithoutEmployee = activeUsers.filter(u => !employeeUserIds.has(u.id));
    const adminsWithoutEmployee = activeWithoutEmployee.filter(u => u.role === 'admin');
    const usersWithoutEmployee = activeWithoutEmployee.filter(u => u.role !== 'admin');
    
    // Detalhes dos órfãos
    const orphansDetail = activeWithoutEmployee.map(u => ({
      id: u.id,
      email: u.email,
      role: u.role,
      full_name: u.full_name,
      has_workshop_id: !!(u.data?.workshop_id || u.workshop_id),
      workshop_id: u.data?.workshop_id || u.workshop_id || null,
      created_date: u.created_date,
      updated_date: u.updated_date,
      cadastro_em_andamento: u.data?.cadastro_em_andamento || false,
      first_access_completed: u.data?.first_access_completed,
      profile_completed: u.data?.profile_completed,
    }));
    
    return Response.json({
      summary: {
        total_users: totalUsers,
        total_employees: allEmployees.length,
        employees_with_user_id: allEmployees.filter(e => (e.data?.user_id || e.user_id)).length,
        employees_without_user_id: allEmployees.filter(e => !(e.data?.user_id || e.user_id)).length,
        active_users: activeUsers.length,
        active_users_with_employee: activeWithEmployee.length,
        active_users_without_employee: activeWithoutEmployee.length,
        admins_without_employee: adminsWithoutEmployee.length,
        regular_users_without_employee: usersWithoutEmployee.length,
      },
      orphans: orphansDetail,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});