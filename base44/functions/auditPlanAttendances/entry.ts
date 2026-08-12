import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const isScheduledRun = !user;

    // Scheduled automations run as service role (platform-privileged) — skip admin gate.
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Buscar todos os planos (padrão do sistema)
    const allPlans = ['FREE', 'START', 'BRONZE', 'PRATA', 'GOLD', 'IOM', 'MILLIONS'];

    // Buscar todas as regras de atendimento
    const planAttendanceRules = await base44.entities.PlanAttendanceRule.list('-created_date', 500);

    // Agrupar regras por plano
    const plansWithAttendances = {};
    planAttendanceRules.forEach(rule => {
      if (!plansWithAttendances[rule.plan_id]) {
        plansWithAttendances[rule.plan_id] = [];
      }
      plansWithAttendances[rule.plan_id].push({
        id: rule.id,
        attendance_type_id: rule.attendance_type_id,
        attendance_display_name: rule.attendance_display_name,
        total_allowed: rule.total_allowed,
        scheduling_type: rule.scheduling_type
      });
    });

    // Buscar workshops para contar clientes por plano
    const workshops = await base44.entities.Workshop.list('-created_date', 500);
    const workshopsByPlan = {};
    workshops.forEach(w => {
      if (w.planoAtual) {
        if (!workshopsByPlan[w.planoAtual]) {
          workshopsByPlan[w.planoAtual] = 0;
        }
        workshopsByPlan[w.planoAtual]++;
      }
    });

    // Montar relatório
    const auditReport = allPlans.map(planId => ({
      plan: planId,
      hasAttendances: !!plansWithAttendances[planId],
      attendanceCount: plansWithAttendances[planId]?.length || 0,
      attendances: plansWithAttendances[planId] || [],
      workshopsCount: workshopsByPlan[planId] || 0
    }));

    const summary = {
      totalPlans: allPlans.length,
      plansWithAttendances: auditReport.filter(p => p.hasAttendances).length,
      plansWithoutAttendances: auditReport.filter(p => !p.hasAttendances).length,
      details: auditReport
    };

    if (isScheduledRun) {
      try {
        await base44.entities.SystemEventLog.create({
          event_type: 'PLAN_ATTENDANCES_HEALTH_CHECK',
          entity_type: 'PlanAttendanceRule',
          triggered_by: 'automation',
          status: summary.plansWithoutAttendances > 0 ? 'warning' : 'success',
          timestamp: new Date().toISOString(),
          details: {
            totalPlans: summary.totalPlans,
            plansWithAttendances: summary.plansWithAttendances,
            plansWithoutAttendances: summary.plansWithoutAttendances,
            workshopsByPlan,
            run_context: 'scheduled'
          }
        });
      } catch (logErr) {
        console.error('Falha ao logar health-check de planos:', logErr?.message || logErr);
      }
    }

    return Response.json({
      success: true,
      summary,
      report: auditReport
    });

  } catch (error) {
    console.error('Erro ao fazer audit de planos:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});