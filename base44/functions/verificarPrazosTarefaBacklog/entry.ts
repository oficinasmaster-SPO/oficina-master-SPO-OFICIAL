import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const proximosDias = new Date(hoje);
    proximosDias.setDate(proximosDias.getDate() + 3); // próximos 3 dias

    // Tarefas não concluídas
    const tarefas = await base44.asServiceRole.entities.TarefaBacklog.list();
    const tarefasAbertas = tarefas.filter(t => t.status !== 'concluida');

    const notificacoes = [];

    for (const tarefa of tarefasAbertas) {
      if (!tarefa.prazo || !tarefa.consultor_id) continue;

      const prazoDate = new Date(tarefa.prazo);
      prazoDate.setHours(0, 0, 0, 0);

      // Vencida
      if (prazoDate < hoje && !tarefa.notificacao_vencimento_enviada) {
        notificacoes.push({
          user_id: tarefa.consultor_id,
          tipo: 'tarefa_vencida',
          titulo: `🔴 VENCIDA: ${tarefa.titulo}`,
          mensagem: `${tarefa.cliente_nome ? `[${tarefa.cliente_nome}] ` : ''}${tarefa.titulo} VENCEU em ${tarefa.prazo}`,
          tarefa_id: tarefa.id
        });

        await base44.asServiceRole.entities.TarefaBacklog.update(tarefa.id, {
          notificacao_vencimento_enviada: true
        });
      }
      // Prazo próximo (próximos 3 dias)
      else if (prazoDate <= proximosDias && prazoDate > hoje && !tarefa.notificacao_prazo_proximo_enviada) {
        notificacoes.push({
          user_id: tarefa.consultor_id,
          tipo: 'prazo_proximo',
          titulo: `⏰ Prazo próximo: ${tarefa.titulo}`,
          mensagem: `${tarefa.cliente_nome ? `[${tarefa.cliente_nome}] ` : ''}${tarefa.titulo} vence em ${tarefa.prazo}`,
          tarefa_id: tarefa.id
        });

        await base44.asServiceRole.entities.TarefaBacklog.update(tarefa.id, {
          notificacao_prazo_proximo_enviada: true
        });
      }
    }

    // Persiste notificações
    for (const notif of notificacoes) {
      try {
        await base44.asServiceRole.entities.Notification.create({
          user_id: notif.user_id,
          tipo: notif.tipo,
          title: notif.titulo,
          message: notif.mensagem,
          is_read: false,
          email_sent: false,
          metadata: {
            tarefa_id: notif.tarefa_id,
            link: `/backlog/${notif.tarefa_id}`
          }
        });
      } catch (e) {
        console.error('Erro ao criar notificação:', e.message);
      }
    }

    return Response.json({
      ok: true,
      verificadas: tarefasAbertas.length,
      notificacoes: notificacoes.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});