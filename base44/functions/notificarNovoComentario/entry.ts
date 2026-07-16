import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { entity_type, entity_id, author_id, author_name, content } = await req.json();

    if (!entity_type || !entity_id || !author_id) {
      return Response.json({ error: 'entity_type, entity_id e author_id são obrigatórios' }, { status: 400 });
    }

    let participants = [];
    let entityTitle = '';
    let link = '';

    if (entity_type === 'tarefa_backlog') {
      const results = await base44.asServiceRole.entities.TarefaBacklog.filter({ id: entity_id });
      const tarefa = Array.isArray(results) && results.length > 0 ? results[0] : null;
      if (tarefa) {
        entityTitle = tarefa.titulo || 'Tarefa';
        link = `/backlog/${entity_id}`;
        const ids = [tarefa.assignee_id, tarefa.created_by_id, tarefa.requester_id, tarefa.assigned_to_id];
        participants = [...new Set(ids.filter(id => id && id !== author_id))];
      }
    } else if (entity_type === 'pedido_interno') {
      const results = await base44.asServiceRole.entities.PedidoInterno.filter({ id: entity_id });
      const pedido = Array.isArray(results) && results.length > 0 ? results[0] : null;
      if (pedido) {
        entityTitle = pedido.titulo || 'Pedido Interno';
        link = `/pedidos/${entity_id}`;
        const ids = [pedido.assignee_id, pedido.requester_id];
        participants = [...new Set(ids.filter(id => id && id !== author_id))];
      }
    }

    if (participants.length === 0) {
      return Response.json({ ok: true, notificacoes: 0, reason: 'no_participants' });
    }

    const contentPreview = (content || '').substring(0, 120);
    const hasEllipsis = content && content.length > 120;
    let notifCount = 0;

    for (const participantId of participants) {
      try {
        await base44.asServiceRole.entities.Notification.create({
          user_id: participantId,
          type: 'novo_comentario',
          title: `💬 Novo comentário: ${entityTitle}`,
          message: `${author_name || 'Usuário'}: ${contentPreview}${hasEllipsis ? '...' : ''}`,
          is_read: false,
          email_sent: false,
          metadata: {
            entity_type,
            entity_id,
            link
          }
        });
        notifCount++;
      } catch (e) {
        console.error('Erro ao criar notificação:', e.message);
      }
    }

    return Response.json({ ok: true, notificacoes: notifCount });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});