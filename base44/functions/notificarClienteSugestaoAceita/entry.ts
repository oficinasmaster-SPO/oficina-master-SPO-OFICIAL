import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Notifica cliente quando sua sugestão de horário foi ACEITA
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const {
      atendimento_id,
      workshop_id,
      data_nova,
      hora_nova,
      consultor_nome
    } = await req.json();

    if (!atendimento_id || !workshop_id) {
      return Response.json({ error: 'Parâmetros obrigatórios faltando' }, { status: 400 });
    }

    // Buscar atendimento e workshop
    const [atendimento, workshop] = await Promise.all([
      base44.entities.ConsultoriaAtendimento.get(atendimento_id),
      base44.entities.Workshop.get(workshop_id)
    ]);

    if (!atendimento || !workshop) {
      return Response.json({ error: 'Atendimento ou workshop não encontrado' }, { status: 404 });
    }

    const dataNova = new Date(`${data_nova}T${hora_nova}:00`);
    const dataFormatada = dataNova.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    // Email amigável
    const corpo = `
<h2>🎉 Sua sugestão foi aceita!</h2>

<p>Olá,</p>

<p>Temos o prazer de informar que sua sugestão de horário foi <strong>aceita</strong>!</p>

<div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 16px; margin: 20px 0; border-radius: 4px;">
  <p><strong>Novo Horário Confirmado:</strong></p>
  <p style="font-size: 18px; margin: 10px 0;">
    📅 ${dataFormatada}<br>
    ⏰ ${hora_nova}
  </p>
  <p style="font-size: 14px; color: #666; margin: 0;">
    Consultor: <strong>${consultor_nome || 'Equipe'}</strong>
  </p>
</div>

<p>Por favor, confirme sua presença clicando no link abaixo ou acessando sua agenda na plataforma.</p>

<p style="margin-top: 30px; color: #999; font-size: 12px;">
  <strong>Oficinas Master</strong><br>
  Sistema de Agendamentos
</p>
    `.trim();

    // Enviar email
    try {
      await base44.integrations.Core.SendEmail({
        to: atendimento.email_cliente || workshop.email,
        subject: `✅ Sua sugestão de horário foi aceita!`,
        body: corpo,
        from_name: 'Oficinas Master'
      });
    } catch (e) {
      console.warn('Erro ao enviar email:', e.message);
    }

    // In-app notification
    try {
      const user = await base44.entities.User.filter({ 
        'data.workshop_id': workshop_id 
      }, undefined, 1);
      
      if (user && user.length > 0) {
        await base44.entities.Notification.bulkCreate([{
          user_id: user[0].id,
          tipo: 'sugestao_aceita',
          titulo: '✅ Seu horário foi confirmado!',
          mensagem: `Seu novo agendamento foi aceito para ${dataFormatada} às ${hora_nova}`,
          is_read: false,
          referencia_id: atendimento_id,
          referencia_tipo: 'atendimento'
        }]);
      }
    } catch (e) {
      console.warn('Erro ao criar notificação:', e.message);
    }

    return Response.json({
      success: true,
      message: 'Cliente notificado com sucesso (aceito)'
    });

  } catch (error) {
    console.error('Erro em notificarClienteSugestaoAceita:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});