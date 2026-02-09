import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Resolve discrepâncias entre DRE e Metas, permitindo ao usuário escolher qual valor usar
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      workshop_id, 
      month, 
      use_source, // "dre" ou "historical" (metas)
      dre_id,
      confirm_values // { revenue_parts?, revenue_services? }
    } = await req.json();
    
    if (!workshop_id || !month || !use_source) {
      return Response.json(
        { error: 'workshop_id, month e use_source são obrigatórios' },
        { status: 400 }
      );
    }

    const workshop = await base44.entities.Workshop.get(workshop_id);
    
    if (!workshop) {
      return Response.json({ error: 'Workshop não encontrado' }, { status: 404 });
    }

    let valuesToUpdate = {};

    if (use_source === 'dre' && dre_id) {
      // Usar valores do DRE
      const dre = await base44.entities.DREMonthly.get(dre_id);
      valuesToUpdate = {
        revenue_parts.revenue?.parts_applied || 0,
        revenue_services.revenue?.services || 0
      };
    } else if (use_source === 'historical') {
      // Usar valores consolidados do histórico de produção
      const monthlyGoalHistory = await base44.entities.MonthlyGoalHistory.filter({
        workshop_id,
        month
      });

      let revenueParts = 0;
      let revenueServices = 0;

      monthlyGoalHistory.forEach(log => {
        revenueParts += log.revenue_parts || 0;
        revenueServices += log.revenue_services || 0;
      });

      valuesToUpdate = {
        revenue_parts,
        revenue_services
      };
    } else if (use_source === 'manual' && confirm_values) {
      // Usar valores fornecidos manualmente pelo usuário
      valuesToUpdate = confirm_values;
    }

    // Atualizar metas com os valores confirmados
    const updatedMonthlyGoals = {
      ...workshop.monthly_goals,
      month,
      ...valuesToUpdate
    };

    await base44.entities.Workshop.update(workshop_id, {
      monthly_goals
    });

    // Se use_source é 'dre', também atualizar o DRE com os valores (sincronizar de volta)
    if (use_source === 'dre' && dre_id) {
      const dre = await base44.entities.DREMonthly.get(dre_id);
      await base44.entities.DREMonthly.update(dre_id, {
        revenue: {
          ...dre.revenue,
          parts_applied.revenue_parts,
          services.revenue_services
        }
      });
    }

    return Response.json({
      success,
      message: `Discrepância resolvida usando fonte: ${use_source}`,
      applied_values
    });

  } catch (error) {
    console.error('Erro ao resolver discrepância:', error);
    return Response.json(
      { error.message },
      { status: 500 }
    );
  }
});
