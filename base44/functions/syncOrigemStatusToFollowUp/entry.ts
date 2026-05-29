/**
 * syncOrigemStatusToFollowUp — Entity Automation handler
 *
 * Disparado quando TarefaBacklog ou PedidoInterno é atualizado.
 * 
 * Comportamentos:
 * 1. Se status → concluida/concluido: fecha todos os FUs abertos desse item
 * 2. Para outros status: atualiza o cache origem_status nos FUs abertos
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { event, data, changed_fields } = body;

    if (event?.type !== 'update') {
      return Response.json({ skipped: true, reason: 'Não é evento de update' });
    }

    // Só processa se o status mudou
    if (!changed_fields?.includes('status')) {
      return Response.json({ skipped: true, reason: 'Status não mudou' });
    }

    const entityName = event?.entity_name;
    const isStatusFinal =
      data?.status === 'concluida' ||
      data?.status === 'concluido' ||
      data?.status === 'cancelado' ||
      data?.status === 'cancelada';

    // Determinar qual campo de origem e tipo
    let campoOrigem = null;
    if (entityName === 'TarefaBacklog') campoOrigem = 'origem_tarefa_id';
    else if (entityName === 'PedidoInterno') campoOrigem = 'origem_pedido_id';
    else return Response.json({ skipped: true, reason: `Entidade não suportada: ${entityName}` });

    // Buscar FUs abertos para este item
    const fuAbertos = await base44.asServiceRole.entities.FollowUpReminder.filter({
      [campoOrigem]: data.id,
      is_completed: false,
    });

    if (!fuAbertos || fuAbertos.length === 0) {
      return Response.json({ updated: 0, message: 'Nenhum FU aberto encontrado' });
    }

    let updatedCount = 0;

    if (isStatusFinal) {
      // Fechar todos os FUs abertos
      await Promise.all(fuAbertos.map(fu =>
        base44.asServiceRole.entities.FollowUpReminder.update(fu.id, {
          is_completed: true,
          completed_at: new Date().toISOString(),
          origem_status: data.status,
        })
      ));
      updatedCount = fuAbertos.length;
    } else {
      // Apenas atualizar cache do status
      await Promise.all(fuAbertos.map(fu =>
        base44.asServiceRole.entities.FollowUpReminder.update(fu.id, {
          origem_status: data.status,
        })
      ));
      updatedCount = fuAbertos.length;
    }

    return Response.json({
      updated: updatedCount,
      action: isStatusFinal ? 'closed' : 'status_synced',
      new_status: data.status,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});