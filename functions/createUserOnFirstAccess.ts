import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { invite_id, password, workshop_id, email } = body;
    
    if (!invite_id) {
      return Response.json({ error: 'invite_id obrigatório' }, { status: 400 });
    }
    
    if (!password) {
      return Response.json({ error: 'Senha é obrigatória' }, { status: 400 });
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
    
    // Definir senha do usuário
    if (password) {
      console.log(`🔐 Definindo senha para o usuário: ${invite.email}`);
      
      // Usar endpoint correto da API Base44 para definir senha
      const apiUrl = `https://base44.app/api/apps/${Deno.env.get('BASE44_APP_ID')}/users/${userId}/password`;
      console.log(`📍 URL de autenticação:`, apiUrl);
      
      const authResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-base44-key': Deno.env.get('BASE44_SERVICE_ROLE_KEY')
        },
        body: JSON.stringify({ password })
      });
      
      if (!authResponse.ok) {
        const errorText = await authResponse.text();
        console.error("❌ Erro ao definir senha:", authResponse.status, errorText);
        throw new Error(`Falha ao definir senha (${authResponse.status}): ${errorText}`);
      }
      console.log(`✅ Senha definida com sucesso`);
    }

    // Atualizar Employee: marcar conta como ativa e registrar primeiro acesso
    console.log("📝 Atualizando dados do Employee...");
    await base44.asServiceRole.entities.Employee.update(employee.id, {
      first_login_at: new Date().toISOString(),
      user_status: 'ativo'
    });
    console.log(`✅ Employee atualizado com sucesso`);
    
    // Atualizar User: ativar conta e registrar primeiro acesso
    console.log("📝 Ativando conta do User...");
    await base44.asServiceRole.entities.User.update(userId, {
      user_status: 'active',
      first_login_at: new Date().toISOString(),
      last_login_at: new Date().toISOString()
    });
    console.log(`✅ User ativado com sucesso`);

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