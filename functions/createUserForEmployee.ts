import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Validar autenticação usando service role
    const { employee_data, workshop_id, employee_id, user_data, email, full_name, invite_type = 'workshop' } = await req.json();

    // Modo novo: criar usuário interno
    if (user_data && email && full_name) {
      console.log("=== Iniciando criação de usuário interno ===");
      console.log("Email:", email);
      console.log("Nome:", full_name);
      console.log("Role:", user_data.role);
      console.log("Profile ID:", user_data.profile_id);

      // Verificar se já existe Employee com este email
      const allEmployees = await base44.asServiceRole.entities.Employee.list();
      const existingEmployee = allEmployees.find(e => e.email === email);
      
      if (existingEmployee) {
        console.error("Já existe um colaborador com este email:", email);
        return Response.json({ 
          success: false,
          error: 'Já existe um usuário com este email' 
        }, { status: 400 });
      }

      // Gerar senha temporária forte
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
      let tempPassword = '';
      for (let i = 0; i < 12; i++) {
        tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      console.log("✅ Senha temporária gerada:", tempPassword.substring(0, 4) + "...");

      // Validar dados obrigatórios
      if (!user_data.profile_id) {
        console.error("❌ Profile ID não fornecido");
        return Response.json({ 
          success: false,
          error: 'Profile ID é obrigatório' 
        }, { status: 400 });
      }

      // Criar Employee com todos os dados
      console.log("Criando Employee com:", {
        email,
        profile_id: user_data.profile_id,
        role: user_data.role
      });
      
      const employeeData = {
        full_name: full_name,
        email: email,
        telefone: user_data.telefone || '',
        position: user_data.position || '',
        tipo_vinculo: 'interno',
        job_role: 'consultor',
        status: 'ativo',
        profile_id: user_data.profile_id,
        user_status: user_data.user_status || 'ativo',
        is_internal: true,
        audit_log: user_data.audit_log || []
      };

      console.log("📦 Dados completos do Employee antes de criar:", JSON.stringify(employeeData, null, 2));

      const newEmployee = await base44.asServiceRole.entities.Employee.create(employeeData);

      console.log("✅ Employee criado!");
      console.log("   - ID:", newEmployee.id);
      console.log("   - Email:", newEmployee.email);
      console.log("   - Profile ID salvo:", newEmployee.profile_id);

      // Criar permissões baseadas no perfil
      let permissionsCreated = false;
      try {
        console.log("🔐 Criando permissões do perfil...");

        const profile = await base44.asServiceRole.entities.UserProfile.get(user_data.profile_id);

        if (!profile) {
          console.error("❌ Perfil não encontrado:", user_data.profile_id);
          throw new Error("Perfil não encontrado");
        }

        console.log("📋 Perfil carregado:", profile.name);
        console.log("📋 Roles do perfil:", JSON.stringify(profile.roles || []));
        console.log("📋 Módulos do perfil:", JSON.stringify(profile.module_permissions || {}));

        // Criar UserPermission completa baseada no perfil
        const permissionData = {
          user_id: newEmployee.id,
          user_email: email,
          profile_id: user_data.profile_id,
          profile_name: profile.name,
          custom_roles: profile.roles || [],
          custom_role_ids: profile.custom_role_ids || [],
          module_permissions: profile.module_permissions || {},
          sidebar_permissions: profile.sidebar_permissions || {},
          is_active: true,
          created_at: new Date().toISOString()
        };

        console.log("📤 Dados de permissão a serem salvos:", JSON.stringify(permissionData, null, 2));

        const createdPermission = await base44.asServiceRole.entities.UserPermission.create(permissionData);

        console.log("✅ Permissões criadas com sucesso!");
        console.log("   - ID:", createdPermission.id);
        console.log("   - Roles salvas:", JSON.stringify(createdPermission.custom_roles));
        console.log("   - Módulos salvos:", Object.keys(createdPermission.module_permissions || {}).length);

        permissionsCreated = true;
      } catch (permError) {
        console.error("❌ Erro ao criar permissões:", permError);
        console.error("Stack:", permError.stack);
        throw permError;
      }

      // Registrar atividade
      try {
        console.log("📊 Registrando atividade de criação...");

        const adminUser = await base44.auth.me();

        await base44.asServiceRole.entities.UserActivityLog.create({
          user_id: adminUser.id,
          user_email: adminUser.email,
          activity_type: 'user_created',
          action: 'create',
          module: 'admin_usuarios',
          details: {
            created_user_email: email,
            created_user_name: full_name,
            profile_id: user_data.profile_id,
            role: user_data.role || 'user'
          },
          timestamp: new Date().toISOString()
        });

        console.log("✅ Atividade registrada");
      } catch (activityError) {
        console.error("❌ Erro ao registrar atividade:", activityError);
      }

      // Criar convite para primeiro acesso
      const inviteToken = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 dias para completar cadastro

      const invite = await base44.asServiceRole.entities.EmployeeInvite.create({
        employee_id: newEmployee.id,
        workshop_id: null,
        invite_type: 'internal',
        name: full_name,
        email: email,
        position: user_data.position,
        job_role: 'consultor',
        area: 'administrativo',
        invite_token: inviteToken,
        status: 'enviado',
        sent_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString()
      });

      console.log("✅ Convite criado:", invite.id);

      // Enviar email com link de primeiro acesso
      const origin = 'https://oficinasmastergtr.com';
      const inviteUrl = `${origin}/PrimeiroAcesso?token=${inviteToken}`;

      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: email,
          subject: 'Bem-vindo à Equipe Oficinas Master - Complete seu Cadastro',
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Olá, ${full_name}!</h2>
              
              <p>Você foi adicionado à equipe interna da <strong>Oficinas Master</strong> como <strong>${user_data.position}</strong>.</p>
              
              <p>Para começar a trabalhar, você precisa completar seu cadastro e criar sua senha de acesso.</p>
              
              <h3 style="color: #1e40af;">Complete seu Cadastro:</h3>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteUrl}" 
                   style="background-color: #2563eb; color: white; padding: 15px 30px; 
                          text-decoration: none; border-radius: 8px; display: inline-block;
                          font-weight: bold;">
                  Completar Cadastro
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                <strong>Importante:</strong> Este link expira em 7 dias. Se precisar de um novo link, entre em contato com o administrador.
              </p>
              
              <p style="color: #666; font-size: 12px; margin-top: 20px;">
                Email de login: <strong>${email}</strong>
              </p>
            </div>
          `
        });
        console.log("✅ Email de convite enviado");
      } catch (emailError) {
        console.error("❌ Erro ao enviar email:", emailError);
      }

      // Validar se permissões foram criadas
      if (!permissionsCreated) {
        console.error("❌ Falha ao criar permissões - revertendo criação");
        await base44.asServiceRole.entities.Employee.delete(newEmployee.id);
        await base44.asServiceRole.entities.EmployeeInvite.delete(invite.id);
        return Response.json({
          success: false,
          error: 'Falha ao criar permissões do usuário'
        }, { status: 500 });
      }

      console.log("✅ Usuário interno criado com sucesso!");

      return Response.json({
        success: true,
        employee: newEmployee,
        invite_url: inviteUrl,
        email: email,
        role: user_data.role || 'user',
        permissions_created: permissionsCreated,
        message: 'Usuário criado! Email de convite enviado.'
      });
    }

    // Modo antigo: vincular employee a workshop
    if (!employee_data || !workshop_id) {
      return Response.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    console.log("Criando User para:", employee_data.email);

    // Buscar oficina para obter o consulting_firm_id
    let consulting_firm_id = null;
    try {
      const ws = await base44.asServiceRole.entities.Workshop.get(workshop_id);
      if (ws) {
        consulting_firm_id = ws.consulting_firm_id || null;
      }
    } catch(e) {
      console.warn("Aviso: Falha ao buscar oficina para obter consulting_firm_id", e.message);
    }

    // Buscar se já existe User com este email
    const allUsers = await base44.asServiceRole.entities.User.list();
    const existingUser = allUsers.find(u => u.email === employee_data.email);

    if (existingUser) {
      console.log("User já existe, atualizando:", existingUser.id);
      
      // Atualizar dados do usuário existente
      const updatedUser = await base44.asServiceRole.entities.User.update(existingUser.id, {
        workshop_id: workshop_id,
        consulting_firm_id: consulting_firm_id,
        position: employee_data.position,
        job_role: employee_data.job_role || 'outros',
        area: employee_data.area || 'tecnico',
        telefone: employee_data.telefone || '',
        hire_date: employee_data.hire_date || new Date().toISOString().split('T')[0],
        user_status: 'ativo'
      });

      return Response.json({
        success: true,
        user_id: updatedUser.id,
        message: 'User existente atualizado com sucesso'
      });
    }

    // Criar novo User
    console.log("Criando novo User...");
    const newUser = await base44.asServiceRole.entities.User.create({
      email: employee_data.email,
      full_name: employee_data.full_name,
      role: 'user',
      workshop_id: workshop_id,
      consulting_firm_id: consulting_firm_id,
      position: employee_data.position,
      job_role: employee_data.job_role || 'outros',
      area: employee_data.area || 'tecnico',
      telefone: employee_data.telefone || '',
      profile_picture_url: employee_data.profile_picture_url || '',
      hire_date: employee_data.hire_date || new Date().toISOString().split('T')[0],
      user_status: 'ativo'
    });

    console.log("User criado com sucesso:", newUser.id);

    return Response.json({
      success: true,
      user_id: newUser.id,
      message: 'User criado com sucesso'
    });

  } catch (error) {
    console.error("Erro ao criar User:", error);
    console.error("Stack:", error.stack);
    return Response.json({ 
      success: false,
      error: error.message || 'Erro ao criar usuário' 
    }, { status: 500 });
  }
});