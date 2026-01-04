import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Usuário não autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const { name, email, position, area, job_role, initial_permission, workshop_id, workshop_name, origin, employee_id, invite_type = 'workshop', profile_id, role, telefone, company_id } = body;
    
    console.log("📋 Profile ID recebido:", profile_id);

    if (!name || !email) {
      return Response.json({ error: 'Campos obrigatórios: nome e email' }, { status: 400 });
    }

    if (invite_type === 'workshop' && !workshop_id) {
      return Response.json({ error: 'Workshop obrigatório para colaboradores de oficina' }, { status: 400 });
    }

    console.log("📧 Iniciando convite para:", email);
    console.log("📋 Tipo de convite:", invite_type);

    // Criar Employee para todos (internos e externos)
    let finalEmployeeId = employee_id;
    let employee;

    if (invite_type === 'internal') {
      // Criar Employee interno para aparecer na listagem
      if (!finalEmployeeId) {
        const employees = await base44.asServiceRole.entities.Employee.filter({ 
          email: email, 
          tipo_vinculo: 'interno'
        });

        if (employees && employees.length > 0) {
          employee = employees[0];
          finalEmployeeId = employee.id;
          console.log("✅ Employee interno já existe:", finalEmployeeId);
        } else {
          employee = await base44.asServiceRole.entities.Employee.create({
            full_name: name,
            email: email,
            position: position || 'Usuário Interno',
            area: area || 'administrativo',
            job_role: job_role || 'consultor',
            telefone: telefone || '',
            status: 'ativo',
            user_status: 'pending',
            tipo_vinculo: 'interno',
            is_internal: true,
            hire_date: new Date().toISOString().split('T')[0],
            profile_id: profile_id || null
          });
          finalEmployeeId = employee.id;
          console.log("✅ Employee interno criado:", finalEmployeeId);
        }
      }
    } else {
      // Apenas para colaboradores de oficina: criar Employee
      if (!finalEmployeeId) {
        const employees = await base44.asServiceRole.entities.Employee.filter({ 
          email: email, 
          workshop_id: workshop_id 
        });

        if (employees && employees.length > 0) {
          employee = employees[0];
          finalEmployeeId = employee.id;
          console.log("✅ Employee já existe:", finalEmployeeId);
        } else {
          const workshops = await base44.asServiceRole.entities.Workshop.filter({ id: workshop_id });
          const workshop = workshops[0];

          employee = await base44.asServiceRole.entities.Employee.create({
            full_name: name,
            email: email,
            position: position || 'Colaborador',
            area: area || 'tecnico',
            job_role: job_role || 'outros',
            status: 'ativo',
            tipo_vinculo: 'cliente',
            is_internal: false,
            hire_date: new Date().toISOString().split('T')[0],
            workshop_id: workshop_id,
            owner_id: workshop?.owner_id || null
          });
          finalEmployeeId = employee.id;
          console.log("✅ Employee criado:", finalEmployeeId);
        }
      }
    }

    // Gerar token
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Verificar convites existentes
    const inviteFilter = invite_type === 'internal'
      ? { email: email, invite_type: 'internal' }
      : { email: email, workshop_id: workshop_id };

    const existingInvites = await base44.asServiceRole.entities.EmployeeInvite.filter(inviteFilter);

    let inviteId;
    const inviteData = {
      name,
      email,
      position: position || (invite_type === 'internal' ? 'Usuário Interno' : 'Colaborador'),
      area: area || (invite_type === 'internal' ? 'administrativo' : 'tecnico'),
      job_role: job_role || (invite_type === 'internal' ? 'consultor' : 'outros'),
      initial_permission: initial_permission || 'colaborador',
      company_id: invite_type === 'internal' ? company_id : null,
      workshop_id: invite_type === 'workshop' ? workshop_id : null,
      invite_type,
      employee_id: finalEmployeeId,
      invite_token: token,
      expires_at: expiresAt,
      status: 'enviado'
    };

    // Adicionar profile_id ao convite (interno ou workshop)
    if (profile_id) {
      inviteData.profile_id = profile_id;
      
      // Metadados extras para internos
      if (invite_type === 'internal') {
        inviteData.metadata = {
          role: role || 'user',
          telefone: telefone || ''
        };
      }
    }

    if (existingInvites && existingInvites.length > 0) {
      const existing = existingInvites[0];
      inviteId = existing.id;

      await base44.asServiceRole.entities.EmployeeInvite.update(existing.id, {
        ...inviteData,
        resent_count: (existing.resent_count || 0) + 1,
        last_resent_at: new Date().toISOString()
      });
      console.log("🔄 Convite atualizado:", inviteId);
    } else {
      const newInvite = await base44.asServiceRole.entities.EmployeeInvite.create(inviteData);
      inviteId = newInvite.id;
      console.log("✅ Convite criado:", inviteId);
    }

    // NÃO criar User aqui - será criado apenas no primeiro login após aprovação
    console.log("ℹ️ User será criado no primeiro login após aprovação do admin");

    // Usa o domínio oficial da aplicação
    const baseUrl = 'https://oficina-master-b2bc845b.base44.app';
    const inviteUrl = `${baseUrl}/PrimeiroAcesso?token=${token}`;

    console.log("✅ Link de convite gerado:", inviteUrl);

    // Enviar email com convite
    let emailSent = false;
    let emailError = null;

    try {
      console.log("📧 Enviando email de convite para:", email);

      const emailSubject = invite_type === 'internal' 
        ? 'Bem-vindo a Equipe Oficinas Master - Complete seu Cadastro'
        : 'Bem-vindo - Complete seu Cadastro';

      const emailBody = invite_type === 'internal' 
        ? '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">' +
          '<h2 style="color: #2563eb;">Bem-vindo a Equipe Oficinas Master!</h2>' +
          '<p>Ola, <strong>' + name + '</strong>!</p>' +
          '<p>Voce foi convidado para fazer parte da equipe interna da <strong>Oficinas Master</strong> como <strong>' + position + '</strong>.</p>' +
          '<h3 style="color: #1e40af;">Complete seu Cadastro:</h3>' +
          '<div style="text-align: center; margin: 30px 0;">' +
          '<a href="' + inviteUrl + '" style="background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">Completar Cadastro</a>' +
          '</div>' +
          '<p style="color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;"><strong>Importante:</strong> Este link expira em 7 dias.</p>' +
          '<p style="color: #666; font-size: 12px; margin-top: 20px;">Email de login: <strong>' + email + '</strong></p>' +
          '</div>'
        : '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">' +
          '<h2 style="color: #2563eb;">Bem-vindo!</h2>' +
          '<p>Ola, <strong>' + name + '</strong>!</p>' +
          '<p>Voce foi convidado para fazer parte da equipe como <strong>' + position + '</strong>.</p>' +
          '<h3 style="color: #1e40af;">Complete seu Cadastro:</h3>' +
          '<div style="text-align: center; margin: 30px 0;">' +
          '<a href="' + inviteUrl + '" style="background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">Completar Cadastro</a>' +
          '</div>' +
          '<p style="color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;"><strong>Importante:</strong> Este link expira em 7 dias.</p>' +
          '</div>';

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: emailSubject,
        body: emailBody
      });

      emailSent = true;
      console.log("✅ Email enviado com sucesso para:", email);

    } catch (error) {
      emailError = error.message;
      console.error("❌ Erro ao enviar email:", error);
    }

    return Response.json({ 
      success: true, 
      message: emailSent ? 'Convite enviado por email com sucesso!' : 'Convite criado. Email não pôde ser enviado.',
      invite_id: inviteId,
      invite_url: inviteUrl,
      employee_id: finalEmployeeId,
      email_sent: emailSent,
      email_error: emailError,
      instructions: emailSent 
        ? `Email enviado para ${email}` 
        : `Envie este link manualmente para ${name} (${email}): ${inviteUrl}`
    });

  } catch (error) {
    console.error("❌ Erro:", error);
    return Response.json({ 
      success: false,
      error: 'Erro ao criar convite',
      details: error.message 
    }, { status: 500 });
  }
});