import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { token, name, email, phone, profile_picture_url } = await req.json();

    if (!token) {
      return Response.json({ success: false, error: 'Token não fornecido' }, { status: 400 });
    }

    console.log("🔍 Buscando convite com token:", token);

    // Buscar convite pelo token usando service role - filter é mais eficiente
    const invites = await base44.asServiceRole.entities.EmployeeInvite.filter({ invite_token: token });
    const invite = invites[0];
    
    console.log("📋 Convite encontrado:", invite ? "SIM" : "NÃO");

    if (!invite) {
      return Response.json({ success: false, error: 'Convite não encontrado' }, { status: 404 });
    }

    // Verificar se expirou
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return Response.json({ success: false, error: 'Convite expirado' }, { status: 400 });
    }

    // Verificar se já foi concluído
    if (invite.status === 'concluido') {
      return Response.json({ success: false, error: 'Convite já utilizado' }, { status: 400 });
    }

    // Buscar a oficina para obter o owner_id
    const workshops = await base44.asServiceRole.entities.Workshop.filter({ id: invite.workshop_id });
    const workshop = workshops[0];
    const ownerId = workshop ? workshop.owner_id : null;

    // Verificar se já existe colaborador com este email na oficina
    const existingEmployees = await base44.asServiceRole.entities.Employee.filter({ 
      email: email || invite.email,
      workshop_id: invite.workshop_id 
    });

    console.log("👤 Employee existente?", existingEmployees.length > 0);

    let employee;
    const employeeData = {
      full_name: name || invite.name,
      telefone: phone || '(00) 00000-0000',
      profile_picture_url: profile_picture_url || '',
      position: invite.position,
      area: invite.area || 'tecnico',
      job_role: invite.job_role || 'outros',
      status: 'ativo',
      first_login_at: new Date().toISOString()
    };

    if (existingEmployees && existingEmployees.length > 0) {
      // Atualizar existente
      employee = await base44.asServiceRole.entities.Employee.update(existingEmployees[0].id, {
        ...employeeData,
        owner_id: ownerId
      });
      console.log("✅ Employee atualizado:", employee.id);
    } else {
      // Criar novo
      employee = await base44.asServiceRole.entities.Employee.create({
        workshop_id: invite.workshop_id,
        owner_id: ownerId,
        email: email || invite.email,
        hire_date: new Date().toISOString().split('T')[0],
        ...employeeData
      });
      console.log("✅ Employee criado:", employee.id);
    }

    // IMPORTANTE: Atualizar convite ANTES de tentar criar/atualizar User
    // Isso garante que o registro do colaborador foi feito
    await base44.asServiceRole.entities.EmployeeInvite.update(invite.id, {
      status: 'concluido',
      completed_at: new Date().toISOString(),
      employee_id: employee.id
    });

    console.log("✅ Convite marcado como concluído");

    // Criar ou atualizar User vinculado à oficina
    // IMPORTANTE: User precisa dos campos obrigatórios preenchidos
    try {
      const allUsers = await base44.asServiceRole.entities.User.filter({ email: email || invite.email });
      const existingUser = allUsers[0];

      const userDataToUpdate = {
        workshop_id: invite.workshop_id,
        position: invite.position,
        job_role: invite.job_role || 'outros',
        area: invite.area || 'tecnico',
        telefone: phone || '(00) 00000-0000',
        profile_picture_url: profile_picture_url || '',
        hire_date: employee.hire_date || new Date().toISOString().split('T')[0],
        user_status: 'ativo'
      };

      console.log("👤 Dados do User a serem salvos:", userDataToUpdate);

      if (existingUser) {
        // Atualizar User existente com dados da oficina
        await base44.asServiceRole.entities.User.update(existingUser.id, userDataToUpdate);
        
        // Vincular User ao Employee
        await base44.asServiceRole.entities.Employee.update(employee.id, {
          user_id: existingUser.id
        });
        
        console.log("✅ User existente atualizado e vinculado:", existingUser.id);
      } else {
        // NÃO criar novo User - o usuário precisa criar conta via login
        // Apenas registrar o Employee para quando ele fizer login ser vinculado
        console.log("ℹ️ User não existe ainda - será criado no primeiro login");
      }
    } catch (userError) {
      console.error("❌ Erro ao criar/vincular User:", userError);
      console.error("❌ Stack trace:", userError.stack);
      // NÃO bloqueia o processo - colaborador foi criado com sucesso
    }

    // Enviar email com instruções de acesso
    let emailSent = false;
    let emailError = null;
    try {
      const origin = req.headers.get('origin') || 'https://oficinasmastergtr.com';
      const loginUrl = `${origin}/login`;
      
      // Criar permissões padrão para o colaborador baseado em job_role
      try {
        console.log("🔐 Criando permissões padrão...");
        await base44.asServiceRole.functions.invoke('createDefaultPermissions', {
          user_id: existingUser?.id || 'pending', // Se não tiver user ainda, será criado no login
          workshop_id: invite.workshop_id,
          job_role: invite.job_role || 'outros'
        });
        console.log("✅ Permissões padrão configuradas!");
      } catch (permError) {
        console.error("⚠️ Erro ao criar permissões (não crítico):", permError);
      }

      console.log("📧 Enviando email para:", email || invite.email);
      
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email || invite.email,
        subject: `Bem-vindo(a) à ${workshop?.name || 'Oficina'} - Crie sua Senha`,
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Olá, ${name || invite.name}!</h2>
            
            <p>Seu cadastro foi concluído com sucesso na plataforma <strong>Oficinas Master</strong>.</p>
            
            <p>Você foi cadastrado(a) como <strong>${invite.position}</strong> na oficina <strong>${workshop?.name || 'Sua Oficina'}</strong>.</p>
            
            <h3 style="color: #1e40af;">Próximos Passos:</h3>
            <ol>
              <li>Clique no botão abaixo para acessar a plataforma</li>
              <li>Use o email: <strong>${email || invite.email}</strong></li>
              <li>Clique em "Criar Conta" para definir sua senha de acesso</li>
            </ol>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" 
                 style="background-color: #2563eb; color: white; padding: 15px 30px; 
                        text-decoration: none; border-radius: 8px; display: inline-block;
                        font-weight: bold;">
                Acessar Plataforma
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <strong>Importante:</strong> Use exatamente o email <strong>${email || invite.email}</strong> ao criar sua conta.
            </p>
            
            <p style="color: #666; font-size: 12px; margin-top: 20px;">
              Se você tiver dúvidas, entre em contato com seu gestor.
            </p>
          </div>
        `
      });
      emailSent = true;
      console.log("✅ Email enviado com sucesso!");
    } catch (error) {
      emailError = error.message;
      console.error('❌ Erro ao enviar email de boas-vindas:', error);
    }

    console.log("✅ Colaborador registrado com sucesso!");
    console.log("📊 Employee ID:", employee.id);
    console.log("📧 Email enviado:", emailSent);

    return Response.json({ 
      success: true, 
      employee_id: employee.id,
      message: 'Colaborador registrado com sucesso',
      email_sent: emailSent,
      email_error: emailError
    });

  } catch (error) {
    console.error('❌ Erro ao registrar colaborador:', error);
    console.error('❌ Stack trace completo:', error.stack);
    return Response.json({ 
      success: false, 
      error: error.message || 'Erro interno do servidor',
      details: error.stack
    }, { status: 500 });
  }
});