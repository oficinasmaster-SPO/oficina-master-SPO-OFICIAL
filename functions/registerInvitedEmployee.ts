import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  // Permitir CORS e aceitar POST
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
    return Response.json({ success: false, error: 'Método não permitido' }, { status: 405 });
  }

  try {
    // Criar client diretamente com service role (não precisa de usuário autenticado)
    const { createClient } = await import('npm:@base44/sdk@0.8.4');
    const base44 = createClient(
      Deno.env.get('BASE44_APP_ID'),
      Deno.env.get('BASE44_SERVICE_ROLE_KEY')
    );
    
    const { token, name, email, phone, profile_picture_url } = await req.json();

    if (!token) {
      return Response.json({ success: false, error: 'Token não fornecido' }, { status: 400 });
    }

    console.log("🔍 Buscando convite com token:", token);

    // Buscar convite pelo token - filter é mais eficiente
    const invites = await base44.entities.EmployeeInvite.filter({ invite_token: token });
    const invite = invites[0];
    
    console.log("📋 Convite encontrado:", invite ? "SIM" : "NÃO");

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

    // Detectar tipo de convite usando campo explícito
    const isInternalUser = invite.invite_type === 'internal';

    console.log("🔍 Metadados do convite:", invite.metadata);
    
    console.log("🔍 Tipo de convite:", invite.invite_type);
    
    // Validar company_id para internos ou workshop_id para colaboradores
    if (isInternalUser && !invite.company_id) {
      return Response.json({ 
        success: false, 
        error: 'Company obrigatório para usuários internos' 
      }, { status: 400 });
    }

    if (!isInternalUser && !invite.workshop_id) {
      return Response.json({ 
        success: false, 
        error: 'Workshop obrigatório para colaboradores de oficina' 
      }, { status: 400 });
    }

    let workshop = null;
    let ownerId = null;

    if (!isInternalUser) {
      // Buscar oficina apenas para usuários externos
      const workshops = await base44.asServiceRole.entities.Workshop.filter({ id: invite.workshop_id });
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
      employee = await base44.asServiceRole.entities.Employee.update(existingEmployees[0].id, {
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
      
      employee = await base44.asServiceRole.entities.Employee.create(createData);
      console.log("✅ Employee criado:", employee.id);
    }

    // Atualizar convite para "acessado"
    await base44.asServiceRole.entities.EmployeeInvite.update(invite.id, {
      status: 'acessado',
      accepted_at: new Date().toISOString(),
      employee_id: employee.id
    });

    console.log("✅ Convite atualizado para 'acessado'");

    // Criar User com status pending para permitir login (mas acesso bloqueado até aprovação)
    console.log("📝 Criando User com status pending...");

    let userId;
    try {
      // Tentar buscar user existente (pode não existir ainda)
      let existingUsers = [];
      try {
        existingUsers = await base44.asServiceRole.entities.User.filter({ email: email || invite.email });
      } catch (userFetchError) {
        console.log("⚠️ Não foi possível buscar Users (normal se não existir ainda)");
      }

      // Construir dados completos do User baseados no Employee e no Invite
      const userData = {
        full_name: name || invite.name,
        position: invite.position, // Cargo real do convite
        job_role: invite.job_role || 'outros',
        area: invite.area || (isInternalUser ? 'administrativo' : 'tecnico'),
        telefone: phone || invite.metadata?.telefone || '',
        profile_picture_url: profile_picture_url || '',
        is_internal: isInternalUser,
        user_status: 'pending',
        invite_id: invite.id,
        hire_date: new Date().toISOString().split('T')[0]
      };

      // Adicionar workshop_id apenas para colaboradores de oficina
      if (!isInternalUser && invite.workshop_id) {
        userData.workshop_id = invite.workshop_id;
      }

      // Adicionar profile_id e role para usuários internos (será usado na aprovação)
      if (isInternalUser && invite.metadata?.profile_id) {
        userData.profile_id = invite.metadata.profile_id;
      }

      // Para usuários internos, adicionar role se disponível no metadata
      if (isInternalUser && invite.metadata?.role) {
        userData.role = invite.metadata.role;
      }

      console.log("📊 Dados do User a serem salvos:", userData);

      if (existingUsers && existingUsers.length > 0) {
        await base44.asServiceRole.entities.User.update(existingUsers[0].id, userData);
        userId = existingUsers[0].id;
        console.log("✅ User atualizado:", userId);
      } else {
        const newUser = await base44.asServiceRole.entities.User.create({
          email: email || invite.email,
          role: isInternalUser ? (invite.metadata?.role || 'user') : 'user',
          ...userData
        });
        userId = newUser.id;
        console.log("✅ User criado com status pending:", userId);
      }

      // Vincular user_id ao Employee E garantir que os dados estejam sincronizados
      await base44.asServiceRole.entities.Employee.update(employee.id, {
        user_id: userId,
        full_name: name || invite.name,
        telefone: phone || invite.metadata?.telefone || '',
        profile_picture_url: profile_picture_url || '',
        first_login_at: new Date().toISOString()
      });

      console.log("✅ Employee atualizado com user_id e dados sincronizados");

    } catch (userError) {
      console.error("⚠️ Erro ao criar User:", userError);
      console.error("⚠️ Stack completo:", userError.stack);
      return Response.json({ 
        success: false, 
        error: 'Erro ao criar conta de acesso: ' + userError.message 
      }, { status: 500 });
    }

    console.log("✅ Cadastro concluído - usuário pode fazer login (status: pending)");
    console.log("📊 Employee ID:", employee.id);
    console.log("📊 User ID:", userId);

    return Response.json({ 
      success: true, 
      employee_id: employee.id,
      user_id: userId,
      message: 'Cadastro concluído! Você pode fazer login, mas seu acesso será liberado após aprovação do administrador.'
    });

  } catch (error) {
    console.error('❌ Erro ao registrar colaborador:', error);
    console.error('❌ Stack trace completo:', error.stack);
    return Response.json({ 
      success: false, 
      error: error.message || 'Erro interno do servidor',
      details: error.stack
    }, { status: 500 });
  }
});