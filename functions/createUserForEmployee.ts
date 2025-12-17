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
      
      if (!user_data.admin_responsavel_id) {
        console.error("❌ Admin Responsável não fornecido");
        return Response.json({ 
          success: false,
          error: 'Administrador responsável é obrigatório' 
        }, { status: 400 });
      }

      // Criar Employee com todos os dados
      console.log("Criando Employee com:", {
        email,
        profile_id: user_data.profile_id,
        admin_responsavel_id: user_data.admin_responsavel_id,
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
        admin_responsavel_id: user_data.admin_responsavel_id,
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
      console.log("   - Admin Responsável:", newEmployee.admin_responsavel_id);

      // Verificar se os dados foram salvos
      const employeeVerify = await base44.asServiceRole.entities.Employee.get(newEmployee.id);
      console.log("🔍 Verificando Employee criado:", {
        profile_id: employeeVerify.profile_id,
        admin_responsavel_id: employeeVerify.admin_responsavel_id
      });

      // Retornar sucesso com credenciais
      return Response.json({
        success: true,
        employee: newEmployee,
        password: tempPassword,
        email: email,
        role: user_data.role || 'user',
        login_url: new URL(req.url).origin,
        message: `Colaborador interno criado. Convide pelo dashboard com role '${user_data.role || 'user'}'.`
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