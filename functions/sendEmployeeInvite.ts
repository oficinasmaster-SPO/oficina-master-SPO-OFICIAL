import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verificar autenticação
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, email, position, area, job_role, initial_permission, workshop_id, workshop_name, origin, employee_id } = body;

    if (!name || !email || !workshop_id) {
      return Response.json({ error: 'Dados incompletos: Nome, Email e ID da Oficina são obrigatórios.' }, { status: 400 });
    }

    // 1. Identificar o employee_id (ID do Colaborador)
    let targetEmployeeId = employee_id;
    if (!targetEmployeeId) {
        try {
            const existingEmployees = await base44.asServiceRole.entities.Employee.filter({
                email: email,
                workshop_id: workshop_id
            });
            if (existingEmployees && existingEmployees.length > 0) {
                targetEmployeeId = existingEmployees[0].id;
            }
        } catch (e) {
            console.warn("Erro ao buscar colaborador:", e);
        }
    }

    // 2. Gerar Token e Data
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    // Expira em 5 dias (calculado manualmente para evitar dependências externas)
    const expiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

    // 3. Verificar/Criar Convite
    const existingInvites = await base44.asServiceRole.entities.EmployeeInvite.filter({ 
        email, 
        workshop_id,
        status: 'enviado'
    });

    let invite;
    if (existingInvites && existingInvites.length > 0) {
        // Atualizar
        const updateData = {
            invite_token: token,
            expires_at: expiresAt,
            resent_count: (existingInvites[0].resent_count || 0) + 1,
            last_resent_at: new Date().toISOString()
        };
        if (targetEmployeeId) updateData.employee_id = targetEmployeeId;
        
        invite = await base44.asServiceRole.entities.EmployeeInvite.update(existingInvites[0].id, updateData);
    } else {
        // Criar
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
        if (targetEmployeeId) createData.employee_id = targetEmployeeId;

        invite = await base44.asServiceRole.entities.EmployeeInvite.create(createData);
    }

    // 4. Enviar Email
    const baseUrl = origin || "https://app.base44.com"; 
    const inviteUrl = `${baseUrl}/PrimeiroAcesso?token=${token}`;

    try {
        await base44.integrations.Core.SendEmail({
          to: email,
          from_name: "Oficinas Master",
          subject: `Convite: Junte-se à equipe ${workshop_name || ''}`,
          body: `
            <!DOCTYPE html>
            <html>
            <body style="font-family: sans-serif; color: #333;">
              <div style="padding: 20px; border: 1px solid #eee; border-radius: 8px; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">Oficinas Master</h2>
                <p>Olá, <strong>${name}</strong>!</p>
                <p>Você foi convidado para acessar o portal da oficina <strong>${workshop_name || 'sua oficina'}</strong>.</p>
                
                <div style="background: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0;">
                  <p style="margin: 5px 0;"><strong>Cargo:</strong> ${position}</p>
                  <p style="margin: 5px 0;"><strong>Área:</strong> ${area}</p>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="${inviteUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                    Aceitar Convite
                  </a>
                </div>
                
                <p style="font-size: 12px; color: #666;">Link de acesso: ${inviteUrl}</p>
              </div>
            </body>
            </html>
          `
        });
    } catch (emailErr) {
        console.error("Erro envio email:", emailErr);
        return Response.json({ error: "Convite salvo, mas erro ao enviar e-mail. Tente novamente." }, { status: 500 });
    }

    return Response.json({ success: true, invite_id: invite.id });

  } catch (error) {
    console.error("Erro sendEmployeeInvite:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});