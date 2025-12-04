import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { addDays } from 'npm:date-fns@3.3.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verificar autenticação
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Usuário não autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const { name, email, position, area, job_role, initial_permission, workshop_id, workshop_name, origin, employee_id } = body;

    // Validação rigorosa dos campos obrigatórios
    const missingFields = [];
    if (!name) missingFields.push('Nome');
    if (!email) missingFields.push('Email');
    if (!position) missingFields.push('Cargo');
    if (!area) missingFields.push('Área');
    if (!workshop_id) missingFields.push('ID da Oficina');

    if (missingFields.length > 0) {
      return Response.json({ error: `Campos obrigatórios faltando: ${missingFields.join(', ')}` }, { status: 400 });
    }

    // 1. Identificar o employee_id (ID do Colaborador)
    // Se não veio no payload, tenta buscar pelo email na mesma oficina
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
            console.warn("Erro ao buscar colaborador por email:", e);
        }
    }

    // 2. Verificar se já existe um convite PENDENTE (status 'enviado')
    // Se existir, vamos atualizar e reenviar. Se não, criamos um novo.
    const existingInvites = await base44.asServiceRole.entities.EmployeeInvite.filter({ 
        email, 
        workshop_id,
        status: 'enviado'
    });

    const token = Math.random().toString(36).substring(2) + Date.now().toString(36) + Math.random().toString(36).substring(2);
    const expiresAt = addDays(new Date(), 5);
    let invite;

    if (existingInvites && existingInvites.length > 0) {
        // ATUALIZAR convite existente
        const updateData = {
            invite_token: token,
            expires_at: expiresAt.toISOString(),
            resent_count: (existingInvites[0].resent_count || 0) + 1,
            last_resent_at: new Date().toISOString()
        };
        
        // Só atualiza o employee_id se tivermos encontrado um válido
        if (targetEmployeeId) {
            updateData.employee_id = targetEmployeeId;
        }

        invite = await base44.asServiceRole.entities.EmployeeInvite.update(existingInvites[0].id, updateData);
    } else {
        // CRIAR novo convite
        // Importante: Construir o objeto para evitar passar null em campos string
        const newInviteData = {
            name,
            email,
            position,
            area,
            job_role: job_role || 'outros',
            initial_permission: initial_permission || 'colaborador',
            workshop_id,
            invite_token: token,
            expires_at: expiresAt.toISOString(),
            status: "enviado",
            created_by: user.email
        };

        // Adiciona employee_id apenas se existir (evita erro de schema validation com null)
        if (targetEmployeeId) {
            newInviteData.employee_id = targetEmployeeId;
        }

        invite = await base44.asServiceRole.entities.EmployeeInvite.create(newInviteData);
    }

    // 3. Enviar o E-mail
    const baseUrl = origin || "https://app.base44.com"; 
    const inviteUrl = `${baseUrl}/PrimeiroAcesso?token=${token}`;

    try {
        await base44.integrations.Core.SendEmail({
          to: email,
          from_name: "Oficinas Master",
          subject: `Convite para Oficinas Master: ${workshop_name || 'Sua Oficina'}`,
          body: `
            <!DOCTYPE html>
            <html>
            <body style="font-family: sans-serif; color: #333;">
              <div style="padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb; margin-bottom: 20px;">Convite de Acesso</h2>
                <p>Olá, <strong>${name}</strong>.</p>
                <p>Você foi convidado(a) para acessar o sistema da oficina <strong>${workshop_name || 'Parceira'}</strong>.</p>
                
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
                  <p style="margin: 5px 0;"><strong>Cargo:</strong> ${position}</p>
                  <p style="margin: 5px 0;"><strong>Área:</strong> ${area}</p>
                </div>

                <p>Clique no botão abaixo para criar sua senha e acessar:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${inviteUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                    Acessar Sistema
                  </a>
                </div>
                
                <p style="font-size: 12px; color: #6b7280;">
                  Ou copie este link: <br>${inviteUrl}
                </p>
              </div>
            </body>
            </html>
          `
        });
    } catch (emailError) {
        console.error("Erro no envio de email:", emailError);
        // Se falhar o email, mas salvou o convite, retornamos sucesso mas com aviso (ou erro 500 se preferir)
        // Vamos retornar erro para o frontend saber que o email falhou
        return Response.json({ 
            error: "O convite foi salvo, mas houve erro ao enviar o e-mail. Tente reenviar.", 
            details: emailError.message 
        }, { status: 500 });
    }

    return Response.json({ success: true, invite_id: invite.id });

  } catch (error) {
    console.error("Erro crítico na função sendEmployeeInvite:", error);
    return Response.json({ error: error.message || "Erro interno no servidor" }, { status: 500 });
  }
});