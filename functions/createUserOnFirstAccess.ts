import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { invite_id, password } = body;
    
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

    // Criar usuário no Base44 com senha fornecida
    try {
      await base44.users.inviteUser(invite.email, role);
      console.log(`✅ Convite de usuário enviado para: ${invite.email}`);
      
      // Aguardar um pouco para o usuário ser criado
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Buscar o usuário criado e definir senha
      const users = await base44.asServiceRole.entities.User.filter({ email: invite.email }, '-created_date', 1);
      const user = users[0];
      
      if (user && password) {
        // Atualizar senha do usuário usando asServiceRole
        await base44.asServiceRole.auth.updateUserPassword(user.id, password);
        console.log(`✅ Senha definida para o usuário: ${invite.email}`);
      }
    } catch (inviteError) {
      // Se o usuário já existir, atualizar senha
      if (inviteError.message.includes('already exists') || inviteError.message.includes('já existe')) {
        console.log("ℹ️ Usuário já existe no Base44, atualizando senha...");
        const users = await base44.asServiceRole.entities.User.filter({ email: invite.email }, '-created_date', 1);
        const user = users[0];
        
        if (user && password) {
          await base44.asServiceRole.auth.updateUserPassword(user.id, password);
          console.log(`✅ Senha atualizada para: ${invite.email}`);
        }
      } else {
        throw inviteError;
      }
    }

    // Atualizar Employee com user_id se encontrado
    if (invite.employee_id) {
      try {
        // Buscar usuário criado
        const users = await base44.asServiceRole.entities.User.filter({ email: invite.email }, '-created_date', 1);
        const user = users[0];
        
        if (user) {
          await base44.asServiceRole.entities.Employee.update(invite.employee_id, {
            user_id: user.id,
            first_login_at: new Date().toISOString()
          });
          console.log(`✅ Employee atualizado com user_id: ${user.id}`);
        }
      } catch (e) {
        console.error("⚠️ Erro ao atualizar Employee:", e.message);
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