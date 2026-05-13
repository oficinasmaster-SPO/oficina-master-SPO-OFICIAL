import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Buscar todas as regras de atendimento
    const planRules = await base44.entities.PlanAttendanceRule.list('-created_date', 500);

    // Filtrar APENAS frequency (excluir event_based)
    const frequencyOnly = planRules.filter(r => r.scheduling_type === 'frequency' && r.is_active);

    // Agrupar por frequência de dias
    const byFrequency = {};

    frequencyOnly.forEach(rule => {
      const days = rule.frequency_days || 0;
      const key = `${days}_dias`;

      if (!byFrequency[key]) {
        byFrequency[key] = {
          days,
          frequency_name: getFrequencyName(days),
          count: 0,
          rules: []
        };
      }

      byFrequency[key].count++;
      byFrequency[key].rules.push({
        id: rule.id,
        plan_id: rule.plan_id,
        attendance_type_id: rule.attendance_type_id,
        total_allowed: rule.total_allowed,
        allow_anticipation: rule.allow_anticipation,
        start_from_contract_date: rule.start_from_contract_date
      });
    });

    // Ordenar por dias (7, 14, 30, etc)
    const sorted = Object.keys(byFrequency)
      .sort((a, b) => byFrequency[a].days - byFrequency[b].days)
      .reduce((acc, key) => {
        acc[key] = byFrequency[key];
        return acc;
      }, {});

    return Response.json({
      success: true,
      title: '📊 ATENDIMENTOS POR FREQUÊNCIA (Excluindo Calendário)',
      total_regras: frequencyOnly.length,
      frequencias: sorted,
      excluded_event_based: planRules.filter(r => r.scheduling_type === 'event_based' && r.is_active).length
    });

  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function getFrequencyName(days) {
  switch(days) {
    case 7: return 'SEMANAL';
    case 14: return 'QUINZENAL';
    case 30: return 'MENSAL';
    case 365: return 'ANUAL';
    default: return `A CADA ${days} DIAS`;
  }
}