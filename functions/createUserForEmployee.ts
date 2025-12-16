import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Validar autenticação usando service role
    const { employee_data, workshop_id, employee_id, user_data, email, full_name } = await req.json();

    // Modo novo: criar usuário interno admin
    if (user_data && email && full_name) {
      console.log("=== Iniciando criação de usuário interno (Employee) ===");
      console.log("Email:", email);
      console.log("Nome:", full_name);
      console.log("Dados adicionais:", JSON.stringify(user_data, null, 2));

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
      console.log("Senha temporária gerada:", tempPassword);

      // 1. Criar conta de autenticação usando a API signup do Base44
      console.log("📧 Criando conta de autenticação via API signup...");
      const appId = Deno.env.get('BASE44_APP_ID');
      const signupUrl = `https://api.base44.com/auth/v1/signup`;
      
      const signupResponse = await fetch(signupUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-App-ID': appId
        },
        body: JSON.stringify({
          email: email,
          password: tempPassword,
          full_name: full_name
        })
      });

      if (!signupResponse.ok) {
        const errorText = await signupResponse.text();
        console.error("❌ Erro na API signup:", signupResponse.status, errorText);
        throw new Error(`Erro ao criar conta: ${errorText}`);
      }

      const signupData = await signupResponse.json();
      const userId = signupData.user?.id || signupData.id;
      console.log("✅ Conta criada! User ID:", userId);

      // 3. Criar Employee vinculado ao User
      console.log("Criando Employee vinculado ao User...");
      const newEmployee = await base44.asServiceRole.entities.Employee.create({
        full_name: full_name,
        email: email,
        telefone: user_data.telefone,
        position: user_data.position,
        tipo_vinculo: 'interno',
        job_role: 'consultor',
        status: 'ativo',
        profile_id: user_data.profile_id,
        admin_responsavel_id: user_data.admin_responsavel_id,
        user_status: user_data.user_status || 'ativo',
        is_internal: true,
        user_id: userId,
        audit_log: user_data.audit_log || []
      });

      console.log("✅ Employee criado e vinculado! ID:", newEmployee.id);

      // Retornar sucesso com senha
      return Response.json({
        success: true,
        user: newEmployee,
        user_auth_id: userId,
        password: tempPassword,
        login_url: `https://${Deno.env.get('BASE44_APP_ID')}.base44.com`,
        message: 'Usuário interno criado com sucesso'
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