import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { workshop_id } = await req.json();

    if (!workshop_id) {
      return Response.json({ error: 'workshop_id é obrigatório' }, { status: 400 });
    }

    // Buscar workshop
    const workshops = await base44.entities.Workshop.filter({ id: workshop_id });
    if (!workshops || workshops.length === 0) {
      return Response.json({ error: 'Workshop não encontrado' }, { status: 404 });
    }

    const workshop = workshops[0];

    // Buscar sprints do cliente
    const sprints = await base44.entities.ConsultoriaSprint.filter({
      workshop_id: workshop_id
    });

    // Buscar trilhas selecionadas
    const cronogramas = await base44.entities.CronogramaTemplate.filter({
      workshop_id: workshop_id
    });

    const trilhasSelecionadas = cronogramas?.length > 0 ? (cronogramas[0].missoes_selecionadas || []) : [];

    // Agrupar sprints por missão
    const sprintsPorMissao = {};
    sprints.forEach(sprint => {
      if (!sprintsPorMissao[sprint.mission_id]) {
        sprintsPorMissao[sprint.mission_id] = [];
      }
      sprintsPorMissao[sprint.mission_id].push({
        numero: sprint.sprint_number,
        titulo: sprint.title,
        status: sprint.status,
        data_inicio: sprint.start_date,
        data_fim: sprint.end_date
      });
    });

    return Response.json({
      workshop: {
        id: workshop.id,
        nome: workshop.name
      },
      trilhas_selecionadas: trilhasSelecionadas,
      sprints_criados: Object.keys(sprintsPorMissao),
      detalhes_sprints: sprintsPorMissao,
      total_sprints: sprints.length,
      mensagem: `${sprints.length} sprints criados, ${trilhasSelecionadas.length} trilhas selecionadas`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});