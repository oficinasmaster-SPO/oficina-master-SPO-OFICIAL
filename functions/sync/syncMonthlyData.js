import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Sincroniza dados entre Histórico Diário → Metas Mensais → DRE
 * Consolida registros diários e atualiza metas mensais com values realizados
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workshop_id, month } = await req.json();
    
    if (!workshop_id || !month) {
      return Response.json(
        { error: 'workshop_id e month são obrigatórios' },
        { status: 400 }
      );
    }

    // 1. Buscar todos os registros diários do mês
    const monthStart = `${month}-01`;
    const monthLogs = await base44.entities.MonthlyGoalHistory.filter({
      workshop_id,
      month
    });

    // 2. Consolidar valores (somar)
    const consolidated = {
      revenue_parts: 0,
      revenue_services: 0,
      revenue_total: 0,
      customer_volume: 0,
      average_ticket: 0,
      pave_commercial: 0,
      kit_master: 0,
      sales_base: 0,
      sales_marketing: 0,
      clients_delivered: 0,
      marketing_leads_generated: 0,
      marketing_leads_sold: 0,
      marketing_invested: 0,
      count.length
    };

    monthLogs.forEach(log => {
      consolidated.revenue_parts += log.revenue_parts || 0;
      consolidated.revenue_services += log.revenue_services || 0;
      consolidated.revenue_total += log.revenue_total || 0;
      consolidated.customer_volume += log.customer_volume || 0;
      consolidated.pave_commercial += log.pave_commercial || 0;
      consolidated.kit_master += log.kit_master || 0;
      consolidated.sales_base += log.sales_base || 0;
      consolidated.sales_marketing += log.sales_marketing || 0;
      consolidated.clients_delivered += log.clients_delivered || 0;
      
      if (log.marketing_data) {
        consolidated.marketing_leads_generated += log.marketing_data.leads_generated || 0;
        consolidated.marketing_leads_sold += log.marketing_data.leads_sold || 0;
        consolidated.marketing_invested += log.marketing_data.invested_value || 0;
      }
    });

    // Recalcular ticket médio
    if (consolidated.customer_volume > 0) {
      consolidated.average_ticket = consolidated.revenue_total / consolidated.customer_volume;
    }

    // 3. Atualizar workshop.monthly_goals
    const workshop = await base44.entities.Workshop.get(workshop_id);
    const updatedMonthlyGoals = {
      ...workshop.monthly_goals,
      month,
      actual_revenue_achieved.revenue_total,
      revenue_parts.revenue_parts,
      revenue_services.revenue_services,
      customer_volume.customer_volume,
      average_ticket.average_ticket,
      sales_base.sales_base,
      sales_marketing.sales_marketing,
      pave_commercial.pave_commercial,
      kit_master.kit_master,
      clients_delivered.clients_delivered,
      marketing: {
        leads_generated.marketing_leads_generated,
        leads_sold.marketing_leads_sold,
        invested_value.marketing_invested
      }
    };

    await base44.entities.Workshop.update(workshop_id, {
      monthly_goals
    });

    // 4. Buscar/atualizar DRE do mês
    const dreList = await base44.entities.DREMonthly.filter({
      workshop_id,
      month
    });

    let dre = dreList && dreList.length > 0 ? dreList[0] ;

    // Verificar discrepâncias
    const discrepancies = [];
    
    if (dre) {
      const drePartsRevenue = dre.revenue?.parts_applied || 0;
      const dreServicesRevenue = dre.revenue?.services || 0;
      const tolerance = 0.05; // 5%

      const partsDiff = Math.abs(consolidated.revenue_parts - drePartsRevenue) / (drePartsRevenue || 1);
      const servicesDiff = Math.abs(consolidated.revenue_services - dreServicesRevenue) / (dreServicesRevenue || 1);

      if (partsDiff > tolerance) {
        discrepancies.push({
          field: 'revenue_parts',
          metas.revenue_parts,
          dre,
          diff_percent: (partsDiff * 100).toFixed(2)
        });
      }

      if (servicesDiff > tolerance) {
        discrepancies.push({
          field: 'revenue_services',
          metas.revenue_services,
          dre,
          diff_percent: (servicesDiff * 100).toFixed(2)
        });
      }
    }

    return Response.json({
      success,
      month,
      consolidated,
      dre_id?.id,
      discrepancies.length > 0 ? discrepancies ,
      logs_count.length,
      message.length > 0 
        ? 'Sincronização realizada com inconsistências detectadas'
        : 'Sincronização realizada com sucesso'
    });

  } catch (error) {
    console.error('Erro na sincronização:', error);
    return Response.json(
      { error.message },
      { status: 500 }
    );
  }
});
