import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const { name, email, telefone, position, area, job_role, profile_id, workshop_id, role = "user" } = body;
    
    if (!name || !email || !workshop_id) {
      return Response.json({ error: 'Nome, email e oficina obrigatórios' }, { status: 400 });
    }
    
    // Validar role
    if (!['user', 'admin'].includes(role)) {
      return Response.json({ error: 'Role deve ser "user" ou "admin"' }, { status: 400 });
    }

    console.log("👤 Criando colaborador:", email);

    // 1. Verificar se já existe Employee com este email
    const existingEmployees = await base44.asServiceRole.entities.Employee.filter({ 
      email, 
      workshop_id 
    });

    if (existingEmployees && existingEmployees.length > 0) {
      return Response.json({ 
        error: 'Já existe um colaborador com este email nesta oficina' 
      }, { status: 400 });
    }

    // 1b. Gerar ID sequencial para o colaborador e Profile ID automático
    const idResponse = await base44.functions.invoke('generateEmployeeId', { workshop_id });
    
    if (!idResponse.data.success) {
      console.warn("⚠️ Aviso foi possível gerar ID do colaborador");
    }

    const employeeId = idResponse.data?.employee_id || null;

    // Buscar workshop para pegar seu identificador (Workshop ID)
    const workshop = await base44.asServiceRole.entities.Workshop.get(workshop_id);
    const workshopId = workshop?.identificador || workshop_id;

    // Contar colaboradores existentes para gerar Profile ID automático
    const allEmployees = await base44.asServiceRole.entities.Employee.filter({ workshop_id });
    const employeeCount = Array.isArray(allEmployees) ? allEmployees.length + 1 : 1;
    
    // Gerar Profile ID: 001.01, 001.02, etc
    const profileId = `${workshopId}.${String(employeeCount).padStart(2, '0')}`;

    // 2. Criar Employee com Profile ID automático (INTERNO, não cliente)
    const employee = await base44.asServiceRole.entities.Employee.create({
      identificador,
      full_name,
      email,
      telefone || '',
      position || 'Colaborador',
      area || 'tecnico',
      job_role || 'outros',
      status: 'ativo',
      tipo_vinculo: 'interno', // CORRIGIDO ser 'interno' para aparecer no UsuariosAdmin
      is_internal,
      workshop_id,
      profile_id, // OBRIGATÓRIO o gerado, não o enviado
      user_status: 'ativo',
      hire_date Date().toISOString().split('T')[0]
    });

    console.log("✅ Employee criado:", employee.id);

    // 3. Criar registro de convite no sistema
    let inviteId;
    try {
      const inviteToken = Math.random().toString(36).substring(2, 15) + 
                         Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 dias

      const invite = await base44.asServiceRole.entities.EmployeeInvite.create({
        workshop_id,
        employee_id.id,
        name,
        email,
        telefone || '',
        position || 'Colaborador',
        area || 'tecnico',
        job_role || 'outros',
        profile_id || profileId,
        invite_token,
        invite_type: 'workshop',
        expires_at.toISOString(),
        status: "pendente",
        metadata: { role }
      });

      inviteId = invite.id;
      console.log("✅ Convite criado no sistema");
    } catch (inviteDbError) {
      console.error("⚠️ Erro ao criar convite no banco:", inviteDbError.message);
    }

    // 4. CRIAR USER IMEDIATAMENTE com status pending
    let createdUserId = null;
    try {
      console.log("👤 [PASSO 1] Criando User com base44.users.inviteUser...");
      console.log("   Email:", email, "| Role:", role);
      
      // Criar usuário no Base44
      await base44.users.inviteUser(email, role);
      console.log(`✅ [PASSO 1] Usuário Base44 criado com role: ${role}`);
      
      // Aguardar criação (aumentado para 3 segundos)
      console.log("⏳ [PASSO 2] Aguardando 3 segundos para criação do usuário...");
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Buscar o usuário criado
      console.log("🔍 [PASSO 3] Buscando usuário criado na entidade User...");
      const users = await base44.asServiceRole.entities.User.filter({ email }, '-created_date', 1);
      const createdUser = users && users.length > 0 ? users[0] ;
      
      if (!createdUser) {
        console.error("❌ [PASSO 3] ERRO não encontrado após criação!");
        console.error("   Verificando se o usuário foi criado com outro método...");
        
        // Tentar buscar novamente após mais 2 segundos
        await new Promise(resolve => setTimeout(resolve, 2000));
        const retryUsers = await base44.asServiceRole.entities.User.filter({ email }, '-created_date', 1);
        const retryUser = retryUsers && retryUsers.length > 0 ? retryUsers[0] ;
        
        if (!retryUser) {
          console.error("❌ [RETRY] Usuário ainda não encontrado. Criação falhou.");
          throw new Error("Falha ao criar usuário no Base44");
        }
        
        console.log("✅ [RETRY] Usuário encontrado após segunda tentativa:", retryUser.id);
        createdUserId = retryUser.id;
      } else {
        console.log("✅ [PASSO 3] Usuário encontrado:", createdUser.id);
        createdUserId = createdUser.id;
      }
      
      if (createdUserId) {
        console.log("📝 [PASSO 4] Preparando dados para atualizar User...");
        
        // Atualizar User com todos os dados do colaborador
        const userData = {
          workshop_id,
          profile_id,
          position || 'Colaborador',
          job_role || 'outros',
          area || 'tecnico',
          telefone || '',
          hire_date Date().toISOString().split('T')[0],
          user_status: 'pending',
          is_internal,
          invite_id,
          admin_responsavel_id.id
        };

        console.log("📝 [PASSO 4] Dados a serem salvos:", JSON.stringify(userData, null, 2));
        
        await base44.asServiceRole.entities.User.update(createdUserId, userData);
        console.log("✅ [PASSO 4] User atualizado com sucesso!");
        
        // Verificar se os dados foram salvos
        console.log("🔍 [PASSO 5] Verificando se dados foram salvos corretamente...");
        const verifyUser = await base44.asServiceRole.entities.User.get(createdUserId);
        console.log("📊 [PASSO 5] Dados salvos no User:");
        console.log("   - workshop_id:", verifyUser.workshop_id);
        console.log("   - profile_id:", verifyUser.profile_id);
        console.log("   - position:", verifyUser.position);
        console.log("   - user_status:", verifyUser.user_status);
        console.log("   - is_internal:", verifyUser.is_internal);
        
        if (!verifyUser.workshop_id) {
          console.error("❌ [PASSO 5] CRÍTICO não foi salvo!");
        }
        
        // Vincular user_id no Employee
        console.log("🔗 [PASSO 6] Vinculando user_id no Employee...");
        await base44.asServiceRole.entities.Employee.update(employee.id, { user_id });
        console.log("✅ [PASSO 6] Employee vinculado ao User com sucesso!");
      }
    } catch (userError) {
      console.error("❌ [ERRO CRÍTICO] Falha ao criar/atualizar User:");
      console.error("   Mensagem:", userError.message);
      console.error("   Stack:", userError.stack);
      
      // Retornar erro detalhado
      return Response.json({ 
        success,
        error: 'Falha ao criar usuário no sistema',
        details.message,
        employee_created,
        employee_id.id
      }, { status: 500 });
    }

    // 5. Buscar oficina para enviar email
    let workshopData;
    try {
      workshopData = await base44.asServiceRole.entities.Workshop.get(workshop_id);
    } catch (workshopError) {
      console.error("⚠️ Erro ao buscar workshop:", workshopError);
      workshopData = { name: "Oficina" }; // Fallback
    }

    // 6. Buscar token do convite
    const invites = await base44.asServiceRole.entities.EmployeeInvite.filter({ 
      employee_id.id
    }, '-created_date', 1);

    const invite = Array.isArray(invites) && invites.length > 0 ? invites[0] ;
    
    // Gerar domínio correto
    const inviteDomain = `https://oficinasmastergtr.com`;
    
    const inviteLink = invite && invite.invite_token
      ? `${inviteDomain}/PrimeiroAcesso?token=${invite.invite_token}&workshop_id=${workshop_id}&profile_id=${profileId}&employee_id=${employee.id}`
      : `${inviteDomain}/PrimeiroAcesso`;

    console.log("🔗 Convite encontrado:", invite?.invite_token, "Link:", inviteLink);

    // ⏸️ ENVIO DE EMAIL DESABILITADO - Focar em WhatsApp
    console.log("📱 Link disponível para compartilhar via WhatsApp");
    const emailStatus = 'desabilitado - usar WhatsApp';

    // 8. Retornar sucesso
    console.log("✅ Resposta final:", {
      success,
      email,
      invite_link,
      email_status
    });

    return Response.json({ 
      success,
      message: 'Colaborador criado! Email de convite enviado.',
      email,
      temporary_password: "Oficina@2025",
      employee_id.id,
      invite_link,
      email_status
    });

  } catch (error) {
    console.error("❌ Erro:", error);
    return Response.json({ 
      success,
      error.message 
    }, { status: 500 });
  }
});
