import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { token, name, email, phone, profile_picture_url } = await req.json();

    if (!token) {
      return Response.json({ success: false, error: 'Token não fornecido' }, { status: 400 });
    }

    // Buscar convite pelo token usando service role
    const invites = await base44.asServiceRole.entities.EmployeeInvite.list();
    const invite = invites.find(inv => inv.invite_token === token);

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

    let employee;
    if (existingEmployees && existingEmployees.length > 0) {
      // Atualizar existente
      employee = await base44.asServiceRole.entities.Employee.update(existingEmployees[0].id, {
        full_name: name || invite.name,
        telefone: phone || '',
        profile_picture_url: profile_picture_url || '',
        position: invite.position,
        area: invite.area,
        job_role: invite.job_role || 'outros',
        permission_level: invite.initial_permission || 'colaborador',
        status: 'ativo',
        owner_id: ownerId // Garantir que owner_id esteja setado
      });
    } else {
      // Criar novo
      employee = await base44.asServiceRole.entities.Employee.create({
        workshop_id: invite.workshop_id,
        owner_id: ownerId, // Adicionar owner_id
        full_name: name || invite.name,
        email: email || invite.email,
        telefone: phone || '',
        profile_picture_url: profile_picture_url || '',
        position: invite.position,
        area: invite.area,
        job_role: invite.job_role || 'outros',
        hire_date: new Date().toISOString().split('T')[0],
        status: 'ativo',
        permission_level: invite.initial_permission || 'colaborador'
      });
    }

    // Criar ou atualizar User vinculado à oficina
    try {
      const allUsers = await base44.asServiceRole.entities.User.list();
      const existingUser = allUsers.find(u => u.email === (email || invite.email));

      if (existingUser) {
        // Atualizar User existente com dados da oficina
        await base44.asServiceRole.entities.User.update(existingUser.id, {
          workshop_id: invite.workshop_id,
          position: invite.position,
          job_role: invite.job_role || 'outros',
          area: invite.area,
          telefone: phone || existingUser.telefone || '',
          profile_picture_url: profile_picture_url || existingUser.profile_picture_url || '',
          hire_date: employee.hire_date || new Date().toISOString().split('T')[0],
          user_status: 'ativo'
        });
        
        // Vincular User ao Employee
        await base44.asServiceRole.entities.Employee.update(employee.id, {
          user_id: existingUser.id
        });
        
        console.log("✅ User existente vinculado à oficina:", existingUser.id);
      } else {
        // Criar novo User já vinculado à oficina
        const newUser = await base44.asServiceRole.entities.User.create({
          email: email || invite.email,
          full_name: name || invite.name,
          role: 'user',
          workshop_id: invite.workshop_id,
          position: invite.position,
          job_role: invite.job_role || 'outros',
          area: invite.area,
          telefone: phone || '',
          profile_picture_url: profile_picture_url || '',
          hire_date: employee.hire_date || new Date().toISOString().split('T')[0],
          user_status: 'ativo'
        });
        
        // Vincular User ao Employee
        await base44.asServiceRole.entities.Employee.update(employee.id, {
          user_id: newUser.id
        });
        
        console.log("✅ User criado e vinculado à oficina:", newUser.id);
      }
    } catch (userError) {
      console.error("❌ Erro ao criar/vincular User:", userError);
    }

    // Atualizar o convite para concluído
    await base44.asServiceRole.entities.EmployeeInvite.update(invite.id, {
      status: 'concluido',
      completed_at: new Date().toISOString(),
      employee_id: employee.id
    });

    // Enviar email com instruções de acesso
    let emailSent = false;
    let emailError = null;
    try {
      const loginUrl = `${req.headers.get('origin')}/login`;
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email || invite.email,
        subject: `Bem-vindo(a) à ${workshop.name || 'Oficina'} - Crie sua Senha`,
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Olá, ${name || invite.name}!</h2>
            
            <p>Seu cadastro foi concluído com sucesso na plataforma <strong>Oficinas Master</strong>.</p>
            
            <p>Você foi cadastrado(a) como <strong>${invite.position}</strong> na oficina <strong>${workshop.name}</strong>.</p>
            
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
    } catch (error) {
      emailError = error.message;
      console.error('Erro ao enviar email de boas-vindas:', error);
    }

    return Response.json({ 
      success: true, 
      employee_id: employee.id,
      message: 'Colaborador registrado com sucesso',
      email_sent: emailSent,
      email_error: emailError
    });

  } catch (error) {
    console.error('Erro ao registrar colaborador:', error);
    return Response.json({ 
      success: false, 
      error: error.message || 'Erro interno do servidor' 
    }, { status: 500 });
  }
});