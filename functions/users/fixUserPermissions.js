import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email } = await req.json();

    if (!email) {
      return Response.json({ error: 'Email é obrigatório' }, { status: 400 });
    }

    // Buscar usuário
    const users = await base44.asServiceRole.entities.User.filter({ email });
    if (!users || users.length === 0) {
      return Response.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }
    const user = users[0];

    // Buscar Employee vinculado
    const employees = await base44.asServiceRole.entities.Employee.filter({ email });
    if (!employees || employees.length === 0) {
      return Response.json({ error: 'Employee não encontrado' }, { status: 404 });
    }
    const employee = employees[0];

    // Buscar perfil de Técnico ativo
    const profiles = await base44.asServiceRole.entities.UserProfile.filter({
      type: 'interno',
      status: 'ativo'
    });
    
    let techProfile = profiles.find(p => 
      p.job_roles?.includes('tecnico') || 
      p.name?.toLowerCase().includes('técnico') ||
      p.name?.toLowerCase().includes('tecnico')
    );

    // Se não encontrou, criar perfil básico de técnico
    if (!techProfile) {
      techProfile = await base44.asServiceRole.entities.UserProfile.create({
        name: 'Técnico Operacional',
        type: 'interno',
        status: 'ativo',
        permission_type: 'job_role',
        job_roles: ['tecnico'],
        description: 'Perfil para técnicos de produção',
        roles: [
          'operations.view_qgp',
          'operations.manage_tasks',
          'operations.daily_log',
          'dashboard.view'
        ]
      });
    }

    // Atualizar Employee com profile_id correto
    await base44.asServiceRole.entities.Employee.update(employee.id, {
      profile_id.id,
      user_status: 'ativo',
      job_role: 'tecnico'
    });

    // Atualizar User
    await base44.asServiceRole.entities.User.update(user.id, {
      user_status: 'ativo'
    });

    return Response.json({
      success,
      message: 'Permissões corrigidas com sucesso',
      user: {
        email.email,
        name.full_name,
        status: 'ativo'
      },
      profile: {
        id.id,
        name.name
      }
    });

  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ 
      error.message,
      details.toString()
    }, { status: 500 });
  }
});
