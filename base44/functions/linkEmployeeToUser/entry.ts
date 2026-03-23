import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verificar autenticação
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }

    // Buscar colaborador pelo email do usuário logado
    const employees = await base44.asServiceRole.entities.Employee.filter({ 
      email: user.email 
    });

    if (!employees || employees.length === 0) {
      return Response.json({ 
        success: false, 
        error: 'Nenhum colaborador encontrado com este email' 
      }, { status: 404 });
    }

    const employee = employees[0];

    // Se já tem user_id vinculado, não precisa fazer nada
    if (employee.user_id) {
      return Response.json({ 
        success: true, 
        message: 'Colaborador já vinculado',
        employee_id: employee.id,
        already_linked: true
      });
    }

    // Vincular user_id ao colaborador
    const updatedEmployee = await base44.asServiceRole.entities.Employee.update(employee.id, {
      user_id: user.id,
      first_login_at: new Date().toISOString(),
      last_login_at: new Date().toISOString()
    });

    return Response.json({ 
      success: true, 
      message: 'Colaborador vinculado com sucesso',
      employee_id: updatedEmployee.id,
      workshop_id: updatedEmployee.workshop_id
    });

  } catch (error) {
    console.error('Erro ao vincular colaborador:', error);
    return Response.json({ 
      success: false, 
      error: error.message || 'Erro interno do servidor' 
    }, { status: 500 });
  }
});