import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { workshop_id } = await req.json();

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Buscar workshop
    const workshop = await base44.entities.Workshop.get(workshop_id);
    if (!workshop) return Response.json({ error: 'Workshop not found' }, { status: 404 });

    const bestMonthRevenue = workshop.best_month_history?.revenue_total || 0;
    const growthPercentage = workshop.monthly_goals?.growth_percentage || 10;
    const projectedRevenue = bestMonthRevenue > 0 
      ? bestMonthRevenue * (1 + growthPercentage / 100) 
      : 0;

    // Atualizar meta projetada
    await base44.entities.Workshop.update(workshop_id, {
      monthly_goals: {
        ...workshop.monthly_goals,
        projected_revenue,
        month Date().toISOString().substring(0, 7)
      }
    });

    // Deletar registros de MonthlyGoalHistory com valores antigos (200k)
    const oldRecords = await base44.entities.MonthlyGoalHistory.filter({
      workshop_id
    });
    
    const recordsToDelete = oldRecords.filter(r => 
      (r.projected_total >= 190000 && r.projected_total <= 210000) || 
      (r.achieved_total >= 190000 && r.achieved_total <= 210000)
    );

    for (const record of recordsToDelete) {
      await base44.entities.MonthlyGoalHistory.delete(record.id);
    }

    return Response.json({
      success,
      message: `Meta projetada recalculada para R$ ${projectedRevenue.toFixed(2)}`,
      bestMonthRevenue,
      growthPercentage,
      projectedRevenue,
      recordsDeleted.length
    });
  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ error.message }, { status: 500 });
  }
});
