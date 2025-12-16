import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Validar autenticação usando service role
    const { employee_data, workshop_id, employee_id, user_data, email, full_name } = await req.json();

    // Modo novo: criar usuário interno admin
    if (user_data && email && full_name) {
      console.log("Criando usuário interno admin:", email);

      // Verificar se já existe
      const allUsers = await base44.asServiceRole.entities.User.list();
      const existingUser = allUsers.find(u => u.email === email);
      
      if (existingUser) {
        return Response.json({ 
          success: false,
          error: 'Já existe um usuário com este email' 
        }, { status: 400 });
      }

      // Gerar senha temporária
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
      let tempPassword = '';
      for (let i = 0; i < 12; i++) {
        tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      // 1. Criar conta de autenticação via Auth API
      console.log("Criando conta de autenticação...");
      const authResponse = await fetch(`${Deno.env.get('BASE44_API_URL')}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('BASE44_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({
          email: email,
          password: tempPassword,
          full_name: full_name
        })
      });

      if (!authResponse.ok) {
        const errorData = await authResponse.json();
        throw new Error(`Erro ao criar conta: ${errorData.error || 'Erro desconhecido'}`);
      }

      const authData = await authResponse.json();
      console.log("Conta de autenticação criada:", authData.user.id);

      // 2. Atualizar User com dados adicionais
      const updatedUser = await base44.asServiceRole.entities.User.update(authData.user.id, {
        role: 'user',
        ...user_data
      });

      console.log("Usuário interno criado com sucesso:", updatedUser.id);

      return Response.json({
        success: true,
        user: updatedUser,
        password: tempPassword,
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