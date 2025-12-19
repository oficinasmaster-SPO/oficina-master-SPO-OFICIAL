import { createClient } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  console.log("🔵 registerInvitedEmployee - Método:", req.method);

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Somente POST é permitido' }), 
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    const base44 = createClient(
      Deno.env.get('BASE44_APP_ID'),
      Deno.env.get('BASE44_SERVICE_ROLE_KEY')
    );
    
    const body = await req.json();
    const { token, name, email, phone, profile_picture_url } = body;

    console.log("📥 Dados recebidos:", { token, email });

    // Buscar convite
    const invites = await base44.entities.EmployeeInvite.filter({ invite_token: token });
    const invite = invites[0];

    if (!invite) {
      return new Response(
        JSON.stringify({ success: false, error: 'Convite não encontrado' }), 
        { status: 404, headers: corsHeaders }
      );
    }

    // Validações
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Convite expirado' }), 
        { status: 400, headers: corsHeaders }
      );
    }

    if (invite.status === 'concluido') {
      return new Response(
        JSON.stringify({ success: false, error: 'Convite já utilizado' }), 
        { status: 400, headers: corsHeaders }
      );
    }

    const isInternal = invite.invite_type === 'internal';
    const finalEmail = email || invite.email;

    // Buscar owner_id se necessário
    let ownerId = null;
    if (!isInternal && invite.workshop_id) {
      const workshops = await base44.entities.Workshop.filter({ id: invite.workshop_id });
      if (workshops[0]) {
        ownerId = workshops[0].owner_id;
      }
    }

    // 1. Criar/Atualizar Employee
    const existingEmps = await base44.entities.Employee.filter({ email: finalEmail });
    
    const empData = {
      full_name: name || invite.name,
      telefone: phone || '',
      profile_picture_url: profile_picture_url || '',
      position: invite.position || 'Colaborador',
      area: invite.area || 'tecnico',
      job_role: invite.job_role || 'outros',
      status: 'ativo',
      tipo_vinculo: isInternal ? 'interno' : 'cliente',
      is_internal: isInternal,
      first_login_at: new Date().toISOString()
    };

    if (!isInternal && invite.workshop_id) {
      empData.workshop_id = invite.workshop_id;
      if (ownerId) empData.owner_id = ownerId;
    }

    let employee;
    if (existingEmps && existingEmps.length > 0) {
      console.log("📝 Atualizando Employee existente");
      employee = await base44.entities.Employee.update(existingEmps[0].id, empData);
    } else {
      console.log("✨ Criando novo Employee");
      employee = await base44.entities.Employee.create({
        email: finalEmail,
        hire_date: new Date().toISOString().split('T')[0],
        ...empData
      });
    }

    console.log("✅ Employee ID:", employee.id);

    // 2. Atualizar convite
    await base44.entities.EmployeeInvite.update(invite.id, {
      status: 'acessado',
      accepted_at: new Date().toISOString(),
      employee_id: employee.id
    });

    // 3. Criar/Atualizar User (com status pending)
    const existingUsers = await base44.entities.User.filter({ email: finalEmail });

    const userData = {
      full_name: name || invite.name,
      position: invite.position || 'Colaborador',
      job_role: invite.job_role || 'outros',
      area: invite.area || 'tecnico',
      telefone: phone || '',
      profile_picture_url: profile_picture_url || '',
      is_internal: isInternal,
      user_status: 'pending', // Aguardando aprovação
      invite_id: invite.id,
      hire_date: new Date().toISOString().split('T')[0],
      first_login_at: new Date().toISOString()
    };

    if (!isInternal && invite.workshop_id) {
      userData.workshop_id = invite.workshop_id;
    }

    let userId;
    if (existingUsers && existingUsers.length > 0) {
      console.log("📝 Atualizando User existente");
      await base44.entities.User.update(existingUsers[0].id, userData);
      userId = existingUsers[0].id;
    } else {
      console.log("✨ Criando novo User");
      const newUser = await base44.entities.User.create({
        email: finalEmail,
        role: 'user',
        ...userData
      });
      userId = newUser.id;
    }

    console.log("✅ User ID:", userId);

    // 4. Vincular user_id ao Employee
    await base44.entities.Employee.update(employee.id, { user_id: userId });

    console.log("🎉 Cadastro concluído com sucesso!");

    return new Response(
      JSON.stringify({ 
        success: true, 
        employee_id: employee.id,
        user_id: userId
      }), 
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erro ao processar cadastro'
      }), 
      { status: 500, headers: corsHeaders }
    );
  }
});