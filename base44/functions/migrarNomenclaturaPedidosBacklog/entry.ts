import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const results = { tarefa_backlog: null, pedido_interno: null };

    // TarefaBacklog: renomear campos legados
    try {
      const tbResult = await base44.asServiceRole.entities.TarefaBacklog.updateMany({}, {
        $rename: {
          "cliente_id": "workshop_id",
          "cliente_nome": "workshop_nome",
          "consultor_id": "assignee_id",
          "consultor_nome": "assignee_name",
          "criado_por_id": "created_by_id",
          "solicitante_id": "requester_id",
          "atribuido_para_id": "assigned_to_id",
          "origem": "origin_type",
          "origem_id": "origin_id",
          "origem_titulo": "origin_title",
          "origem_data": "origin_date"
        }
      });
      results.tarefa_backlog = tbResult;
    } catch (err) {
      results.tarefa_backlog = { error: err.message };
    }

    // PedidoInterno: renomear campos legados
    try {
      const piResult = await base44.asServiceRole.entities.PedidoInterno.updateMany({}, {
        $rename: {
          "solicitante_id": "requester_id",
          "solicitante_nome": "requester_name",
          "responsavel_id": "assignee_id",
          "responsavel_nome": "assignee_name",
          "cliente_id": "workshop_id",
          "cliente_nome": "workshop_nome"
        }
      });
      results.pedido_interno = piResult;
    } catch (err) {
      results.pedido_interno = { error: err.message };
    }

    return Response.json({
      status: 'success',
      migrated: results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});