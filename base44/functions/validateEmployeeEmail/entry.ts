import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, workshop_id } = await req.json();

    if (!email) {
      return Response.json({ 
        success: false, 
        error: 'Email é obrigatório' 
      }, { status: 400 });
    }

    // Buscar colaboradores com este email
    const existingEmployees = await base44.entities.Employee.filter({ 
      email: email.toLowerCase().trim() 
    });

    if (existingEmployees && existingEmployees.length > 0) {
      // Verificar se é o mesmo workshop
      const sameWorkshop = existingEmployees.find(
        emp => emp.workshop_id === workshop_id
      );

      if (sameWorkshop) {
        return Response.json({ 
          success: false, 
          error: 'Já existe um colaborador com este email nesta oficina',
          existing_employee_id: sameWorkshop.id
        }, { status: 409 });
      }
    }

    return Response.json({ 
      success: true, 
      message: 'Email disponível' 
    });

  } catch (error) {
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});