/**
 * onTarefaBacklogCreated — Entity Automation handler
 *
 * Disparado quando uma TarefaBacklog é criada.
 * Cria automaticamente um FollowUpReminder com origin_type='tarefa_backlog'.
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

    const tarefa = data;
    if (!tarefa?.id || !tarefa?.cliente_id) {
      return Response.json({ skipped: true, reason: 'Tarefa sem id ou cliente_id' });
    }

    // Idempotência: verificar se já existe FU aberto para esta tarefa
    const existentes = await base44.asServiceRole.entities.FollowUpReminder.filter({
      origem_tarefa_id: tarefa.id,
      is_completed: false,
    });

    if (existentes && existentes.length > 0) {
      return Response.json({ created: false, message: 'FU já existe para esta tarefa' });
    }

    // Calcular prazo baseado no prazo da tarefa ou +3 dias
    let prazoStr;
    if (tarefa.prazo) {
      prazoStr = tarefa.prazo;
    } else {
      const prazo = new Date();
      prazo.setDate(prazo.getDate() + 3);
      prazoStr = prazo.toISOString().split('T')[0];
    }

    const fuData = {
      workshop_id: tarefa.cliente_id,
      workshop_name: tarefa.cliente_nome || null,
      consultor_id: tarefa.consultor_id,
      consultor_nome: tarefa.consultor_nome || null,
      reminder_date: prazoStr,
      sequence_number: 1,
      origin_type: 'tarefa_backlog',
      origem_tarefa_id: tarefa.id,
      origem_ata_id: tarefa.origem_id || null,
      origem_ata_titulo: tarefa.origem_titulo || null,
      origem_descricao: tarefa.titulo || null,
      origem_status: tarefa.status || 'aberta',
      origem_responsavel_id: tarefa.atribuido_para_id || tarefa.consultor_id || null,
      origem_responsavel_nome: null,
      origem_solicitante_nome: null,
      is_completed: false,
      notes: `Follow-up de tarefa: ${tarefa.titulo || ''}`,
    };

    const novoFU = await base44.asServiceRole.entities.FollowUpReminder.create(fuData);

    return Response.json({ created: true, followUp: novoFU });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});