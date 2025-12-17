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
    
    // Validar workshop_id para colaboradores de oficina
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

    // Criar ou atualizar User vinculado
    try {
      const allUsers = await base44.asServiceRole.entities.User.filter({ email: email || invite.email });
      const existingUser = allUsers[0];

      const userDataToUpdate = {
        position: invite.position,
        job_role: invite.job_role || (isInternalUser ? 'consultor' : 'outros'),
        area: invite.area || (isInternalUser ? 'administrativo' : 'tecnico'),
        telefone: phone || invite.metadata?.telefone || '(00) 00000-0000',
        profile_picture_url: profile_picture_url || '',
        hire_date: employee.hire_date || new Date().toISOString().split('T')[0],
        user_status: 'active',
        is_internal: isInternalUser
      };

      // Adicionar dados específicos por tipo
      if (isInternalUser) {
        userDataToUpdate.role = invite.metadata?.role || 'user';
        userDataToUpdate.profile_id = invite.metadata?.profile_id || null;
      } else {
        userDataToUpdate.workshop_id = invite.workshop_id;
      }

      console.log("👤 Dados do User a serem salvos:", userDataToUpdate);

      if (existingUser) {
        await base44.asServiceRole.entities.User.update(existingUser.id, userDataToUpdate);
        await base44.asServiceRole.entities.Employee.update(employee.id, { user_id: existingUser.id });
        console.log("✅ User existente atualizado:", existingUser.id);
      } else {
        console.log("ℹ️ User será criado no primeiro login");
      }
    } catch (userError) {
      console.error("❌ Erro ao vincular User:", userError);
    }

    // Enviar email com instruções de acesso
    let emailSent = false;
    let emailError = null;
    try {
      const origin = req.headers.get('origin') || 'https://oficinasmastergtr.com';
      const loginUrl = `${origin}/login`;
      
      // Criar permissões baseadas no tipo
      if (isInternalUser && invite.metadata?.profile_id) {
        try {
          console.log("🔐 Criando permissões para usuário interno...");
          console.log("📋 Profile ID:", invite.metadata.profile_id);

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
        } catch (permError) {
          console.error("⚠️ Erro ao criar permissões internas:", permError);
        }
      } else if (!isInternalUser && invite.workshop_id) {
        try {
          console.log("🔐 Criando permissões para colaborador de oficina...");
          await base44.asServiceRole.functions.invoke('createDefaultPermissions', {
            user_id: existingUser?.id || 'pending',
            workshop_id: invite.workshop_id,
            job_role: invite.job_role || 'outros'
          });
          console.log("✅ Permissões de oficina criadas!");
        } catch (permError) {
          console.error("⚠️ Erro ao criar permissões:", permError);
        }
      }

      console.log("📧 Enviando email para:", email || invite.email);
      
      const emailBody = isInternalUser ? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Bem-vindo(a) à Equipe Oficinas Master!</h2>
          
          <p>Olá, <strong>${name || invite.name}</strong>!</p>
          
          <p>Seu cadastro foi concluído com sucesso na plataforma <strong>Oficinas Master</strong>.</p>
          
          <p>Você foi cadastrado(a) como <strong>${invite.position}</strong> na equipe interna.</p>
          
          <h3 style="color: #1e40af;">Próximos Passos:</h3>
          <ol>
            <li>Clique no botão abaixo para acessar a plataforma</li>
            <li>Use o email: <strong>${email || invite.email}</strong></li>
            <li>Clique em "Criar Conta" para definir sua senha de acesso</li>
          </ol>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" 
               style="background-color: #2563eb; color: white; padding: 15px 30px; 
                      text-decoration: none; border-radius: 8px; display: inline-block;
                      font-weight: bold;">
              Acessar Plataforma
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <strong>Importante:</strong> Use exatamente o email <strong>${email || invite.email}</strong> ao criar sua conta.
          </p>
        </div>
      ` : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Olá, ${name || invite.name}!</h2>
          
          <p>Seu cadastro foi concluído com sucesso na plataforma <strong>Oficinas Master</strong>.</p>
          
          <p>Você foi cadastrado(a) como <strong>${invite.position}</strong> na oficina <strong>${workshop?.name || 'Sua Oficina'}</strong>.</p>
          
          <h3 style="color: #1e40af;">Próximos Passos:</h3>
          <ol>
            <li>Clique no botão abaixo para acessar a plataforma</li>
            <li>Use o email: <strong>${email || invite.email}</strong></li>
            <li>Clique em "Criar Conta" para definir sua senha de acesso</li>
          </ol>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" 
               style="background-color: #2563eb; color: white; padding: 15px 30px; 
                      text-decoration: none; border-radius: 8px; display: inline-block;
                      font-weight: bold;">
              Acessar Plataforma
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <strong>Importante:</strong> Use exatamente o email <strong>${email || invite.email}</strong> ao criar sua conta.
          </p>
          
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            Se você tiver dúvidas, entre em contato com seu gestor.
          </p>
        </div>
      `;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email || invite.email,
        subject: isInternalUser 
          ? 'Bem-vindo à Equipe Oficinas Master - Crie sua Senha'
          : `Bem-vindo(a) à ${workshop?.name || 'Oficina'} - Crie sua Senha`,
        body: emailBody
      });
      emailSent = true;
      console.log("✅ Email enviado com sucesso!");
    } catch (error) {
      emailError = error.message;
      console.error('❌ Erro ao enviar email de boas-vindas:', error);
    }

    console.log("✅ Colaborador registrado com sucesso!");
    console.log("📊 Employee ID:", employee.id);
    console.log("📧 Email enviado:", emailSent);

    return Response.json({ 
      success: true, 
      employee_id: employee.id,
      message: 'Colaborador registrado com sucesso',
      email_sent: emailSent,
      email_error: emailError
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