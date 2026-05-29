/**
 * onPedidoInternoCreated — Entity Automation handler
 *
 * Disparado quando um PedidoInterno é criado.
 * Cria automaticamente um FollowUpReminder com origin_type='pedido_interno'.
 * Garante idempotência.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { event, data } = body;

    if (event?.type !== 'create') {
      return Response.json({ skipped: true, reason: 'Não é evento de criação' });
    }

    const pedido = data;
    if (!pedido?.id || !pedido?.cliente_id) {
      return Response.json({ skipped: true, reason: 'Pedido sem id ou cliente_id' });
    }

    // Idempotência
    const existentes = await base44.asServiceRole.entities.FollowUpReminder.filter({
      origem_pedido_id: pedido.id,
      is_completed: false,
    });

    if (existentes && existentes.length > 0) {
      return Response.json({ created: false, message: 'FU já existe para este pedido' });
    }

    // Prazo baseado no prazo do pedido ou +3 dias
    let prazoStr;
    if (pedido.prazo) {
      prazoStr = pedido.prazo;
    } else {
      const prazo = new Date();
      prazo.setDate(prazo.getDate() + 3);
      prazoStr = prazo.toISOString().split('T')[0];
    }

    const fuData = {
      workshop_id: pedido.cliente_id,
      workshop_name: pedido.cliente_nome || null,
      consultor_id: pedido.responsavel_id,
      consultor_nome: pedido.responsavel_nome || null,
      reminder_date: prazoStr,
      sequence_number: 1,
      origin_type: 'pedido_interno',
      origem_pedido_id: pedido.id,
      origem_ata_id: null,
      origem_ata_titulo: null,
      origem_descricao: pedido.titulo || null,
      origem_status: pedido.status || 'pendente',
      origem_responsavel_id: pedido.responsavel_id || null,
      origem_responsavel_nome: pedido.responsavel_nome || null,
      origem_solicitante_nome: pedido.solicitante_nome || null,
      is_completed: false,
      notes: `Follow-up de pedido interno: ${pedido.titulo || ''}`,
    };

    const novoFU = await base44.asServiceRole.entities.FollowUpReminder.create(fuData);

    return Response.json({ created: true, followUp: novoFU });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});