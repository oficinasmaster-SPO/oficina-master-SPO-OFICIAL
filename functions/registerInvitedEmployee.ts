import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { token, name, email, phone, profile_picture_url } = await req.json();

    if (!token) {
      return Response.json({ success: false, error: 'Token não fornecido' }, { status: 400 });
    }

    console.log("🔍 Buscando convite com token:", token);

    // Buscar convite pelo token usando service role - filter é mais eficiente
    const invites = await base44.asServiceRole.entities.EmployeeInvite.filter({ invite_token: token });
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
    
    const existingEmployees = await base44.asServiceRole.entities.Employee.filter(filterQuery);

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

    // Atualizar convite com status de aceito
    await base44.asServiceRole.entities.EmployeeInvite.update(invite.id, {
      status: 'concluido',
      completed_at: new Date().toISOString(),
      employee_id: employee.id,
      accepted_at: new Date().toISOString(),
      created_user_id: employee.id
    });

    console.log("✅ Convite marcado como concluído e token invalidado");

    // NÃO criar User aqui - será criado no primeiro login
    console.log("ℹ️ User será criado quando o usuário fizer login pela primeira vez");

    // Criar permissões agora, antes do primeiro login
    try {
      if (isInternalUser && invite.metadata?.profile_id) {
        console.log("🔐 Criando permissões para usuário interno...");
        const profile = await base44.asServiceRole.entities.UserProfile.get(invite.metadata.profile_id);

        if (profile) {
          await base44.asServiceRole.entities.UserPermission.create({
            user_id: employee.id,
            user_email: email || invite.email,
            profile_id: invite.metadata.profile_id,
            profile_name: profile.name,
            custom_roles: profile.roles || [],
            custom_role_ids: profile.custom_role_ids || [],
            module_permissions: profile.module_permissions || {},
            sidebar_permissions: profile.sidebar_permissions || {},
            is_active: true,
            created_at: new Date().toISOString()
          });
          console.log("✅ Permissões internas criadas!");
        }
      } else if (!isInternalUser && invite.workshop_id) {
        console.log("🔐 Criando permissões para colaborador de oficina...");
        await base44.asServiceRole.functions.invoke('createDefaultPermissions', {
          user_id: employee.id,
          workshop_id: invite.workshop_id,
          job_role: invite.job_role || 'outros'
        });
        console.log("✅ Permissões de oficina criadas!");
      }
    } catch (permError) {
      console.error("⚠️ Erro ao criar permissões (não crítico):", permError);
    }

    console.log("✅ Convite aceito com sucesso!");
    console.log("📊 Employee ID:", employee.id);

    return Response.json({ 
      success: true, 
      employee_id: employee.id,
      message: 'Cadastro concluído! Agora você pode fazer login com seu email e senha.'
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