import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Notifica cliente quando sua sugestão de horário foi RECUSADA (mantém original)
 * Mensagem amigável explicando que não foi possível acomodar
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const {
      atendimento_id,
      workshop_id,
      data_original,
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

    const dataOriginal = new Date(data_original);
    const dataFormatada = dataOriginal.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const horaFormatada = dataOriginal.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // Email amigável (não é "recusado", é "não conseguimos")
    const corpo = `
<h2>📅 Sua sugestão de horário</h2>

<p>Olá,</p>

<p>Obrigado por sugerir um novo horário para seu atendimento. Infelizmente, <strong>não conseguimos acomodar a data e horário solicitados</strong> devido à disponibilidade do consultor naquele período.</p>

<div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px;">
  <p><strong>Seu Horário Atual (Mantido):</strong></p>
  <p style="font-size: 18px; margin: 10px 0;">
    📅 ${dataFormatada}<br>
    ⏰ ${horaFormatada}
  </p>
  <p style="font-size: 14px; color: #666; margin: 0;">
    Consultor: <strong>${consultor_nome || 'Equipe'}</strong>
  </p>
</div>

<p>Caso deseje sugerir outra alternativa ou agendar em uma data diferente, fique à vontade para entrar em contato conosco.</p>

<p style="margin-top: 30px; color: #999; font-size: 12px;">
  <strong>Oficinas Master</strong><br>
  Sistema de Agendamentos
</p>
    `.trim();

    // Enviar email
    try {
      await base44.integrations.Core.SendEmail({
        to: atendimento.email_cliente || workshop.email,
        subject: `📅 Sobre sua sugestão de horário`,
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
          tipo: 'sugestao_recusada',
          titulo: '⏰ Seu horário permanece como estava',
          mensagem: `Não conseguimos acomodar sua sugestão. Seu atendimento continua em ${dataFormatada} às ${horaFormatada}`,
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
      message: 'Cliente notificado com sucesso (recusado amigável)'
    });

  } catch (error) {
    console.error('Erro em notificarClienteSugestaoRecusada:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});