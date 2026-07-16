/**
 * logActivityEvent — Entity Automation handler
 *
 * Recebe eventos de create/update de TarefaBacklog e PedidoInterno
 * e cria registros unificados em ActivityLog.
 *
 * Payload recebido:
 *   { event: { type, entity_name, entity_id }, data, old_data, changed_fields }
 *
 * Para create: registra evento "created".
 * Para update: itera sobre changed_fields e registra um evento por campo relevante.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Campos monitorados e seus respectivos event_types
const FIELD_MAP = {
  status: 'status_changed',
  assignee_id: 'assigned',
  prioridade: 'priority_changed',
  prazo: 'deadline_changed',
  titulo: 'title_changed',
  descricao: 'description_updated',
  resposta: 'response_added',
};

// Labels legíveis para valores de enum
const STATUS_LABELS = {
  // TarefaBacklog
  aberta: 'Aberta',
  em_execucao: 'Em Execução',
  bloqueada: 'Bloqueada',
  concluida: 'Concluída',
  // PedidoInterno
  pendente: 'Pendente',
  em_analise: 'Em Análise',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
  concluido: 'Concluído',
};

const PRIORITY_LABELS = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  critica: 'Crítica',
};

function labelFor(field, value) {
  if (value == null || value === '') return '—';
  const str = String(value);
  if (field === 'status') return STATUS_LABELS[str] || str;
  if (field === 'prioridade') return PRIORITY_LABELS[str] || str;
  return str;
}

function buildSummary(eventType, field, oldValue, newValue) {
  switch (eventType) {
    case 'created':
      return 'Item criado';
    case 'status_changed':
      return `Status alterado de "${labelFor('status', oldValue)}" para "${labelFor('status', newValue)}"`;
    case 'assigned':
      return `Responsável atribuído`;
    case 'priority_changed':
      return `Prioridade alterada de "${labelFor('prioridade', oldValue)}" para "${labelFor('prioridade', newValue)}"`;
    case 'deadline_changed':
      return `Prazo alterado de "${oldValue || '—'}" para "${newValue || '—'}"`;
    case 'title_changed':
      return 'Título atualizado';
    case 'description_updated':
      return 'Descrição atualizada';
    case 'response_added':
      return 'Resposta adicionada';
    case 'completed':
      return 'Item concluído';
    case 'blocked':
      return 'Item bloqueado';
    case 'reopened':
      return 'Item reaberto';
    default:
      return `Campo "${field}" alterado`;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { event, data, old_data, changed_fields } = body;
    const eventType = event?.type;
    const entityName = event?.entity_name; // "TarefaBacklog" | "PedidoInterno"
    const entityId = event?.entity_id || data?.id;

    if (!entityId || !data) {
      return Response.json({ ok: true, skipped: 'no_entity_id_or_data' });
    }

    // Determinar entity_type para o ActivityLog
    const entityType = entityName === 'PedidoInterno' ? 'pedido_interno' : 'tarefa_backlog';

    const now = new Date().toISOString();
    const logs = [];

    // Extrair workshop_id (campo renomeado) com fallback
    const workshopId = data.workshop_id || data.cliente_id || null;
    const entityTitle = data.titulo || null;

    // Extrair actor (quem fez a ação)
    // Prioridade: created_by_id > assignee_id > solicitante_id > requester_id
    const actorId = data.created_by_id || data.assignee_id || data.requester_id || data.solicitante_id || null;
    const actorName = data.assignee_name || data.requester_name || data.responsavel_nome || data.solicitante_nome || null;

    if (eventType === 'create') {
      logs.push({
        entity_type: entityType,
        entity_id: entityId,
        workshop_id: workshopId,
        entity_title: entityTitle,
        event_type: 'created',
        actor_id: actorId,
        actor_name: actorName,
        field_changed: null,
        old_value: null,
        new_value: entityTitle || null,
        summary: 'Item criado',
        metadata: {
          status: data.status || null,
          prioridade: data.prioridade || null,
          origin_type: data.origin_type || data.origem || null,
        },
        timestamp: now,
      });
    } else if (eventType === 'update' && old_data) {
      const fields = Array.isArray(changed_fields) ? changed_fields : Object.keys(data).filter(k => k !== 'id' && old_data[k] !== data[k]);

      for (const field of fields) {
        // Ignorar campos de controle interno (flags de notificação, timestamps de debounce, etc)
        if (field.startsWith('notificacao_') || field.startsWith('ultima_notificacao') || field === 'updated_date' || field === 'created_date') {
          continue;
        }

        const mappedEventType = FIELD_MAP[field] || 'field_changed';
        const oldValue = old_data[field] != null ? String(old_data[field]) : null;
        const newValue = data[field] != null ? String(data[field]) : null;

        // Skip se valores são iguais (após stringify)
        if (oldValue === newValue) continue;

        // Determinar event_type especial para status
        let finalEventType = mappedEventType;
        if (field === 'status') {
          if (data[field] === 'concluida' || data[field] === 'concluido') {
            finalEventType = 'completed';
          } else if (data[field] === 'bloqueada') {
            finalEventType = 'blocked';
          } else if (old_data[field] === 'bloqueada' && data[field] !== 'bloqueada') {
            finalEventType = 'reopened';
          } else {
            finalEventType = 'status_changed';
          }
        }

        logs.push({
          entity_type: entityType,
          entity_id: entityId,
          workshop_id: workshopId,
          entity_title: entityTitle,
          event_type: finalEventType,
          actor_id: actorId,
          actor_name: actorName,
          field_changed: field,
          old_value: oldValue,
          new_value: newValue,
          summary: buildSummary(finalEventType, field, oldValue, newValue),
          metadata: null,
          timestamp: now,
        });
      }
    }

    if (logs.length === 0) {
      return Response.json({ ok: true, skipped: 'no_relevant_changes' });
    }

    // Inserir todos os logs de uma vez (bulkCreate para eficiência)
    await base44.asServiceRole.entities.ActivityLog.bulkCreate(logs);

    return Response.json({
      ok: true,
      entity_type: entityType,
      entity_id: entityId,
      logs_created: logs.length,
    });
  } catch (error) {
    console.error('Erro em logActivityEvent:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});