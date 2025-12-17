import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Validar autenticação usando service role
    const { employee_data, workshop_id, employee_id, user_data, email, full_name } = await req.json();

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
      try {
        console.log("🔐 Criando permissões do perfil...");
        
        const profile = await base44.asServiceRole.entities.UserProfile.get(user_data.profile_id);
        
        if (profile) {
          // Criar UserPermission baseada no perfil
          await base44.asServiceRole.entities.UserPermission.create({
            user_id: newEmployee.id,
            user_email: email,
            profile_id: user_data.profile_id,
            custom_roles: profile.roles || [],
            module_permissions: profile.module_permissions || {},
            sidebar_permissions: profile.sidebar_permissions || {},
            is_active: true
          });
          
          console.log("✅ Permissões criadas com sucesso");
        }
      } catch (permError) {
        console.error("❌ Erro ao criar permissões:", permError);
      }

      // Registrar atividade
      try {
        console.log("📊 Registrando atividade de criação...");
        
        const adminUser = await base44.auth.me();
        
        await base44.asServiceRole.entities.UserActivityLog.create({
          user_id: adminUser.id,
          user_email: adminUser.email,
          action: 'user_created',
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

      // Gerar link de convite automático
      let inviteUrl = null;
      try {
        console.log("🔗 Gerando link de convite...");
        
        const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        
        const invite = await base44.asServiceRole.entities.EmployeeInvite.create({
          name: full_name,
          email: email,
          position: user_data.position || 'Colaborador Interno',
          area: user_data.area || 'administrativo',
          job_role: user_data.job_role || 'consultor',
          initial_permission: 'admin',
          workshop_id: null, // Usuário interno não tem workshop
          employee_id: newEmployee.id,
          invite_token: token,
          expires_at: expiresAt,
          status: 'enviado'
        });
        
        const baseUrl = new URL(req.url).origin;
        inviteUrl = `${baseUrl}/PrimeiroAcesso?token=${token}`;
        
        console.log("✅ Link de convite gerado:", inviteUrl);
      } catch (inviteError) {
        console.error("❌ Erro ao gerar link de convite:", inviteError);
      }

      // Retornar sucesso com credenciais e link
      return Response.json({
        success: true,
        employee: newEmployee,
        password: tempPassword,
        email: email,
        role: user_data.role || 'user',
        login_url: new URL(req.url).origin,
        invite_url: inviteUrl,
        message: inviteUrl 
          ? `Usuário criado! Envie o link de convite: ${inviteUrl}` 
          : `Usuário criado! Convide pelo dashboard Base44 com role '${user_data.role || 'user'}'.`
      });
    }

    // Modo antigo: vincular employee a workshop
    if (!employee_data || !workshop_id) {
      return Response.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    console.log("Criando User para:", employee_data.email);

    // Buscar se já existe User com este email
    const allUsers = await base44.asServiceRole.entities.User.list();
    const existingUser = allUsers.find(u => u.email === employee_data.email);

    if (existingUser) {
      console.log("User já existe, atualizando:", existingUser.id);
      
      // Atualizar dados do usuário existente
      const updatedUser = await base44.asServiceRole.entities.User.update(existingUser.id, {
        workshop_id: workshop_id,
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