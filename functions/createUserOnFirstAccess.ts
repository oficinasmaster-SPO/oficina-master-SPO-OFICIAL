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

    // Buscar Employee vinculado ao convite
    console.log("🔍 Buscando Employee vinculado ao convite...");
    const employee = invite.employee_id 
      ? await base44.asServiceRole.entities.Employee.get(invite.employee_id)
      : null;
    
    if (!employee) {
      return Response.json({ 
        error: 'Colaborador não encontrado. Verifique o link de convite.' 
      }, { status: 404 });
    }

    // Se já tem user_id, usar; senão, criar um novo usuário
    let userId = employee.user_id;
    
    if (!userId) {
      console.log("📧 Employee não tem user_id vinculado. Criando novo User Base44...");
      
      // Criar novo User base44 (isso será feito via invite do Base44)
      // Por enquanto, vamos usar um ID temporário ou pedir ao usuário
      return Response.json({ 
        error: 'Usuário Base44 não foi criado. Contacte o administrador.' 
      }, { status: 400 });
    }
    
    console.log("✅ User ID encontrado para vincular:", userId);
    
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

    // SINCRONIZAÇÃO DE RELACIONAMENTOS 1-1 E 1-N
    console.log("🔗 Sincronizando relacionamentos entre User, Employee e EmployeeInvite...");
    
    const now = new Date().toISOString();
    
    // 1. Atualizar Employee: vincular user_id (se não estava vinculado) + marcar como ativo
    console.log("📝 [1/3] Atualizando Employee com user_id...");
    await base44.asServiceRole.entities.Employee.update(employee.id, {
      user_id: userId,  // Relação 1-1: Employee → User
      first_login_at: now,
      user_status: 'ativo'
    });
    console.log(`✅ Employee atualizado: user_id = ${userId}`);
    
    // 2. Atualizar User: vincular invite_id + employee_id + ativar conta
    console.log("📝 [2/3] Atualizando User com referências ao invite e employee...");
    await base44.asServiceRole.entities.User.update(userId, {
      invite_id: invite_id,           // Relação 1-1: EmployeeInvite → User
      workshop_id: workshop_id || invite.workshop_id,  // Relação 1-N: Workshop → User
      user_status: 'active',
      first_login_at: now,
      last_login_at: now,
      approved_at: now
    });
    console.log(`✅ User atualizado: invite_id = ${invite_id}, workshop_id = ${workshop_id || invite.workshop_id}`);

    // 3. Marcar EmployeeInvite como concluído com todas as referências
    console.log("📝 [3/3] Marcando EmployeeInvite como concluído...");
    await base44.asServiceRole.entities.EmployeeInvite.update(invite_id, {
      status: 'concluido',
      completed_at: now,
      // Garantir que employee_id está preenchido
      employee_id: employee.id
    });
    console.log(`✅ EmployeeInvite concluído: employee_id = ${employee.id}`);

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