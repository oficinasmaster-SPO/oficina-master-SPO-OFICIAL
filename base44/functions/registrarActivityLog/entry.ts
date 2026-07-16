/**
 * registrarActivityLog — Função reutilizável para registrar eventos no ActivityLog.
 *
 * Qualquer módulo pode invocar esta função para logar um evento automático
 * (status alterado, checklist concluído, atribuição, etc.) sem duplicar lógica.
 *
 * O actor (usuário que disparou o evento) é extraído automaticamente do token
 * de autenticação — não precisa ser passado pelo caller.
 *
 * Payload:
 *   entity_type:     "tarefa_backlog" | "pedido_interno"
 *   entity_id:       string
 *   event_type:      "created" | "status_changed" | "assigned" | "priority_changed"
 *                   | "deadline_changed" | "title_changed" | "description_updated"
 *                   | "response_added" | "completed" | "blocked" | "reopened"
 *                   | "field_changed"
 *   summary:         string (descrição legível do evento)
 *   workshop_id:     string (opcional, mas recomendado para RLS)
 *   entity_title:    string (opcional, cache do título para exibição)
 *   field_changed:   string (opcional, nome do campo alterado)
 *   old_value:       string (opcional, valor anterior)
 *   new_value:       string (opcional, novo valor)
 *   metadata:        object (opcional, payload livre para contexto extra)
 *
 * Uso no frontend:
 *   await base44.functions.invoke('registrarActivityLog', {
 *     entity_type: 'tarefa_backlog',
 *     entity_id: taskId,
 *     workshop_id: workshopId,
 *     event_type: 'field_changed',
 *     summary: 'Checklist: item "X" concluído',
 *     field_changed: 'checklist_item',
 *     new_value: 'concluido',
 *   });
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    const {
      entity_type,
      entity_id,
      event_type,
      summary,
      workshop_id,
      entity_title,
      field_changed,
      old_value,
      new_value,
      metadata,
    } = body;

    // Validação mínima
    if (!entity_type || !entity_id || !event_type) {
      return Response.json(
        { error: 'entity_type, entity_id e event_type são obrigatórios' },
        { status: 400 }
      );
    }

    const log = await base44.entities.ActivityLog.create({
      entity_type,
      entity_id,
      workshop_id: workshop_id || null,
      entity_title: entity_title || null,
      event_type,
      actor_id: user.id,
      actor_name: user.full_name || user.email,
      field_changed: field_changed || null,
      old_value: old_value != null ? String(old_value) : null,
      new_value: new_value != null ? String(new_value) : null,
      summary: summary || event_type,
      metadata: metadata || null,
      timestamp: new Date().toISOString(),
    });

    return Response.json({ ok: true, log_id: log.id });
  } catch (error) {
    console.error('Erro em registrarActivityLog:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});