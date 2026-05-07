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
      if (!tarefa.prazo || !tarefa.atribuido_para_id) continue;

      const prazoData = new Date(tarefa.prazo);

      // Verificar se o prazo foi vencido
      if (prazoData < now) {
        const diasVencidos = Math.floor((now - prazoData) / (24 * 60 * 60 * 1000));
        const message = `🚨 Tarefa vencida: ${tarefa.titulo} | Atrasada há ${diasVencidos} dia(s)`;

        await base44.asServiceRole.entities.Notification.create({
          user_id: tarefa.atribuido_para_id,
          type: 'tarefa_vencida',
          title: 'Tarefa Vencida',
          message: message,
          metadata: {
            tarefa_id: tarefa.id,
            titulo: tarefa.titulo,
            prazo: tarefa.prazo,
            dias_vencidos: diasVencidos
          }
        });

        // Enviar email
        try {
          const user = await base44.asServiceRole.entities.User.filter(
            { id: tarefa.atribuido_para_id },
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