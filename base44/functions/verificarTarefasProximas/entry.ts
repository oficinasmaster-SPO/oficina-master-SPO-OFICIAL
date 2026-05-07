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
    const emQuatroHoras = new Date(now.getTime() + 4 * 60 * 60 * 1000);
    let notificacoes = 0;

    for (const tarefa of tarefas) {
      if (!tarefa.prazo || !tarefa.atribuido_para_id) continue;

      const prazoData = new Date(tarefa.prazo);

      // Verificar se o prazo é próximo (menos de 4 horas) e ainda não foi vencido
      if (prazoData > now && prazoData <= emQuatroHoras) {
        const horasRestantes = Math.ceil((prazoData - now) / (60 * 60 * 1000));
        const message = `⚠️ Prazo próximo: ${tarefa.titulo} vence em ${horasRestantes} hora(s)`;

        await base44.asServiceRole.entities.Notification.create({
          user_id: tarefa.atribuido_para_id,
          type: 'tarefa_prazo_proximo',
          title: 'Prazo Próximo',
          message: message,
          metadata: {
            tarefa_id: tarefa.id,
            titulo: tarefa.titulo,
            prazo: tarefa.prazo,
            horas_restantes: horasRestantes
          }
        });

        notificacoes++;
      }
    }

    return Response.json({ ok: true, notificacoes });
  } catch (error) {
    console.error('Erro ao verificar tarefas próximas:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});