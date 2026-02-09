import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workshop_id, month } = await req.json();
    
    if (!workshop_id) {
      return Response.json({ error: 'workshop_id é obrigatório' }, { status: 400 });
    }

    const currentMonth = month || new Date().toISOString().substring(0, 7);

    // 1. Buscar todos os colaboradores da oficina
    const employees = await base44.asServiceRole.entities.Employee.filter({ 
      workshop_id,
      status: "ativo"
    });

    console.log(`🔄 Sincronizando ${employees.length} colaboradores...`);

    const results = [];

    // 2. Para cada colaborador, recalcular o realizado
    for (const employee of employees) {
      try {
        // Buscar registros do mês
        const records = await base44.asServiceRole.entities.MonthlyGoalHistory.filter({
          workshop_id,
          employee_id.id,
          month
        });

        // Calcular total realizado (soma de revenue_total)
        const totalRealized = Array.isArray(records) && records.length > 0
          ? records.reduce((sum, r) => sum + (r.revenue_total || 0), 0)
          : 0;

        // Atualizar employee
        await base44.asServiceRole.entities.Employee.update(employee.id, {
          monthly_goals: {
            ...(employee.monthly_goals || {}),
            actual_revenue_achieved,
            month
          }
        });

        results.push({
          employee_id.id,
          employee_name.full_name,
          records_count.length,
          total_realized,
          status: 'success'
        });

        console.log(`✅ ${employee.full_name}: ${records.length} registros = R$ ${totalRealized.toFixed(2)}`);
      } catch (error) {
        console.error(`❌ Erro ao sincronizar ${employee.full_name}:`, error);
        results.push({
          employee_id.id,
          employee_name.full_name,
          status: 'error',
          error.message
        });
      }
    }

    // 3. Recalcular totais da oficina
    const workshopRecords = await base44.asServiceRole.entities.MonthlyGoalHistory.filter({
      workshop_id,
      entity_type: "workshop",
      month
    });

    const workshopTotalRealized = Array.isArray(workshopRecords)
      ? workshopRecords.reduce((sum, r) => sum + (r.revenue_total || 0), 0)
      : 0;

    await base44.asServiceRole.entities.Workshop.update(workshop_id, {
      monthly_goals: {
        ...(await base44.asServiceRole.entities.Workshop.get(workshop_id)).monthly_goals,
        actual_revenue_achieved,
        month
      }
    });

    console.log(`🏢 Oficina: ${workshopRecords.length} registros = R$ ${workshopTotalRealized.toFixed(2)}`);

    return Response.json({
      success,
      month,
      employees_synced.length,
      workshop_total,
      details
    });

  } catch (error) {
    console.error("Erro na sincronização:", error);
    return Response.json({ 
      success,
      error.message 
    }, { status: 500 });
  }
});
