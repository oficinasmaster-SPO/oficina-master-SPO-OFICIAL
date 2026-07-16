/**
 * converterPedidoEmTarefas — Entity Automation handler
 *
 * Disparado quando um PedidoInterno tem status alterado para "aprovado".
 * Cria automaticamente uma TarefaBacklog vinculada ao pedido de origem.
 * Garante idempotência: não cria tarefa duplicada para o mesmo pedido.
 *
 * Payload (entity automation):
 *   { event: { type, entity_name, entity_id }, data: {...pedido...}, old_data: {...} }
 *
 * Payload (invocação direta via functions.invoke):
 *   { pedido_id: "..." }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Extrair pedido_id de ambas as formas de invocação
    const pedidoId = body.pedido_id || body.event?.entity_id;
    if (!pedidoId) {
      return Response.json({ error: 'pedido_id ou event.entity_id obrigatório' }, { status: 400 });
    }

    // Buscar o pedido (usa data do payload se disponível, senão busca no banco)
    let pedido = body.data;
    if (!pedido || !pedido.id) {
      try {
        const pedidos = await base44.asServiceRole.entities.PedidoInterno.filter({ id: pedidoId });
        pedido = pedidos?.[0];
      } catch {
        return Response.json({ skipped: true, reason: 'Pedido não encontrado ou id inválido' });
      }
    }

    if (!pedido) {
      return Response.json({ skipped: true, reason: 'Pedido não encontrado' });
    }

    // Só converte se status for "aprovado"
    if (pedido.status !== 'aprovado') {
      return Response.json({ skipped: true, reason: `Status "${pedido.status}" não gera tarefas` });
    }

    // Idempotência: verifica se já existe tarefa para este pedido
    const existentes = await base44.asServiceRole.entities.TarefaBacklog.filter({
      origin_type: 'pedido',
      origin_id: pedido.id,
    });

    if (existentes && existentes.length > 0) {
      return Response.json({ created: false, message: 'Tarefa já existe para este pedido', tarefa_id: existentes[0].id });
    }

    // Calcular prazo (usar prazo do pedido ou +7 dias)
    let prazoStr;
    if (pedido.prazo) {
      prazoStr = pedido.prazo;
    } else {
      const prazo = new Date();
      prazo.setDate(prazo.getDate() + 7);
      prazoStr = prazo.toISOString().split('T')[0];
    }

    // Criar a TarefaBacklog vinculada ao pedido
    const tarefaData = {
      workshop_id: pedido.workshop_id,
      workshop_nome: pedido.workshop_nome || null,
      assignee_id: pedido.assignee_id,
      assignee_name: pedido.assignee_name || null,
      created_by_id: pedido.assignee_id || null, // quem aprovou
      requester_id: pedido.requester_id || null,
      assigned_to_id: pedido.assignee_id || null,
      data_criacao: new Date().toISOString(),
      titulo: pedido.titulo || 'Pedido interno',
      descricao: pedido.descricao || '',
      origin_type: 'pedido',
      origin_id: pedido.id,
      origin_title: pedido.titulo || null,
      origin_date: pedido.created_date || new Date().toISOString(),
      prazo: prazoStr,
      prioridade: pedido.prioridade || 'media',
      status: 'aberta',
      impacto: pedido.impacto_cliente === 'critico' ? 'multiplo' : (pedido.impacto_cliente === 'alto' ? 'entrega' : 'satisfacao'),
      tempo_estimado_horas: 2, // default — pode ser ajustado manualmente depois
    };

    const novaTarefa = await base44.asServiceRole.entities.TarefaBacklog.create(tarefaData);

    return Response.json({
      created: true,
      tarefa_id: novaTarefa.id,
      tarefa_titulo: novaTarefa.titulo,
      pedido_id: pedido.id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});