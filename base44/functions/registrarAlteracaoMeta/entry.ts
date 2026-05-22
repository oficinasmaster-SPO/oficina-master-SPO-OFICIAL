import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Registra alteração em BudgetMeta com auditoria completa
 * Cria automaticamente um registro em BudgetMetaHistory
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      meta_id, 
      workshop_id, 
      mes, 
      field_changed, 
      old_value, 
      new_value, 
      reason,
      snapshot 
    } = await req.json();

    if (!meta_id || !workshop_id || !mes || !field_changed) {
      return Response.json({ 
        error: 'Parâmetros obrigatórios: meta_id, workshop_id, mes, field_changed, old_value, new_value' 
      }, { status: 400 });
    }

    // Verificar se o mês está fechado
    const metasFechamento = await base44.entities.BudgetMeta.filter({
      workshop_id,
      mes
    });

    const isLocked = metasFechamento.some(m => m.controlar_orcamento === false);
    
    // Se mês fechado, exigir justificativa
    if (isLocked && !reason) {
      return Response.json({ 
        error: 'Mês já fechado. É necessário fornecer justificativa para alterações.',
        is_locked: true
      }, { status: 403 });
    }

    // Calcular próxima versão
    const historicoExistente = await base44.entities.BudgetMetaHistory.filter({
      meta_id,
      workshop_id,
      mes
    }, '-version', 1);

    const proximaVersao = historicoExistente.length > 0 
      ? historicoExistente[0].version + 1 
      : 1;

    // Criar registro de auditoria
    const auditoria = {
      meta_id,
      workshop_id,
      mes,
      version: proximaVersao,
      changed_by: user.id,
      changed_by_nome: user.full_name,
      changed_by_email: user.email,
      changed_at: new Date().toISOString(),
      field_changed,
      old_value: String(old_value),
      new_value: String(new_value),
      reason: reason || null,
      is_locked_change: isLocked,
      snapshot: snapshot || null,
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown'
    };

    await base44.entities.BudgetMetaHistory.create(auditoria);

    return Response.json({
      success: true,
      version: proximaVersao,
      is_locked_change: isLocked,
      auditoria_id: auditoria.id
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});