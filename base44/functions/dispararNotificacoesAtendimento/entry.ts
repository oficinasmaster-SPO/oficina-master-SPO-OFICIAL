import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Buscar atendimentos futuros com notificações programadas
    const agora = new Date();
    const em48h = new Date(agora.getTime() + 48 * 60 * 60 * 1000);

    const atendimentos = await base44.asServiceRole.entities.ConsultoriaAtendimento.filter({
      status: { $in: ['agendado', 'confirmado'] }
    });

    let enviados = 0;
    let erros = 0;

    for (const atendimento of atendimentos) {
      const notificacoes = atendimento.notificacoes_programadas;
      if (!notificacoes || notificacoes.length === 0) continue;

      const dataAtendimento = new Date(atendimento.data_agendada);
      if (isNaN(dataAtendimento.getTime())) continue;

      // Buscar workshop para pegar email/telefone
      let workshop = null;
      if (atendimento.workshop_id) {
        const workshops = await base44.asServiceRole.entities.Workshop.filter({ id: atendimento.workshop_id });
        workshop = workshops[0] || null;
      }

      for (const notif of notificacoes) {
        // Calcular quando esta notificação deve ser disparada
        let offsetMs = 0;
        const valor = parseInt(notif.prazo_valor) || 1;
        if (notif.prazo_unidade === 'horas') offsetMs = valor * 60 * 60 * 1000;
        else if (notif.prazo_unidade === 'dias') offsetMs = valor * 24 * 60 * 60 * 1000;
        else if (notif.prazo_unidade === 'semanas') offsetMs = valor * 7 * 24 * 60 * 60 * 1000;

        const momentoDisparo = new Date(dataAtendimento.getTime() - offsetMs);

        // Verificar se está na janela de disparo (entre agora e 1 hora atrás)
        const umaHoraAtras = new Date(agora.getTime() - 60 * 60 * 1000);
        if (momentoDisparo < umaHoraAtras || momentoDisparo > agora) continue;

        // Evitar reenvio — verificar notificação_enviada
        if (atendimento.notificacao_enviada) continue;

        const mensagem = notif.mensagem || `Lembrete: você tem um atendimento agendado para ${dataAtendimento.toLocaleString('pt-BR')}.`;
        const tipoLabel = notif.tipo === 'confirmacao' ? 'Confirmação' : notif.tipo === 'follow_up' ? 'Follow-up' : 'Lembrete';

        // Canal: Plataforma (notificação interna)
        if (notif.enviar_plataforma && atendimento.consultor_id) {
          await base44.asServiceRole.entities.Notification.create({
            user_id: atendimento.consultor_id,
            title: `${tipoLabel}: Atendimento em ${valor} ${notif.prazo_unidade}`,
            message: mensagem,
            type: 'atendimento',
            is_read: false,
            link: `/ControleAceleracao`
          });
          enviados++;
        }

        // Canal: Email
        if (notif.enviar_email && workshop?.email) {
          const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
          if (RESEND_API_KEY) {
            const html = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #dc2626;">${tipoLabel} de Atendimento</h2>
                <p>${mensagem}</p>
                <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
                <p><strong>Oficina:</strong> ${workshop.name}</p>
                <p><strong>Tipo:</strong> ${atendimento.tipo_atendimento || 'Consultoria'}</p>
                <p><strong>Data:</strong> ${dataAtendimento.toLocaleString('pt-BR')}</p>
                ${atendimento.google_meet_link ? `<p><strong>Link Meet:</strong> <a href="${atendimento.google_meet_link}">${atendimento.google_meet_link}</a></p>` : ''}
                <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">Oficinas Master — Plataforma de Consultoria</p>
              </div>
            `;
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                from: 'Oficinas Master <onboarding@resend.dev>',
                to: [workshop.email],
                subject: `${tipoLabel}: Atendimento em ${valor} ${notif.prazo_unidade}`,
                html
              })
            });
            enviados++;
          }
        }

        // Canal: WhatsApp (reservado para quando Evolution API estiver configurado)
        // if (notif.enviar_whatsapp && workshop?.telefone) { ... }
      }

      // Marcar atendimento como notificado para evitar duplicatas
      if (enviados > 0) {
        await base44.asServiceRole.entities.ConsultoriaAtendimento.update(atendimento.id, {
          notificacao_enviada: true
        });
      }
    }

    return Response.json({
      success: true,
      message: `Processamento concluído: ${enviados} notificações enviadas, ${erros} erros.`,
      enviados,
      erros
    });

  } catch (error) {
    console.error('Erro ao disparar notificações:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});