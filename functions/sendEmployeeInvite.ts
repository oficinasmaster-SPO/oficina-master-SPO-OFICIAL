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

    const { name, email, position, area, job_role, initial_permission, workshop_id, workshop_name } = await req.json();

    if (!email || !workshop_id) {
      return Response.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    const token = Math.random().toString(36).substring(2) + Date.now().toString(36) + Math.random().toString(36).substring(2);
    const expiresAt = addDays(new Date(), 5);

    // Criar o convite usando service role para garantir permissão
    const invite = await base44.asServiceRole.entities.EmployeeInvite.create({
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
    });

    // URL do frontend (origin do request ou configurado)
    // Assumindo que o frontend envia a origin ou pegamos do header, mas aqui vamos construir baseada no padrão base44 se possível, 
    // ou receber o origin no payload. Vamos receber originUrl no payload para ser seguro.
    // Mas como fallback, usamos uma string genérica que o frontend deve substituir ou o usuário deve saber.
    // Melhor: o frontend manda a inviteUrl base.
    
    const reqUrl = new URL(req.url);
    // A URL do app pode ser inferida ou passada. Vamos simplificar e pedir pro front passar a base URL.
    
    // ATENÇÃO: O frontend vai passar a URL base para montarmos o link
    // Se não, tentamos inferir (difícil em serverless functions sem contexto do host do front).
    // Vamos usar um parametro 'origin' no body.

    const body = await req.json().catch(() => ({}));
    const origin = body.origin || req.headers.get("origin") || "https://app.base44.com"; // Fallback
    const inviteUrl = `${origin}/PrimeiroAcesso?token=${token}`;

    // Enviar email
    await base44.integrations.Core.SendEmail({
      to: email,
      subject: `Convite para ${workshop_name} - Oficinas Master`,
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #3b82f6, #6366f1); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0;">🔧 ${workshop_name}</h1>
            <p style="color: rgba(255,255,255,0.9); margin-top: 10px;">Oficinas Master</p>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px;">
            <h2 style="color: #1e293b; margin-top: 0;">Olá, ${name}!</h2>
            
            <p style="color: #475569; line-height: 1.6;">
              Você foi convidado(a) para fazer parte da equipe da <strong>${workshop_name}</strong> 
              como <strong>${position}</strong> na área de <strong>${area}</strong>.
            </p>
            
            <p style="color: #475569; line-height: 1.6;">
              Para completar seu cadastro e começar a usar a plataforma, clique no botão abaixo:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteUrl}" style="background: linear-gradient(135deg, #3b82f6, #6366f1); color: white; padding: 15px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                Completar Cadastro
              </a>
            </div>
            
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin: 20px 0;">
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                ⚠️ <strong>Atenção:</strong> Este link expira em 5 dias.
              </p>
            </div>
            
            <p style="color: #64748b; font-size: 12px; margin-top: 30px;">
              Se você não reconhece este convite, ignore este e-mail.
            </p>
          </div>
        </div>
      `
    });

    return Response.json({ success: true, invite_id: invite.id });

  } catch (error) {
    console.error("Erro ao enviar convite:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});