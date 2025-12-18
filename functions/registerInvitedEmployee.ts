Deno.serve(async (req) => {
  // Permitir CORS
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
    return new Response(JSON.stringify({ success: false, error: 'Método não permitido' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  try {
    // Criar client com service role
    const { createClient } = await import('npm:@base44/sdk@0.8.4');
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

    console.log("🔍 Buscando convite com token:", token);

    // Buscar convite
    const invites = await base44.entities.EmployeeInvite.filter({ invite_token: token });
    const invite = invites[0];
    
    console.log("📋 Convite encontrado:", invite ? "SIM" : "NÃO");

    if (!invite) {
      return new Response(JSON.stringify({ success: false, error: 'Convite não encontrado' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Verificar se expirou
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return new Response(JSON.stringify({ success: false, error: 'Convite expirado' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Verificar se já foi concluído
    if (invite.status === 'concluido') {
      return new Response(JSON.stringify({ success: false, error: 'Convite já utilizado' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Detectar tipo de convite
    const isInternalUser = invite.invite_type === 'internal';

    console.log("🔍 Tipo de convite:", invite.invite_type);
    
    // Validar company_id para internos ou workshop_id para colaboradores
    if (isInternalUser && !invite.company_id) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Company obrigatório para usuários internos' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    if (!isInternalUser && !invite.workshop_id) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Workshop obrigatório para colaboradores de oficina' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    let workshop = null;
    let ownerId = null;

    if (!isInternalUser) {
      // Buscar oficina apenas para usuários externos
      const workshops = await base44.entities.Workshop.filter({ id: invite.workshop_id });
      workshop = workshops[0];
      ownerId = workshop ? workshop.owner_id : null;
    }

    // Verificar se já existe colaborador com este email
    const filterQuery = isInternalUser 
      ? { email: email || invite.email, tipo_vinculo: 'interno' }
      : { email: email || invite.email, workshop_id: invite.workshop_id };
    
    const existingEmployees = await base44.entities.Employee.filter(filterQuery);

    console.log("👤 Employee existente?", existingEmployees.length > 0);

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
      // Atualizar existente
      employee = await base44.entities.Employee.update(existingEmployees[0].id, {
        ...employeeData,
        owner_id: ownerId
      });
      console.log("✅ Employee atualizado:", employee.id);
    } else {
      // Criar novo
      const createData = {
        email: email || invite.email,
        hire_date: new Date().toISOString().split('T')[0],
        ...employeeData
      };
      
      // Adicionar workshop_id apenas se não for interno
      if (!isInternalUser) {
        createData.workshop_id = invite.workshop_id;
        createData.owner_id = ownerId;
      }
      
      employee = await base44.entities.Employee.create(createData);
      console.log("✅ Employee criado:", employee.id);
    }

    // Atualizar convite para "acessado"
    await base44.entities.EmployeeInvite.update(invite.id, {
      status: 'acessado',
      accepted_at: new Date().toISOString(),
      employee_id: employee.id
    });

    console.log("✅ Convite atualizado para 'acessado'");

    // Criar User com status pending
    console.log("📝 Criando User com status pending...");

    let userId;
    try {
      // Tentar buscar user existente
      let existingUsers = [];
      try {
        existingUsers = await base44.entities.User.filter({ email: email || invite.email });
      } catch (userFetchError) {
        console.log("⚠️ Não foi possível buscar Users");
      }

      // Construir dados do User
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

      // Adicionar workshop_id apenas para colaboradores
      if (!isInternalUser && invite.workshop_id) {
        userData.workshop_id = invite.workshop_id;
      }

      // Adicionar profile_id e role para internos
      if (isInternalUser && invite.metadata?.profile_id) {
        userData.profile_id = invite.metadata.profile_id;
      }

      if (isInternalUser && invite.metadata?.role) {
        userData.role = invite.metadata.role;
      }

      console.log("📊 Dados do User:", userData);

      if (existingUsers && existingUsers.length > 0) {
        await base44.entities.User.update(existingUsers[0].id, userData);
        userId = existingUsers[0].id;
        console.log("✅ User atualizado:", userId);
      } else {
        const newUser = await base44.entities.User.create({
          email: email || invite.email,
          role: isInternalUser ? (invite.metadata?.role || 'user') : 'user',
          ...userData
        });
        userId = newUser.id;
        console.log("✅ User criado com status pending:", userId);
      }

      // Vincular user_id ao Employee
      await base44.entities.Employee.update(employee.id, {
        user_id: userId,
        full_name: name || invite.name,
        telefone: phone || invite.metadata?.telefone || '',
        profile_picture_url: profile_picture_url || '',
        first_login_at: new Date().toISOString()
      });

      console.log("✅ Employee atualizado com user_id");

    } catch (userError) {
      console.error("⚠️ Erro ao criar User:", userError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Erro ao criar conta de acesso: ' + userError.message 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    console.log("✅ Cadastro concluído");

    return new Response(JSON.stringify({ 
      success: true, 
      employee_id: employee.id,
      user_id: userId,
      message: 'Cadastro concluído! Você pode fazer login, mas seu acesso será liberado após aprovação.'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (error) {
    console.error('❌ Erro ao registrar colaborador:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'Erro interno do servidor'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
});