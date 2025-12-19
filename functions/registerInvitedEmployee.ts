import { createClient } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }), 
      { status: 405, headers }
    );
  }

  try {
    // Initialize Base44 client
    const base44 = createClient(
      Deno.env.get('BASE44_APP_ID'),
      Deno.env.get('BASE44_SERVICE_ROLE_KEY')
    );
    
    // Parse request body
    const body = await req.json();
    const { token, name, email, phone, profile_picture_url } = body;

    console.log('📥 Request received:', { token, email });

    // Find invite by token
    const invites = await base44.entities.EmployeeInvite.filter({ invite_token: token });
    const invite = invites?.[0];

    if (!invite) {
      return new Response(
        JSON.stringify({ success: false, error: 'Convite não encontrado' }), 
        { status: 404, headers }
      );
    }

    // Check if expired
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Convite expirado' }), 
        { status: 400, headers }
      );
    }

    // Check if already used
    if (invite.status === 'concluido') {
      return new Response(
        JSON.stringify({ success: false, error: 'Convite já utilizado' }), 
        { status: 400, headers }
      );
    }

    const isInternal = invite.invite_type === 'internal';
    
    // Get workshop owner
    let ownerId = null;
    if (!isInternal && invite.workshop_id) {
      const workshops = await base44.entities.Workshop.filter({ id: invite.workshop_id });
      ownerId = workshops[0]?.owner_id;
    }

    // Create or update Employee
    const existingEmps = await base44.entities.Employee.filter({ 
      email: email || invite.email,
      ...(isInternal ? { tipo_vinculo: 'interno' } : { workshop_id: invite.workshop_id })
    });

    const empData = {
      full_name: name || invite.name,
      telefone: phone || '',
      profile_picture_url: profile_picture_url || '',
      position: invite.position,
      area: invite.area || 'tecnico',
      job_role: invite.job_role || 'outros',
      status: 'ativo',
      tipo_vinculo: isInternal ? 'interno' : 'cliente',
      is_internal: isInternal,
      first_login_at: new Date().toISOString()
    };

    let employee;
    if (existingEmps?.[0]) {
      employee = await base44.entities.Employee.update(existingEmps[0].id, {
        ...empData,
        owner_id: ownerId
      });
    } else {
      employee = await base44.entities.Employee.create({
        email: email || invite.email,
        hire_date: new Date().toISOString().split('T')[0],
        ...empData,
        ...(isInternal ? {} : { workshop_id: invite.workshop_id, owner_id: ownerId })
      });
    }

    console.log('✅ Employee created:', employee.id);

    // Update invite status
    await base44.entities.EmployeeInvite.update(invite.id, {
      status: 'acessado',
      accepted_at: new Date().toISOString(),
      employee_id: employee.id
    });

    // Create or update User
    const existingUsers = await base44.entities.User.filter({ email: email || invite.email });

    const userData = {
      full_name: name || invite.name,
      position: invite.position,
      job_role: invite.job_role || 'outros',
      area: invite.area || 'tecnico',
      telefone: phone || '',
      profile_picture_url: profile_picture_url || '',
      is_internal: isInternal,
      user_status: 'pending',
      invite_id: invite.id,
      hire_date: new Date().toISOString().split('T')[0],
      first_login_at: new Date().toISOString()
    };

    if (!isInternal && invite.workshop_id) {
      userData.workshop_id = invite.workshop_id;
    }

    if (isInternal && invite.metadata) {
      if (invite.metadata.profile_id) userData.profile_id = invite.metadata.profile_id;
      if (invite.metadata.role) userData.role = invite.metadata.role;
    }

    let userId;
    if (existingUsers?.[0]) {
      await base44.entities.User.update(existingUsers[0].id, userData);
      userId = existingUsers[0].id;
    } else {
      const newUser = await base44.entities.User.create({
        email: email || invite.email,
        role: isInternal ? (invite.metadata?.role || 'user') : 'user',
        ...userData
      });
      userId = newUser.id;
    }

    console.log('✅ User created:', userId);

    // Link user to employee
    await base44.entities.Employee.update(employee.id, { user_id: userId });

    // Success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        employee_id: employee.id,
        user_id: userId
      }), 
      { status: 200, headers }
    );

  } catch (error) {
    console.error('❌ Error:', error.message);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }), 
      { status: 500, headers }
    );
  }
});