import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Automação Entity: Quando um DRELancamento é criado/atualizado,
 * sincroniza com BudgetMeta (controle orçamentário)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { event, data } = payload;

    const dre = data;
    if (!dre || !dre.id || !dre.workshop_id) {
      return Response.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    const workshopId = dre.workshop_id;
    const mes = dre.mes; // YYYY-MM
    const categoria = dre.categoria;
    const valor = dre.valor;
    const tipo = dre.tipo; // receita ou despesa

    // Buscar BudgetMeta correspondente
    const budgetMeta = await base44.asServiceRole.entities.BudgetMeta.filter({
      workshop_id: workshopId,
      mes: mes,
      categoria: categoria
    });

    if (budgetMeta && budgetMeta.length > 0) {
      // Atualizar meta existente
      const meta = budgetMeta[0];
      const metaAtualizada = {
        ...meta,
        realizado_total: (meta.realizado_total || 0) + valor
      };
      
      await base44.asServiceRole.entities.BudgetMeta.update(meta.id, metaAtualizada);
      
      return Response.json({
        status: 'success',
        message: 'BudgetMeta atualizada',
        metaId: meta.id,
        realizado_total: metaAtualizada.realizado_total
      });
    } else {
      // Criar nova BudgetMeta se não existir
      const novaMeta = await base44.asServiceRole.entities.BudgetMeta.create({
        workshop_id: workshopId,
        mes: mes,
        item: dre.descricao || categoria,
        categoria: categoria,
        tipo: tipo,
        meta_fixa_rs: 0,
        meta_percentual: 0,
        realizado_total: valor,
        controla_orcamento: true
      });

      return Response.json({
        status: 'success',
        message: 'BudgetMeta criada',
        metaId: novaMeta.id
      });
    }

  } catch (error) {
    console.error('Error in syncDREToBudgetMeta:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});