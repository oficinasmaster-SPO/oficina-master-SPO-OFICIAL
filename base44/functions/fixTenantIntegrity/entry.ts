import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Correção assistida de integridade de tenant — admin only.
// NUNCA decide sozinha: executa somente as ações aprovadas enviadas no payload.
// Formato: { actions: [{ action, entity, id, value }] }
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });

    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const actions = Array.isArray(body?.actions) ? body.actions : [];

    if (actions.length === 0) {
      return Response.json({ message: 'Nenhuma ação enviada. Nada foi executado.', executadas: 0, resultados: [] });
    }

    // Ações permitidas: entidade alvo fixa (null = usa entity do payload) e campos que altera
    const ACTION_SPECS = {
      deactivate_employee: { entity: 'Employee', fields: () => ({ status: 'inativo', user_status: 'inativo' }) },
      relink_employee_user: { entity: 'Employee', fields: (v) => ({ user_id: v }), requiresValue: true },
      set_user_workshop: { entity: 'User', fields: (v) => ({ workshop_id: v }), requiresValue: true },
      set_employee_workshop: { entity: 'Employee', fields: (v) => ({ workshop_id: v }), requiresValue: true },
      set_employee_profile: { entity: 'Employee', fields: (v) => ({ profile_id: v }), requiresValue: true },
      orphan_record_tag: { entity: null, fields: () => ({ integridade_pendente: true }) }
    };

    const resultados = [];

    for (const item of actions) {
      const { action, entity, id, value } = item || {};
      const spec = ACTION_SPECS[action];
      const targetEntity = spec ? (spec.entity || entity) : null;

      const resultado = { action, entity: targetEntity, id, status: 'success', before: null, after: null, erro: null };

      try {
        if (!spec) throw new Error(`Ação desconhecida: ${action}`);
        if (!id) throw new Error('Campo "id" é obrigatório');
        if (!targetEntity) throw new Error('Campo "entity" é obrigatório para orphan_record_tag');
        if (spec.requiresValue && !value) throw new Error(`Ação ${action} exige o campo "value"`);

        const changes = spec.fields(value);

        // Snapshot ANTES (apenas dos campos alterados)
        const registro = await sr.entities[targetEntity].get(id);
        if (!registro) throw new Error(`Registro ${id} não encontrado em ${targetEntity}`);
        const before = {};
        for (const campo of Object.keys(changes)) {
          before[campo] = registro[campo] ?? null;
        }

        // Aplica a mudança. orphan_record_tag usa updateMany ($set) para
        // aceitar o campo integridade_pendente em qualquer entidade sem validação de schema.
        if (action === 'orphan_record_tag') {
          await sr.entities[targetEntity].updateMany({ id }, { $set: changes });
        } else {
          await sr.entities[targetEntity].update(id, changes);
        }

        resultado.before = before;
        resultado.after = changes;

        await sr.entities.AuditLog.create({
          origem: 'fixTenantIntegrity',
          action,
          entity: targetEntity,
          record_id: id,
          before,
          after: changes,
          executed_by: user.email,
          executed_by_id: user.id,
          executed_at: new Date().toISOString(),
          status: 'success'
        });
      } catch (error) {
        resultado.status = 'error';
        resultado.erro = error.message;

        try {
          await sr.entities.AuditLog.create({
            origem: 'fixTenantIntegrity',
            action: action || 'desconhecida',
            entity: targetEntity || 'desconhecida',
            record_id: id || 'desconhecido',
            executed_by: user.email,
            executed_by_id: user.id,
            executed_at: new Date().toISOString(),
            status: 'error',
            error_message: error.message
          });
        } catch (_) { /* falha ao logar não interrompe o lote */ }
      }

      resultados.push(resultado);
    }

    return Response.json({
      executado_em: new Date().toISOString(),
      executado_por: user.email,
      total_acoes: actions.length,
      sucessos: resultados.filter((r) => r.status === 'success').length,
      erros: resultados.filter((r) => r.status === 'error').length,
      resultados
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});