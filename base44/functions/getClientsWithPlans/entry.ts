import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Buscar contratos ativos do consultor
    const contracts = await base44.entities.Contract.filter({
      consultor_id: user.id,
      status: { $in: ['ativo', 'efetivado'] }
    }, '-updated_date', 1000);

    if (!contracts || contracts.length === 0) {
      return Response.json({ clients: [] });
    }

    const workshopIds = contracts.map(c => c.workshop_id).filter(Boolean);

    // Buscar workshops
    const workshops = await Promise.all(
      workshopIds.map(id => base44.entities.Workshop.filter({ id }, null, 1).then(res => res?.[0]))
    );

    // Buscar follow-ups pendentes por cliente
    const allFollowUps = await base44.entities.FollowUpReminder.filter({
      workshop_id: { $in: workshopIds },
      is_completed: false
    }, null, 5000);

    // Buscar PlanAttendanceRules para contar backlog potencial
    const planIds = contracts.map(c => c.plan_type).filter(Boolean);
    const planRules = await base44.entities.PlanAttendanceRule.filter(
      { plan_id: { $in: planIds } },
      null,
      1000
    );

    // Montar grid
    const clients = workshops
      .filter(Boolean)
      .map(workshop => {
        const contract = contracts.find(c => c.workshop_id === workshop.id);
        const followUpsCount = allFollowUps.filter(f => f.workshop_id === workshop.id).length;
        const planRulesCount = planRules.filter(pr => pr.plan_id === contract?.plan_type).length;

        return {
          id: workshop.id,
          name: workshop.name,
          plano: contract?.plan_type || 'SEM PLANO',
          status: workshop.status || 'ativo',
          planStatus: contract?.planStatus || 'trial',
          followUpsCount,
          backlogCount: planRulesCount, // proxy para tarefas potenciais
          contractId: contract?.id,
          segment: workshop.segment_auto || workshop.segment || '—',
          city: workshop.city,
        };
      })
      .sort((a, b) => {
        // Ordenação: plano premium primeiro → status ativo → nome
        const planoOrder = { 'MILLIONS': 0, 'IOM': 1, 'GOLD': 2, 'PRATA': 3, 'BRONZE': 4, 'START': 5, 'FREE': 6 };
        const aOrder = planoOrder[a.plano] ?? 99;
        const bOrder = planoOrder[b.plano] ?? 99;

        if (aOrder !== bOrder) return aOrder - bOrder;
        if (a.status !== b.status) return a.status === 'ativo' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

    return Response.json({ clients });
  } catch (error) {
    console.error('Erro ao buscar clientes com planos:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});