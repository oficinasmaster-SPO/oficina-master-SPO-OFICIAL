import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Bloqueia/desbloqueia edição de metas de um mês específico
 * Meses fechados não podem ser editados (exceto por admin com justificativa)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Apenas admin pode fechar/desfechar meses
    if (user.role !== 'admin') {
      return Response.json({ 
        error: 'Apenas administradores podem fechar meses' 
      }, { status: 403 });
    }

    const { workshop_id, mes, action, justificativa } = await req.json();

    if (!workshop_id || !mes || !action) {
      return Response.json({ 
        error: 'Parâmetros obrigatórios: workshop_id, mes, action' 
      }, { status: 400 });
    }

    // action: 'fechar' ou 'abrir'
    if (!['fechar', 'abrir'].includes(action)) {
      return Response.json({ 
        error: 'Ação deve ser "fechar" ou "abrir"' 
      }, { status: 400 });
    }

    // Buscar todas as metas do mês
    const metas = await base44.entities.BudgetMeta.filter({
      workshop_id,
      mes
    });

    if (metas.length === 0) {
      return Response.json({ 
        error: 'Nenhuma meta encontrada para este mês' 
      }, { status: 404 });
    }

    // Atualizar todas as metas
    const updateData = action === 'fechar' ? {
      controlar_orcamento: false,
      notas: `Mês fechado em ${new Date().toISOString()} por ${user.full_name}. ${justificativa || ''}`
    } : {
      controlar_orcamento: true,
      notas: `Mês reaberto em ${new Date().toISOString()} por ${user.full_name}. ${justificativa || ''}`
    };

    for (const meta of metas) {
      await base44.entities.BudgetMeta.update(meta.id, updateData);
      
      // Registrar auditoria do fechamento/abertura
      await base44.functions.invoke('registrarAlteracaoMeta', {
        meta_id: meta.id,
        workshop_id,
        mes,
        field_changed: 'controlar_orcamento',
        old_value: action === 'fechar' ? 'true' : 'false',
        new_value: action === 'fechar' ? 'false' : 'true',
        reason: justificativa || `${action === 'fechar' ? 'Fechamento' : 'Reabertura'} do mês ${mes}`,
        snapshot: { ...meta, ...updateData }
      });
    }

    return Response.json({
      success: true,
      action,
      mes,
      metas_afetadas: metas.length,
      mensagem: `Mês ${mes} ${action === 'fechar' ? 'fechado' : 'reaberto'} com sucesso`
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});