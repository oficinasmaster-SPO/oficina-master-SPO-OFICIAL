import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// This function consolidates daily productivity logs into a monthly summary.
// It reads all `DailyProductivityLog` entries for a given workshop and month,
// aggregates the values, and updates both the `MonthlyGoalHistory` and the
// `Workshop`'s `monthly_goals` with the calculated totals.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { workshop_id, month } = await req.json(); // Expects YYYY-MM format for month

    if (!workshop_id || !month) {
      return new Response(JSON.stringify({ error: 'workshop_id and month are required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 1. Fetch all daily logs for the workshop
    // We filter by month client-side as direct string prefix queries may not be supported.
    const allLogs = await base44.entities.DailyProductivityLog.filter({ workshop_id });
    const monthLogs = allLogs.filter(log => log.date.startsWith(month));

    if (monthLogs.length === 0) {
        return new Response(JSON.stringify({ message: 'No daily records found for the specified month.' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
    }

    // 2. Aggregate the data from the logs
    const consolidated = {
      revenue_parts: 0,
      revenue_services: 0,
      customer_volume: 0,
      sales_base: 0,
      sales_marketing: 0,
      pave_commercial: 0,
      kit_master: 0,
      clients_scheduled_base: 0,
      clients_delivered_base: 0,
      clients_scheduled_mkt: 0,
      clients_delivered_mkt: 0,
      marketing_data: {
          leads_generated: 0,
          leads_scheduled: 0,
          leads_showed_up: 0,
          leads_sold: 0,
          invested_value: 0,
          revenue_from_traffic: 0,
      },
    };

    // This mapping connects the generic metric codes from daily logs
    // to the specific fields in the monthly goals objects.
    // NOTE: These codes are assumptions. They should match the 'code' field in your 'ProductivityMetric' entity.
    const metricToGoalFieldMapping = {
      'FAT_PECAS_DIA': 'revenue_parts',
      'FAT_SERV_DIA': 'revenue_services',
      'CLIENTES_DIA': 'customer_volume',
      'VENDAS_BASE_DIA': 'sales_base',
      'VENDAS_MKT_DIA': 'sales_marketing',
      'PAVE_DIA': 'pave_commercial',
      'KIT_MASTER_DIA': 'kit_master',
      'AGEN_BASE_DIA': 'clients_scheduled_base',
      'ENTREG_BASE_DIA': 'clients_delivered_base',
      'AGEN_MKT_DIA': 'clients_scheduled_mkt',
      'ENTREG_MKT_DIA': 'clients_delivered_mkt',
      'LEADS_GERADOS_DIA': 'leads_generated',
      'LEADS_AGEND_DIA': 'leads_scheduled',
      'LEADS_COMP_DIA': 'leads_showed_up',
      'LEADS_VEND_DIA': 'leads_sold',
      'MKT_INVEST_DIA': 'invested_value',
      'MKT_FAT_TRAFEGO_DIA': 'revenue_from_traffic',
    };

    for (const log of monthLogs) {
      for (const entry of log.entries) {
        const field = metricToGoalFieldMapping[entry.metric_code];
        const value = parseFloat(entry.value) || 0;
        
        if (field) {
            if (field.startsWith('leads_') || field.startsWith('invested_') || field.startsWith('revenue_from_')) {
                 consolidated.marketing_data[field] = (consolidated.marketing_data[field] || 0) + value;
            } else {
                 consolidated[field] = (consolidated[field] || 0) + value;
            }
        }
      }
    }
    
    const achieved_total = consolidated.revenue_parts + consolidated.revenue_services;
    const average_ticket = consolidated.customer_volume > 0 ? achieved_total / consolidated.customer_volume : 0;
    
    // 3. Find and update the Workshop's monthly_goals
    const workshop = await base44.entities.Workshop.get(workshop_id);
    if (!workshop) {
      return new Response(JSON.stringify({ error: 'Workshop not found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const updatedMonthlyGoals = {
      ...workshop.monthly_goals,
      actual_revenue_achieved: achieved_total,
      revenue_parts: consolidated.revenue_parts,
      revenue_services: consolidated.revenue_services,
      customer_volume: consolidated.customer_volume,
      average_ticket: average_ticket,
      sales_base: consolidated.sales_base,
      sales_marketing: consolidated.sales_marketing,
      pave_commercial: consolidated.pave_commercial,
      kit_master: consolidated.kit_master,
      clients_scheduled_base: consolidated.clients_scheduled_base,
      clients_delivered_base: consolidated.clients_delivered_base,
      clients_scheduled_mkt: consolidated.clients_scheduled_mkt,
      clients_delivered_mkt: consolidated.clients_delivered_mkt,
      marketing: {
          ...(workshop.monthly_goals?.marketing || {}),
          ...consolidated.marketing_data,
          // Recalculate cost per sale
          cost_per_sale: consolidated.marketing_data.leads_sold > 0 
              ? consolidated.marketing_data.invested_value / consolidated.marketing_data.leads_sold 
              : 0,
      }
    };

    await base44.entities.Workshop.update(workshop_id, {
      monthly_goals: updatedMonthlyGoals
    });

    // 4. Also update MonthlyGoalHistory for historical tracking (optional but good practice)
    const historyQuery = { workshop_id, month, entity_type: 'workshop' };
    const existingHistory = await base44.entities.MonthlyGoalHistory.filter(historyQuery);
    
    const historyData = {
        ...historyQuery,
        achieved_total,
        revenue_parts: consolidated.revenue_parts,
        revenue_services: consolidated.revenue_services,
        customer_volume: consolidated.customer_volume,
        sales_base: consolidated.sales_base,
        sales_marketing: consolidated.sales_marketing,
        // ... include other consolidated fields as needed in history
    };

    if (existingHistory.length > 0) {
        await base44.entities.MonthlyGoalHistory.update(existingHistory[0].id, historyData);
    } else {
        // We might want to also copy over the `projected_` values from workshop.monthly_goals
        // for a complete historical record.
        historyData.projected_total = workshop.monthly_goals?.projected_revenue || 0;
        await base44.entities.MonthlyGoalHistory.create(historyData);
    }


    return new Response(JSON.stringify({ success: true, message: 'Monthly goals consolidated successfully.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Consolidation Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});