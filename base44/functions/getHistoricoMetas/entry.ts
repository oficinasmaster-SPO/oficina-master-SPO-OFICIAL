import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Busca histórico completo de alterações de uma meta
 * Retorna todas as versões com detalhes de auditoria
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { meta_id, workshop_id, mes } = await req.json();

    if (!meta_id || !workshop_id) {
      return Response.json({ 
        error: 'Parâmetros obrigatórios: meta_id, workshop_id' 
      }, { status: 400 });
    }

    // Buscar histórico ordenado por versão (mais recente primeiro)
    const historico = await base44.entities.BudgetMetaHistory.filter({
      meta_id,
      workshop_id,
      ...(mes && { mes })
    }, '-version');

    // Formatrar dados para exibição
    const historicoFormatado = historico.map(h => ({
      version: h.version,
      changed_at: h.changed_at,
      changed_by_nome: h.changed_by_nome,
      changed_by_email: h.changed_by_email,
      field_changed: h.field_changed,
      old_value: h.old_value,
      new_value: h.new_value,
      reason: h.reason,
      is_locked_change: h.is_locked_change,
      snapshot: h.snapshot,
      ip_address: h.ip_address,
      formatted_date: new Date(h.changed_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }));

    return Response.json({
      meta_id,
      workshop_id,
      total_versoes: historicoFormatado.length,
      historico: historicoFormatado
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});