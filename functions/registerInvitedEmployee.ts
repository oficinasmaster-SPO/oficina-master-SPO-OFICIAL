import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  try {
    // CRITICAL: Usar createClientFromRequest e então asServiceRole
    const base44 = createClientFromRequest(req);
    
    const { token, name, email, phone, profile_picture_url } = await req.json();

    console.log("🔍 Processando token:", token);

    // Buscar convite usando service role
    const invites = await base44.asServiceRole.entities.EmployeeInvite.filter({ invite_token: token });
    const invite = invites[0];

    if (!invite) {
      return Response.json({ success: false, error: 'Convite não encontrado' }, { status: 404 });
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return Response.json({ success: false, error: 'Convite expirado' }, { status: 400 });
    }

    if (invite.status === 'concluido') {
      return Response.json({ success: false, error: 'Convite já utilizado' }, { status: 400 });
    }

    const isInternal = invite.invite_type === 'internal';
    
    // Buscar owner se necessário
    let ownerId = null;
    if (!isInternal && invite.workshop_id) {
      const workshops = await base44.asServiceRole.entities.Workshop.filter({ id: invite.workshop_id });
      ownerId = workshops[0]?.owner_id;
    }

    // Employee
    const existingEmps = await base44.asServiceRole.entities.Employee.filter({ 
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
      employee = await base44.asServiceRole.entities.Employee.update(existingEmps[0].id, {
        ...empData,
        owner_id: ownerId
      });
    } else {
      employee = await base44.asServiceRole.entities.Employee.create({
        email: email || invite.email,
        hire_date: new Date().toISOString().split('T')[0],
        ...empData,
        ...(isInternal ? {} : { workshop_id: invite.workshop_id, owner_id: ownerId })
      });
    }

    console.log("✅ Employee:", employee.id);

    // Atualizar convite
    await base44.asServiceRole.entities.EmployeeInvite.update(invite.id, {
      status: 'acessado',
      accepted_at: new Date().toISOString(),
      employee_id: employee.id
    });

    // User
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email: email || invite.email });

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
      await base44.asServiceRole.entities.User.update(existingUsers[0].id, userData);
      userId = existingUsers[0].id;
    } else {
      const newUser = await base44.asServiceRole.entities.User.create({
        email: email || invite.email,
        role: isInternal ? (invite.metadata?.role || 'user') : 'user',
        ...userData
      });
      userId = newUser.id;
    }

    console.log("✅ User:", userId);

    await base44.asServiceRole.entities.Employee.update(employee.id, { user_id: userId });

    return Response.json({ 
      success: true, 
      employee_id: employee.id,
      user_id: userId
    });

  } catch (error) {
    console.error('❌ Erro:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});