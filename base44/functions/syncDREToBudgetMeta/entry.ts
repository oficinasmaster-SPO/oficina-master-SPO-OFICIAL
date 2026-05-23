import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Automação Entity: Quando um DRELancamento é criado/atualizado,
 * sincroniza com BudgetMeta (controle orçamentário)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Automação entity não tem usuário logado — usar asServiceRole diretamente
    const payload = await req.json();
    const { event, data } = payload;

    const dre = data;
    if (!dre || !dre.id || !dre.workshop_id) {
      return Response.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    const workshopId = dre.workshop_id;
    const mes = dre.mes; // YYYY-MM
    const categoria = dre.categoria;
    const tipo = dre.tipo; // receita ou despesa

    // Buscar todos os DRELancamentos do mesmo workshop/mes/categoria
    // para calcular o realizado_total correto (recalculo completo, não acumulação)
    const lancamentos = await base44.asServiceRole.entities.DRELancamento.filter({
      workshop_id: workshopId,
      mes: mes,
      categoria: categoria
    });

    const realizadoTotal = lancamentos.reduce((sum, l) => sum + (l.valor || 0), 0);

    // Buscar BudgetMeta correspondente por workshop + mes + categoria
    const budgetMetas = await base44.asServiceRole.entities.BudgetMeta.filter({
      workshop_id: workshopId,
      mes: mes,
      categoria: categoria
    });

    if (budgetMetas && budgetMetas.length > 0) {
      // Atualizar com valor recalculado (não acumulado — evita duplicação)
      const meta = budgetMetas[0];
      await base44.asServiceRole.entities.BudgetMeta.update(meta.id, {
        realizado_total: realizadoTotal
      });

      return Response.json({
        status: 'success',
        message: 'BudgetMeta atualizada',
        metaId: meta.id,
        realizado_total: realizadoTotal
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
        realizado_total: realizadoTotal,
        controlar_orcamento: true
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