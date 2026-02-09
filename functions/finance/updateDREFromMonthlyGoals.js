import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Consolida registros diários → atualiza valores no DRE
 * Soma revenue_parts e revenue_services de todos os registros do mês
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

    // 1. Buscar todos os registros diários do mês (workshop geral)
    const monthlyGoalHistory = await base44.entities.MonthlyGoalHistory.filter({
      workshop_id,
      month,
      entity_type: 'workshop' // Apenas oficina geral
    });

    // 2. Consolidar (somar) valores de peças e serviços
    let totalPartsApplied = 0;
    let totalServices = 0;

    monthlyGoalHistory.forEach(log => {
      totalPartsApplied += log.revenue_parts || 0;
      totalServices += log.revenue_services || 0;
    });

    // 3. Buscar ou criar DRE do mês
    const dreList = await base44.entities.DREMonthly.filter({
      workshop_id,
      month
    });

    let dre = dreList && dreList.length > 0 ? dreList[0] ;

    const updatedRevenue = {
      parts_applied,
      services,
      other?.revenue?.other || 0
    };

    if (dre) {
      // Atualizar DRE existente
      await base44.entities.DREMonthly.update(dre.id, {
        revenue
      });
    } else {
      // Criar novo DRE se não existir
      await base44.entities.DREMonthly.create({
        workshop_id,
        month,
        productive_technicians: 1,
        monthly_hours: 219,
        revenue,
        costs_tcmp2: {
          operational: 0,
          people: 0,
          prolabore: 0,
          marketing: 0,
          maintenance: 0,
          third_party: 0,
          administrative: 0
        },
        costs_not_tcmp2: {
          financing: 0,
          consortium: 0,
          equipment_installments: 0,
          parts_invoices: 0,
          legal_processes: 0,
          land_purchase: 0,
          investments: 0
        },
        parts_cost: {
          parts_applied_cost: 0,
          parts_stock_purchase: 0
        },
        notes: 'Criado automaticamente a partir do Histórico de Produção'
      });
    }

    return Response.json({
      success,
      message: 'DRE atualizado com valores consolidados',
      consolidated: {
        parts_applied,
        services,
        logs_count.length
      }
    });

  } catch (error) {
    console.error('Erro ao atualizar DRE:', error);
    return Response.json(
      { error.message },
      { status: 500 }
    );
  }
});
