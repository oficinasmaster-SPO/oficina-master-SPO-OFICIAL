import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ESTRATÉGIA: Buscar workshops onde o user é owner, partner ou é admin
    const workshops = user.role === 'admin' 
      ? await base44.asServiceRole.entities.Workshop.list('-updated_date', 1000)
      : await base44.entities.Workshop.filter({}, '-updated_date', 1000);

    if (!workshops || workshops.length === 0) {
      return Response.json({ clients: [] });
    }

    const workshopIds = workshops.map(w => w.id);

    // Contagens são OPCIONAIS (fail-open): um 429 nelas não pode zerar o grid de clientes.
    // O Workshop list (acima) é a leitura crítica — se ela falhar, retornar vazio é correto.
    let allFollowUps = [];
    try {
      allFollowUps = await base44.entities.FollowUpReminder.filter({
        workshop_id: { $in: workshopIds },
        is_completed: false
      }, null, 1000);
    } catch (e) {
      console.warn('getClientsWithPlans: FollowUpReminder indisponível — contagens de FU zeradas:', e?.message);
    }

    let allBacklogTasks = [];
    try {
      allBacklogTasks = await base44.entities.TarefaBacklog.filter({
        cliente_id: { $in: workshopIds },
        status: { $in: ['aberta', 'em_execucao'] }
      }, null, 5000);
    } catch (e) {
      console.warn('getClientsWithPlans: TarefaBacklog indisponível — contagens de backlog zeradas:', e?.message);
    }

    // Montar grid com dados completos
    const clients = workshops
      .filter(Boolean)
      .map(workshop => {
        const followUpsCount = allFollowUps.filter(f => f.workshop_id === workshop.id).length;
        const backlogCount = allBacklogTasks.filter(t => t.cliente_id === workshop.id).length;

        return {
          id: workshop.id,
          name: workshop.name,
          plano: workshop.planoAtual || 'FREE',
          status: workshop.status || 'ativo',
          planStatus: workshop.planStatus || 'trial',
          followUpsCount,
          backlogCount,
          segment: workshop.segment_auto || workshop.segment || '—',
          city: workshop.city,
          consultorPrincipalNome: workshop.consultor_principal_nome || null,
        };
      })
      .sort((a, b) => {
        // Ordenação: status ativo primeiro → plano premium → nome
        const planoOrder = { 'MILLIONS': 0, 'IOM': 1, 'GOLD': 2, 'PRATA': 3, 'BRONZE': 4, 'START': 5, 'FREE': 6 };
        const aOrder = planoOrder[a.plano] ?? 99;
        const bOrder = planoOrder[b.plano] ?? 99;

        if (a.status !== b.status) return a.status === 'ativo' ? -1 : 1;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return a.name.localeCompare(b.name);
      });

    return Response.json({ clients });
  } catch (error) {
    console.error('Erro ao buscar clientes com planos:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});