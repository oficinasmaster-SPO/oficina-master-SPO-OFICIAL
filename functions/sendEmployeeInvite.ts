import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { addDays } from 'npm:date-fns@3.3.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verificar autenticação
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, email, position, area, job_role, initial_permission, workshop_id, workshop_name, origin, employee_id } = await req.json();

    if (!email || !workshop_id) {
      return Response.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    // Tentar encontrar o employee_id se não foi passado, buscando pelo email na oficina
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
            console.log("Erro ao buscar colaborador existente:", e);
        }
    }

    // Tentar buscar convite existente para não duplicar se estiver pendente
    const existingInvites = await base44.asServiceRole.entities.EmployeeInvite.filter({ 
        email, 
        workshop_id,
        status: 'enviado'
    });

    let invite;
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36) + Math.random().toString(36).substring(2);
    const expiresAt = addDays(new Date(), 5);

    if (existingInvites && existingInvites.length > 0) {
        // Atualizar convite existente
        invite = await base44.asServiceRole.entities.EmployeeInvite.update(existingInvites[0].id, {
            invite_token: token,
            expires_at: expiresAt.toISOString(),
            resent_count: (existingInvites[0].resent_count || 0) + 1,
            last_resent_at: new Date().toISOString(),
            employee_id: targetEmployeeId || existingInvites[0].employee_id // Atualiza vínculo se encontrado
        });
    } else {
        // Criar novo convite
        invite = await base44.asServiceRole.entities.EmployeeInvite.create({
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
            created_by: user.email,
            employee_id: targetEmployeeId || null
        });
    }

    // URL do app
    const baseUrl = origin || "https://app.base44.com"; 
    const inviteUrl = `${baseUrl}/PrimeiroAcesso?token=${token}`;

    // Enviar email
    await base44.integrations.Core.SendEmail({
      to: email,
      from_name: "Oficinas Master",
      subject: `Convite: Junte-se à equipe ${workshop_name}`,
      body: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
            <h2 style="color: #2563eb; text-align: center;">Oficinas Master</h2>
            
            <p>Olá, <strong>${name}</strong>!</p>
            
            <p>A oficina <strong>${workshop_name}</strong> convidou você para acessar o sistema de gestão.</p>
            
            <p><strong>Cargo:</strong> ${position}<br>
            <strong>Área:</strong> ${area}</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Aceitar Convite e Criar Senha
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666;">
              Se o botão não funcionar, copie e cole o link abaixo no seu navegador:<br>
              <a href="${inviteUrl}" style="color: #2563eb;">${inviteUrl}</a>
            </p>
            
            <p style="font-size: 12px; color: #999; margin-top: 30px; text-align: center;">
              Este convite expira em 5 dias.<br>
              Enviado automaticamente por Oficinas Master.
            </p>
          </div>
        </body>
        </html>
      `
    });

    return Response.json({ success: true, invite_id: invite.id });

  } catch (error) {
    console.error("Erro ao enviar convite:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});