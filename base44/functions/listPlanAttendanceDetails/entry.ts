import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Buscar todas as regras de atendimento com detalhes
    const planAttendanceRules = await base44.entities.PlanAttendanceRule.list('-created_date', 500);

    // Filtrar apenas PRATA e MILLIONS
    const targetPlans = ['PRATA', 'MILLIONS'];
    const filtered = planAttendanceRules.filter(r => targetPlans.includes(r.plan_id) && r.is_active);

    // Agrupar por plano e ordenar
    const byPlan = {};
    filtered.forEach(rule => {
      if (!byPlan[rule.plan_id]) {
        byPlan[rule.plan_id] = [];
      }
      byPlan[rule.plan_id].push({
        id: rule.id,
        attendance_type_id: rule.attendance_type_id,
        nome: rule.attendance_display_name,
        total_allowed: rule.total_allowed,
        scheduling_type: rule.scheduling_type,
        frequency_days: rule.frequency_days || null,
        allow_anticipation: rule.allow_anticipation,
        start_from_contract_date: rule.start_from_contract_date
      });
    });

    // Ordenar cada plano por nome
    Object.keys(byPlan).forEach(plan => {
      byPlan[plan].sort((a, b) => {
        const nameA = (a.nome || '').localeCompare(b.nome || '');
        return nameA;
      });
    });

    return Response.json({
      success: true,
      prata: {
        count: byPlan['PRATA']?.length || 0,
        attendances: byPlan['PRATA'] || []
      },
      millions: {
        count: byPlan['MILLIONS']?.length || 0,
        attendances: byPlan['MILLIONS'] || []
      }
    });

  } catch (error) {
    console.error('Erro ao listar atendimentos:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});