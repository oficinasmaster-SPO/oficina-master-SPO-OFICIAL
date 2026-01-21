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

    // Buscar Employee e transferir dados para User
    if (invite.employee_id) {
      try {
        // Buscar usuário criado
        const users = await base44.asServiceRole.entities.User.filter({ email: invite.email }, '-created_date', 1);
        const user = users[0];
        
        if (user) {
          // Buscar dados completos do Employee
          const employee = await base44.asServiceRole.entities.Employee.get(invite.employee_id);
          
          // Preparar dados do Employee para atualizar
          const updateEmployeeData = {
            user_id: user.id,
            first_login_at: new Date().toISOString(),
            workshop_id: workshop_id || invite.workshop_id,
            user_status: 'ativo'
          };
          
          // Atualizar dados adicionais se fornecidos
          if (full_name) updateEmployeeData.full_name = full_name;
          if (telefone) updateEmployeeData.telefone = telefone;
          if (data_nascimento) updateEmployeeData.data_nascimento = data_nascimento;
          
          // Atualizar Employee
          await base44.asServiceRole.entities.Employee.update(invite.employee_id, updateEmployeeData);
          console.log(`✅ Employee atualizado com user_id: ${user.id}`);
          
          // Transferir dados do Employee para o User (IMPORTANTE!)
          const updateUserData = {
            profile_id: employee?.profile_id || null,
            position: employee?.position || null,
            job_role: employee?.job_role || 'outros',
            area: employee?.area || null,
            workshop_id: workshop_id || invite.workshop_id || employee?.workshop_id,
            telefone: telefone || employee?.telefone || null,
            user_status: 'active',
            first_login_at: new Date().toISOString()
          };
          
          // Remover campos null para evitar sobrescrever com null
          Object.keys(updateUserData).forEach(key => {
            if (updateUserData[key] === null || updateUserData[key] === undefined) {
              delete updateUserData[key];
            }
          });
          
          console.log("📝 Atualizando User com dados:", updateUserData);
          
          // CRÍTICO: Atualizar User com dados do Employee
          try {
            await base44.asServiceRole.entities.User.update(user.id, updateUserData);
            console.log(`✅ User atualizado com sucesso:`, updateUserData);
            
            // Verificar se realmente salvou
            const verifyUser = await base44.asServiceRole.entities.User.get(user.id);
            console.log(`🔍 Verificação - workshop_id no User: ${verifyUser.workshop_id}`);
            
            if (!verifyUser.workshop_id) {
              console.error("❌ FALHA CRÍTICA: workshop_id não foi salvo no User!");
            }
          } catch (userUpdateError) {
            console.error("❌ ERRO CRÍTICO ao atualizar User:", userUpdateError.message);
            throw userUpdateError;
          }
        }
      } catch (e) {
        console.error("⚠️ Erro ao processar Employee:", e.message);
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