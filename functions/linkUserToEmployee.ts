import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Autenticar usuário
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Buscar Employee pelo email do usuário
    const employees = await base44.asServiceRole.entities.Employee.filter({ 
      email: user.email 
    });

    if (!employees || employees.length === 0) {
      return Response.json({ 
        error: 'Employee not found',
        email: user.email 
      }, { status: 404 });
    }

    const employee = employees[0];

    // Vincular user_id ao Employee se ainda não tiver
    if (!employee.user_id) {
      await base44.asServiceRole.entities.Employee.update(employee.id, {
        user_id: user.id,
        first_login_at: employee.first_login_at || new Date().toISOString(),
        last_login_at: new Date().toISOString()
      });

      console.log(`✅ User ${user.id} vinculado ao Employee ${employee.id}`);
    }

    // Atualizar workshop_id no User se o Employee tiver
    if (employee.workshop_id && user.workshop_id !== employee.workshop_id) {
      await base44.auth.updateMe({
        workshop_id: employee.workshop_id
      });
      console.log(`✅ Workshop ${employee.workshop_id} vinculado ao User ${user.id}`);
    }

    return Response.json({ 
      success: true,
      employee_id: employee.id,
      user_id: user.id,
      workshop_id: employee.workshop_id
    });
  } catch (error) {
    console.error("❌ Erro ao vincular User ao Employee:", error);
    return Response.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
});