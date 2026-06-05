import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Apenas administradores podem listar usuários externos' }, { status: 403 });
    }

    // Busca todas as oficinas
    const workshops = await base44.entities.Workshop.list();
    
    // Busca todos os employees externos
    const allEmployees = await base44.entities.Employee.list();
    const externalEmployees = allEmployees.filter(e => e.user_type === 'external' || e.tipo_vinculo === 'cliente');

    // Agrupa por oficina
    const result = [];
    
    for (const workshop of workshops) {
      const employeesInWorkshop = externalEmployees.filter(e => e.workshop_id === workshop.id);
      
      if (employeesInWorkshop.length > 0) {
        // Busca usuários vinculados a estes employees
        const userIds = employeesInWorkshop.map(e => e.user_id).filter(Boolean);
        let usersInWorkshop = [];
        
        if (userIds.length > 0) {
          const allUsers = await base44.entities.User.list();
          usersInWorkshop = allUsers.filter(u => userIds.includes(u.id));
        }

        result.push({
          workshop_id: workshop.id,
          workshop_name: workshop.name,
          external_users: employeesInWorkshop.map(emp => {
            const user = usersInWorkshop.find(u => u.id === emp.user_id);
            return {
              employee_id: emp.id,
              user_id: emp.user_id,
              full_name: emp.full_name || user?.full_name || 'Sem nome',
              email: emp.email || user?.email || '',
              profile_id: emp.profile_id,
              job_role: emp.job_role,
              user_type: emp.user_type,
              status: emp.status || user?.user_status
            };
          })
        });
      }
    }

    return Response.json({ workshops: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});