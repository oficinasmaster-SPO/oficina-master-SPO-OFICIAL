import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { event, data, old_data } = payload;
    const eventType = event?.type;
    const tarefaId = data?.id || event?.entity_id;
    const now = new Date();
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const notificacoes = [];

    // ✅ CRIAÇÃO: Notifica o responsável
    if (eventType === 'create') {
      if (!data.notificacao_criacao_enviada && data.consultor_id) {
        notificacoes.push({
          user_id: data.consultor_id,
          tipo: 'tarefa_criada',
          titulo: `Nova tarefa: ${data.titulo}`,
          mensagem: `${data.cliente_nome ? `[${data.cliente_nome}] ` : ''}${data.titulo}. Prazo: ${data.prazo}`,
          tarefa_id: tarefaId,
          link: `/backlog/${tarefaId}`
        });

        // Marca como notificado
        await base44.asServiceRole.entities.TarefaBacklog.update(tarefaId, {
          notificacao_criacao_enviada: true
        });
      }
    }

    // ✅ ATRIBUIÇÃO: Notifica o novo responsável
    if (eventType === 'update' && old_data && old_data.consultor_id !== data?.consultor_id) {
      if (data.consultor_id && !data.notificacao_atribuicao_enviada) {
        notificacoes.push({
          user_id: data.consultor_id,
          tipo: 'tarefa_atribuida',
          titulo: `Tarefa atribuída a você: ${data.titulo}`,
          mensagem: `${data.cliente_nome ? `[${data.cliente_nome}] ` : ''}${data.titulo}. Prazo: ${data.prazo}`,
          tarefa_id: tarefaId,
          link: `/backlog/${tarefaId}`
        });

        await base44.asServiceRole.entities.TarefaBacklog.update(tarefaId, {
          notificacao_atribuicao_enviada: true
        });
      }
    }

    // ✅ MUDANÇA DE STATUS: Notifica o criador (com debounce)
    if (eventType === 'update' && old_data && old_data.status !== data?.status) {
      if (data.criado_por_id && data.criado_por_id !== data.consultor_id) {
        const ultimaNotificacao = data.ultima_notificacao_status_em
          ? new Date(data.ultima_notificacao_status_em)
          : null;
        const minutosDesdeLasta = ultimaNotificacao
          ? (now - ultimaNotificacao) / (1000 * 60)
          : Infinity;

        // Debounce: só notifica se passou 30 minutos desde última
        if (minutosDesdeLasta >= 30 || !ultimaNotificacao) {
          notificacoes.push({
            user_id: data.criado_por_id,
            tipo: 'status_alterado',
            titulo: `Status alterado: ${data.titulo}`,
            mensagem: `${data.cliente_nome ? `[${data.cliente_nome}] ` : ''}${data.titulo}. Novo status: ${data.status}`,
            tarefa_id: tarefaId,
            link: `/backlog/${tarefaId}`
          });

          await base44.asServiceRole.entities.TarefaBacklog.update(tarefaId, {
            ultima_notificacao_status_em: now.toISOString()
          });
        }
      }
    }

    // ✅ BLOQUEIO: Alerta forte ao criador
    if (eventType === 'update' && old_data && old_data.status !== 'bloqueada' && data?.status === 'bloqueada') {
      if (data.criado_por_id) {
        notificacoes.push({
          user_id: data.criado_por_id,
          tipo: 'tarefa_bloqueada',
          titulo: `⚠️ Tarefa bloqueada: ${data.titulo}`,
          mensagem: `${data.cliente_nome ? `[${data.cliente_nome}] ` : ''}${data.titulo} foi bloqueada. Motivo: ${data.motivo_bloqueio || 'Não especificado'}`,
          tarefa_id: tarefaId,
          link: `/backlog/${tarefaId}`
        });

        await base44.asServiceRole.entities.TarefaBacklog.update(tarefaId, {
          notificacao_bloqueio_enviada: true
        });
      }
    }

    // ✅ CONCLUSÃO: Notifica o criador
    if (eventType === 'update' && old_data && old_data.status !== 'concluida' && data?.status === 'concluida') {
      if (data.criado_por_id) {
        notificacoes.push({
          user_id: data.criado_por_id,
          tipo: 'tarefa_concluida',
          titulo: `✅ Tarefa concluída: ${data.titulo}`,
          mensagem: `${data.cliente_nome ? `[${data.cliente_nome}] ` : ''}${data.titulo} foi concluída`,
          tarefa_id: tarefaId,
          link: `/backlog/${tarefaId}`
        });

        await base44.asServiceRole.entities.TarefaBacklog.update(tarefaId, {
          notificacao_conclusao_enviada: true
        });
      }
    }

    // Persiste todas as notificações
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
            link: notif.link
          }
        });
      } catch (e) {
        console.error('Erro ao criar notificação:', e.message);
      }
    }

    return Response.json({ ok: true, notificacoes: notificacoes.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});