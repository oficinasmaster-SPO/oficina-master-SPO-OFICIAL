import { createClient } from 'npm:@base44/sdk@0.8.4';

export default async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Accept'
      }
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Método não permitido - use POST' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  try {
    const base44 = createClient(
      Deno.env.get('BASE44_APP_ID'),
      Deno.env.get('BASE44_SERVICE_ROLE_KEY')
    );
    
    const { token, name, email, phone, profile_picture_url } = await req.json();

    if (!token) {
      return new Response(JSON.stringify({ success: false, error: 'Token não fornecido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Buscar convite
    const invites = await base44.entities.EmployeeInvite.filter({ invite_token: token });
    const invite = invites[0];

    if (!invite) {
      return new Response(JSON.stringify({ success: false, error: 'Convite não encontrado' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return new Response(JSON.stringify({ success: false, error: 'Convite expirado' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    if (invite.status === 'concluido') {
      return new Response(JSON.stringify({ success: false, error: 'Convite já utilizado' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const isInternalUser = invite.invite_type === 'internal';
    
    if (isInternalUser && !invite.company_id) {
      return new Response(JSON.stringify({ success: false, error: 'Company obrigatório' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    if (!isInternalUser && !invite.workshop_id) {
      return new Response(JSON.stringify({ success: false, error: 'Workshop obrigatório' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    let ownerId = null;
    if (!isInternalUser) {
      const workshops = await base44.entities.Workshop.filter({ id: invite.workshop_id });
      const workshop = workshops[0];
      ownerId = workshop ? workshop.owner_id : null;
    }

    const filterQuery = isInternalUser 
      ? { email: email || invite.email, tipo_vinculo: 'interno' }
      : { email: email || invite.email, workshop_id: invite.workshop_id };
    
    const existingEmployees = await base44.entities.Employee.filter(filterQuery);

    let employee;
    const employeeData = {
      full_name: name || invite.name,
      telefone: phone || '(00) 00000-0000',
      profile_picture_url: profile_picture_url || '',
      position: invite.position,
      area: invite.area || (isInternalUser ? 'administrativo' : 'tecnico'),
      job_role: invite.job_role || (isInternalUser ? 'consultor' : 'outros'),
      status: 'ativo',
      tipo_vinculo: isInternalUser ? 'interno' : 'cliente',
      is_internal: isInternalUser,
      first_login_at: new Date().toISOString()
    };

    if (existingEmployees && existingEmployees.length > 0) {
      employee = await base44.entities.Employee.update(existingEmployees[0].id, {
        ...employeeData,
        owner_id: ownerId
      });
    } else {
      const createData = {
        email: email || invite.email,
        hire_date: new Date().toISOString().split('T')[0],
        ...employeeData
      };
      
      if (!isInternalUser) {
        createData.workshop_id = invite.workshop_id;
        createData.owner_id = ownerId;
      }
      
      employee = await base44.entities.Employee.create(createData);
    }

    await base44.entities.EmployeeInvite.update(invite.id, {
      status: 'acessado',
      accepted_at: new Date().toISOString(),
      employee_id: employee.id
    });

    let userId;
    let existingUsers = [];
    try {
      existingUsers = await base44.entities.User.filter({ email: email || invite.email });
    } catch (err) {
      console.log("Não foi possível buscar Users");
    }

    const userData = {
      full_name: name || invite.name,
      position: invite.position,
      job_role: invite.job_role || 'outros',
      area: invite.area || (isInternalUser ? 'administrativo' : 'tecnico'),
      telefone: phone || invite.metadata?.telefone || '',
      profile_picture_url: profile_picture_url || '',
      is_internal: isInternalUser,
      user_status: 'pending',
      invite_id: invite.id,
      hire_date: new Date().toISOString().split('T')[0]
    };

    if (!isInternalUser && invite.workshop_id) {
      userData.workshop_id = invite.workshop_id;
    }

    if (isInternalUser && invite.metadata?.profile_id) {
      userData.profile_id = invite.metadata.profile_id;
    }

    if (isInternalUser && invite.metadata?.role) {
      userData.role = invite.metadata.role;
    }

    if (existingUsers && existingUsers.length > 0) {
      await base44.entities.User.update(existingUsers[0].id, userData);
      userId = existingUsers[0].id;
    } else {
      const newUser = await base44.entities.User.create({
        email: email || invite.email,
        role: isInternalUser ? (invite.metadata?.role || 'user') : 'user',
        ...userData
      });
      userId = newUser.id;
    }

    await base44.entities.Employee.update(employee.id, {
      user_id: userId,
      full_name: name || invite.name,
      telefone: phone || invite.metadata?.telefone || '',
      profile_picture_url: profile_picture_url || '',
      first_login_at: new Date().toISOString()
    });

    return new Response(JSON.stringify({ 
      success: true, 
      employee_id: employee.id,
      user_id: userId,
      message: 'Cadastro concluído!'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (error) {
    console.error('Erro:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'Erro interno'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
};