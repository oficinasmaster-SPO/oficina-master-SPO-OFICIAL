import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Sincroniza dados do DRE para Metas Mensais
 * Atualiza metas quando valores no DRE são alterados
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { dre_id, workshop_id, month } = await req.json();
    
    if (!dre_id || !workshop_id || !month) {
      return Response.json(
        { error: 'dre_id, workshop_id e month são obrigatórios' },
        { status: 400 }
      );
    }

    // 1. Buscar DRE
    const dre = await base44.entities.DREMonthly.get(dre_id);
    
    if (!dre) {
      return Response.json({ error: 'DRE não encontrado' }, { status: 404 });
    }

    // 2. Buscar Workshop
    const workshop = await base44.entities.Workshop.get(workshop_id);
    
    if (!workshop) {
      return Response.json({ error: 'Workshop não encontrado' }, { status: 404 });
    }

    // 3. Buscar registros diários do mês para comparação
    const monthlyGoalHistory = await base44.entities.MonthlyGoalHistory.filter({
      workshop_id,
      month
    });

    // Consolidar dados históricos
    let historicalRevenueParts = 0;
    let historicalRevenueServices = 0;

    monthlyGoalHistory.forEach(log => {
      historicalRevenueParts += log.revenue_parts || 0;
      historicalRevenueServices += log.revenue_services || 0;
    });

    // 4. Comparar e detectar discrepâncias
    const drePartsRevenue = dre.revenue?.parts_applied || 0;
    const dreServicesRevenue = dre.revenue?.services || 0;
    
    const discrepancies = [];
    const tolerance = 0.05; // 5%

    if (historicalRevenueParts > 0) {
      const diff = Math.abs(drePartsRevenue - historicalRevenueParts) / historicalRevenueParts;
      if (diff > tolerance) {
        discrepancies.push({
          field: 'revenue_parts',
          historical: historicalRevenueParts,
          dre: drePartsRevenue,
          diff_percent: (diff * 100).toFixed(2),
          need_confirmation: true
        });
      }
    }

    if (historicalRevenueServices > 0) {
      const diff = Math.abs(dreServicesRevenue - historicalRevenueServices) / historicalRevenueServices;
      if (diff > tolerance) {
        discrepancies.push({
          field: 'revenue_services',
          historical: historicalRevenueServices,
          dre: dreServicesRevenue,
          diff_percent: (diff * 100).toFixed(2),
          need_confirmation: true
        });
      }
    }

    // 5. Se há discrepâncias significativas, não atualizar automaticamente
    if (discrepancies.length > 0) {
      return Response.json({
        success: false,
        requires_confirmation: true,
        discrepancies,
        message: 'Existem inconsistências entre DRE e Histórico de Produção. Confirme qual valor utilizar.'
      });
    }

    // 6. Se sem discrepâncias, atualizar metas com valores do DRE
    const updatedMonthlyGoals = {
      ...workshop.monthly_goals,
      month,
      revenue_parts: drePartsRevenue,
      revenue_services: dreServicesRevenue
    };

    await base44.entities.Workshop.update(workshop_id, {
      monthly_goals: updatedMonthlyGoals
    });

    return Response.json({
      success: true,
      message: 'Metas atualizadas com valores do DRE',
      updated_values: {
        revenue_parts: drePartsRevenue,
        revenue_services: dreServicesRevenue
      }
    });

  } catch (error) {
    console.error('Erro na sincronização DRE→Metas:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});