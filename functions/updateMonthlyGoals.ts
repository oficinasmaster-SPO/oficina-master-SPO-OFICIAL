import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workshop_id, best_month_revenue, growth_percentage } = await req.json();

    // Buscar workshop
    const workshop = await base44.entities.Workshop.get(workshop_id);
    if (!workshop) {
      return Response.json({ error: 'Workshop não encontrado' }, { status: 404 });
    }

    // Calcular nova meta projetada
    const projectedRevenue = best_month_revenue * (1 + growth_percentage / 100);

    // Atualizar metas mensais
    const updatedMonthlyGoals = {
      ...workshop.monthly_goals,
      growth_percentage: growth_percentage,
      projected_revenue: projectedRevenue,
      actual_revenue_achieved: 0, // Reset dos 200 mil
      month: getCurrentMonth()
    };

    // Salvar
    await base44.entities.Workshop.update(workshop_id, {
      monthly_goals: updatedMonthlyGoals
    });

    return Response.json({
      success: true,
      message: 'Metas atualizadas com sucesso',
      data: {
        best_month_revenue,
        growth_percentage,
        projected_revenue: projectedRevenue,
        actual_revenue_achieved: 0
      }
    });
  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}