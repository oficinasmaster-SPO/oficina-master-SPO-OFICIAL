import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { invite_id, password, workshop_id, full_name, telefone, data_nascimento } = body;
    
    if (!invite_id) {
      return Response.json({ error: 'invite_id obrigatório' }, { status: 400 });
    }

    console.log("👤 Criando usuário no primeiro acesso para convite:", invite_id);

    // Buscar convite
    const invite = await base44.asServiceRole.entities.EmployeeInvite.get(invite_id);
    
    if (!invite) {
      return Response.json({ error: 'Convite não encontrado' }, { status: 404 });
    }

    if (invite.status === 'concluido') {
      return Response.json({ 
        success: true, 
        message: 'Usuário já foi criado anteriormente',
        already_created: true
      });
    }

    // Extrair role do metadata ou usar 'user' como padrão
    const role = invite.metadata?.role || 'user';
    
    console.log(`📧 Criando usuário Base44 com role: ${role}`);

    // Buscar Employee (que tem user_id vinculado)
    console.log("🔍 Buscando Employee vinculado ao convite...");
    const employee = invite.employee_id 
      ? await base44.asServiceRole.entities.Employee.get(invite.employee_id)
      : null;
    
    if (!employee || !employee.user_id) {
      return Response.json({ 
        error: 'Colaborador não encontrado ou não vinculado a um usuário. Entre em contato com o suporte.' 
      }, { status: 404 });
    }
    
    const userId = employee.user_id;
    console.log("✅ User ID encontrado:", userId);
    
    // Definir senha
    if (password) {
      const authResponse = await fetch(`https://base44.app/api/auth/users/${user.id}/password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('BASE44_SERVICE_TOKEN')}`
        },
        body: JSON.stringify({ password })
      });
      
      if (!authResponse.ok) {
        throw new Error(`Falha ao definir senha: ${await authResponse.text()}`);
      }
      console.log(`✅ Senha definida para o usuário: ${invite.email}`);
    }

    // Atualizar User e Employee no primeiro acesso
    if (invite.employee_id) {
      try {
        // Buscar Employee
        const employee = await base44.asServiceRole.entities.Employee.get(invite.employee_id);
        
        // Atualizar Employee com dados do primeiro acesso
        const updateEmployeeData = {
          first_login_at: new Date().toISOString(),
          user_status: 'ativo'
        };
        
        if (full_name) updateEmployeeData.full_name = full_name;
        if (telefone) updateEmployeeData.telefone = telefone;
        if (data_nascimento) updateEmployeeData.data_nascimento = data_nascimento;
        
        await base44.asServiceRole.entities.Employee.update(invite.employee_id, updateEmployeeData);
        console.log(`✅ Employee atualizado no primeiro acesso`);
        
        // Atualizar User: apenas status e first_login (dados já estão preenchidos)
        const updateUserData = {
          user_status: 'active',
          first_login_at: new Date().toISOString(),
          last_login_at: new Date().toISOString()
        };
        
        // Atualizar telefone e data_nascimento se fornecidos
        if (telefone) updateUserData.telefone = telefone;
        if (data_nascimento) updateUserData.data_nascimento = data_nascimento;
        
        await base44.asServiceRole.entities.User.update(user.id, updateUserData);
        console.log(`✅ User ativado no primeiro acesso`);
        
      } catch (e) {
        console.error("⚠️ Erro ao atualizar no primeiro acesso:", e.message);
      }
    }

    // Marcar convite como concluído
    await base44.asServiceRole.entities.EmployeeInvite.update(invite_id, {
      status: 'concluido',
      completed_at: new Date().toISOString()
    });

    console.log("✅ Usuário criado e convite marcado como concluído");

    return Response.json({ 
      success: true,
      message: 'Usuário criado com sucesso no Base44',
      email: invite.email,
      role: role
    });

  } catch (error) {
    console.error("❌ Erro:", error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});