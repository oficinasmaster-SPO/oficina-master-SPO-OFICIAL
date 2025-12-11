import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    // 1. Autenticação
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Usuário não autenticado' }, { status: 401 });
    }

    // 2. Parse do Corpo
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return Response.json({ error: 'Corpo da requisição inválido (JSON)' }, { status: 400 });
    }

    const { name, email, position, area, job_role, initial_permission, workshop_id, workshop_name, origin, employee_id } = body;

    // 3. Validação de Campos
    const missing = [];
    if (!name) missing.push('Nome');
    if (!email) missing.push('Email');
    if (!workshop_id) missing.push('ID da Oficina');
    
    if (missing.length > 0) {
      return Response.json({ error: `Campos obrigatórios faltando: ${missing.join(', ')}` }, { status: 400 });
    }

    // 4. Busca de Employee ID (se não fornecido)
    let finalEmployeeId = employee_id;
    if (!finalEmployeeId) {
        try {
            // Tenta achar colaborador com este email nesta oficina
            const emps = await base44.asServiceRole.entities.Employee.filter({
                email: email,
                workshop_id: workshop_id
            });
            if (emps && emps.length > 0) {
                finalEmployeeId = emps[0].id;
            }
        } catch (err) {
            console.warn("Erro não-bloqueante ao buscar employee_id:", err);
        }
    }

    // 5. Lógica de Convite (Criar ou Atualizar)
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const expiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    
    let inviteId;
    let isNew = true;

    try {
        // Verifica convites pendentes
        const existingInvites = await base44.asServiceRole.entities.EmployeeInvite.filter({ 
            email, 
            workshop_id,
            status: 'enviado'
        });

        if (existingInvites && existingInvites.length > 0) {
            // Atualiza o primeiro encontrado
            isNew = false;
            const inv = existingInvites[0];
            inviteId = inv.id;
            
            const updateData = {
                invite_token: token,
                expires_at: expiresAt,
                resent_count: (inv.resent_count || 0) + 1,
                last_resent_at: new Date().toISOString()
            };
            if (finalEmployeeId) updateData.employee_id = finalEmployeeId;

            await base44.asServiceRole.entities.EmployeeInvite.update(inv.id, updateData);
        } else {
            // Cria novo
            const createData = {
                name,
                email,
                position,
                area,
                job_role: job_role || 'outros',
                initial_permission: initial_permission || 'colaborador',
                workshop_id,
                invite_token: token,
                expires_at: expiresAt,
                status: "enviado",
                created_by: user.email
            };
            // Só adiciona se existir valor (evita null)
            if (finalEmployeeId) createData.employee_id = finalEmployeeId;

            const newInvite = await base44.asServiceRole.entities.EmployeeInvite.create(createData);
            inviteId = newInvite.id;
        }
    } catch (dbError) {
        console.error("Erro de Banco de Dados:", dbError);
        return Response.json({ 
            error: "Erro ao salvar convite no banco de dados.", 
            details: dbError.message 
        }, { status: 500 });
    }

    // 6. Criar User no banco de dados
    try {
        const allUsers = await base44.asServiceRole.entities.User.list();
        const existingUser = allUsers.find(u => u.email === email);

        if (!existingUser) {
            const newUser = await base44.asServiceRole.entities.User.create({
                email: email,
                full_name: name,
                role: 'user',
                workshop_id: workshop_id,
                position: position || 'Colaborador',
                job_role: job_role || 'outros',
                area: area || 'tecnico',
                telefone: '',
                profile_picture_url: '',
                hire_date: new Date().toISOString().split('T')[0],
                user_status: 'ativo'
            });
            console.log("✅ User criado:", newUser.id);

            if (finalEmployeeId) {
                await base44.asServiceRole.entities.Employee.update(finalEmployeeId, {
                    user_id: newUser.id
                });
                console.log("✅ User vinculado ao Employee");
            }
        } else {
            console.log("✅ User já existe, atualizando:", existingUser.id);
            await base44.asServiceRole.entities.User.update(existingUser.id, {
                workshop_id: workshop_id,
                position: position || existingUser.position,
                job_role: job_role || existingUser.job_role,
                area: area || existingUser.area,
                user_status: 'ativo'
            });
        }
    } catch (userError) {
        console.error("❌ Erro ao criar User:", userError.message);
    }

    // 7. Envio de Email
    const baseUrl = origin || "https://app.base44.com";
    const inviteUrl = `${baseUrl}/PrimeiroAcesso?token=${token}`;
    const companyName = workshop_name || "Oficinas Master";

    try {
        await base44.asServiceRole.integrations.Core.SendEmail({
            to: email,
            subject: `🔑 Convite de Acesso - ${companyName}`,
            body: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
                <div style="background-color: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <h2 style="color: #1e40af; margin-bottom: 20px;">Olá, ${name}!</h2>
                  
                  <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                    Você foi convidado(a) para acessar o sistema de gestão da <strong>${companyName}</strong>.
                  </p>

                  <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                    Cargo: <strong>${position}</strong><br>
                    Área: <strong>${area}</strong>
                  </p>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${inviteUrl}" 
                       style="background-color: #2563eb; color: white; padding: 14px 32px; 
                              text-decoration: none; border-radius: 8px; display: inline-block;
                              font-weight: bold; font-size: 16px;">
                      Aceitar Convite
                    </a>
                  </div>
                  
                  <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
                    <strong>⏰ Este link é válido por 5 dias.</strong>
                  </p>

                  <p style="color: #9ca3af; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                    Se você não solicitou este convite, ignore este email.<br>
                    Equipe Oficinas Master
                  </p>
                </div>
              </div>
            `
        });
        console.log("✅ Email enviado com sucesso para:", email);
    } catch (emailError) {
        console.error("❌ Erro ao enviar email:", emailError.message);
        return Response.json({ 
            error: "Convite salvo, mas erro ao enviar email. Verifique se o serviço de email está ativo.",
            invite_id: inviteId,
            details: emailError.message
        }, { status: 500 });
    }

    return Response.json({ 
        success: true, 
        message: isNew ? "Convite criado e enviado com sucesso" : "Convite reenviado com sucesso",
        invite_id: inviteId 
    });

  } catch (globalError) {
    console.error("Erro não tratado na função:", globalError);
    return Response.json({ error: "Erro interno do servidor", details: globalError.message }, { status: 500 });
  }
});