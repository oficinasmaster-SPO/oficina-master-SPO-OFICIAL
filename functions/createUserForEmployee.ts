import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { employee_data, workshop_id } = await req.json();

    if (!employee_data || !workshop_id) {
      return Response.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    // Verificar se usuário já existe
    const existingUsers = await base44.asServiceRole.entities.User.filter({ 
      email: employee_data.email 
    });

    if (existingUsers && existingUsers.length > 0) {
      // Atualizar usuário existente com dados da empresa
      await base44.asServiceRole.entities.User.update(existingUsers[0].id, {
        workshop_id: workshop_id,
        position: employee_data.position,
        job_role: employee_data.job_role,
        area: employee_data.area
      });

      return Response.json({
        success: true,
        user_id: existingUsers[0].id,
        message: 'Usuário existente atualizado'
      });
    }

    // Criar novo usuário
    const newUser = await base44.asServiceRole.entities.User.create({
      email: employee_data.email,
      full_name: employee_data.full_name,
      workshop_id: workshop_id,
      position: employee_data.position,
      job_role: employee_data.job_role,
      area: employee_data.area,
      role: 'user'
    });

    return Response.json({
      success: true,
      user_id: newUser.id,
      message: 'Usuário criado com sucesso'
    });

  } catch (error) {
    console.error("Error creating user:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});