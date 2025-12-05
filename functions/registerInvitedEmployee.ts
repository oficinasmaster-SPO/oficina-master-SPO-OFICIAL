import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { token, name, email, phone, profile_picture_url } = await req.json();

    if (!token) {
      return Response.json({ success: false, error: 'Token não fornecido' }, { status: 400 });
    }

    // Buscar convite pelo token usando service role
    const invites = await base44.asServiceRole.entities.EmployeeInvite.list();
    const invite = invites.find(inv => inv.invite_token === token);

    if (!invite) {
      return Response.json({ success: false, error: 'Convite não encontrado' }, { status: 404 });
    }

    // Verificar se expirou
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return Response.json({ success: false, error: 'Convite expirado' }, { status: 400 });
    }

    // Verificar se já foi concluído
    if (invite.status === 'concluido') {
      return Response.json({ success: false, error: 'Convite já utilizado' }, { status: 400 });
    }

    // Buscar a oficina para obter o owner_id
    const workshops = await base44.asServiceRole.entities.Workshop.filter({ id: invite.workshop_id });
    const workshop = workshops[0];
    const ownerId = workshop ? workshop.owner_id : null;

    // Verificar se já existe colaborador com este email na oficina
    const existingEmployees = await base44.asServiceRole.entities.Employee.filter({ 
      email: email || invite.email,
      workshop_id: invite.workshop_id 
    });

    let employee;
    if (existingEmployees && existingEmployees.length > 0) {
      // Atualizar existente
      employee = await base44.asServiceRole.entities.Employee.update(existingEmployees[0].id, {
        full_name: name || invite.name,
        telefone: phone || '',
        profile_picture_url: profile_picture_url || '',
        position: invite.position,
        area: invite.area,
        job_role: invite.job_role || 'outros',
        permission_level: invite.initial_permission || 'colaborador',
        status: 'ativo',
        owner_id: ownerId // Garantir que owner_id esteja setado
      });
    } else {
      // Criar novo
      employee = await base44.asServiceRole.entities.Employee.create({
        workshop_id: invite.workshop_id,
        owner_id: ownerId, // Adicionar owner_id
        full_name: name || invite.name,
        email: email || invite.email,
        telefone: phone || '',
        profile_picture_url: profile_picture_url || '',
        position: invite.position,
        area: invite.area,
        job_role: invite.job_role || 'outros',
        hire_date: new Date().toISOString().split('T')[0],
        status: 'ativo',
        permission_level: invite.initial_permission || 'colaborador'
      });
    }

    // Atualizar o convite para concluído
    await base44.asServiceRole.entities.EmployeeInvite.update(invite.id, {
      status: 'concluido',
      completed_at: new Date().toISOString(),
      employee_id: employee.id
    });

    return Response.json({ 
      success: true, 
      employee_id: employee.id,
      message: 'Colaborador registrado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao registrar colaborador:', error);
    return Response.json({ 
      success: false, 
      error: error.message || 'Erro interno do servidor' 
    }, { status: 500 });
  }
});