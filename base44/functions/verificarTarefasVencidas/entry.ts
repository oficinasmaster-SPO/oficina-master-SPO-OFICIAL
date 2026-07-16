import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Buscar tarefas não concluídas
    const tarefas = await base44.asServiceRole.entities.TarefaBacklog.filter(
      { status: { $ne: 'concluida' } },
      'prazo',
      1000
    );

    const now = new Date();
    let notificacoes = 0;

    for (const tarefa of tarefas) {
      if (!tarefa.prazo || !tarefa.assigned_to_id) continue;

      const prazoData = new Date(tarefa.prazo);

      // Verificar se o prazo foi vencido
      if (prazoData < now) {
        const diasVencidos = Math.floor((now - prazoData) / (24 * 60 * 60 * 1000));
        const message = `🚨 Tarefa vencida: ${tarefa.titulo} | Atrasada há ${diasVencidos} dia(s)`;

        // Buscar dados do Workshop e Consultor
        let workshopName = 'Cliente';
        let consultorName = 'Consultor';

        try {
          if (tarefa.workshop_id) {
            const workshop = await base44.asServiceRole.entities.Workshop.get(tarefa.workshop_id);
            if (workshop) workshopName = workshop.name;
          }
          const consultorList = await base44.asServiceRole.entities.User.filter({ id: tarefa.assigned_to_id }, '', 1);
          if (consultorList?.[0]) consultorName = consultorList[0].full_name;
        } catch (err) {
          console.log('Erro ao buscar Workshop/Consultor:', err.message);
        }

        await base44.asServiceRole.entities.Notification.create({
          user_id: tarefa.assigned_to_id,
          type: 'tarefa_vencida',
          title: 'Tarefa Vencida',
          message: message,
          metadata: {
            tarefa_id: tarefa.id,
            titulo: tarefa.titulo,
            prazo: tarefa.prazo,
            dias_vencidos: diasVencidos,
            workshop_id: tarefa.workshop_id,
            workshop_name: workshopName,
            consultant_id: tarefa.assigned_to_id,
            consultant_name: consultorName,
            attendance_type: 'TarefaBacklog',
            link: `/ControleAceleracao?client=${tarefa.workshop_id}&tab=backlog`
          }
        });

        // Verificar se já existe notificação da mesma tarefa (lida ou não)
        const existing = await base44.asServiceRole.entities.Notification.filter({
          user_id: tarefa.assigned_to_id,
          type: 'tarefa_vencida',
          "metadata.tarefa_id": tarefa.id
        }, null, 1);

        if (existing.length > 0) {
          continue; // Já existe, não cria duplicata
        }

        // Enviar email
        try {
          const user = await base44.asServiceRole.entities.User.filter(
            { id: tarefa.assigned_to_id },
            '',
            1
          );
          if (user && user[0]?.email) {
            await base44.integrations.Core.SendEmail({
              to: user[0].email,
              subject: `⚠️ Tarefa vencida: ${tarefa.titulo}`,
              body: message
            });
          }
        } catch (err) {
          console.log('Email não enviado:', err.message);
        }

        notificacoes++;
      }
    }

    return Response.json({ ok: true, notificacoes });
  } catch (error) {
    console.error('Erro ao verificar tarefas vencidas:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});