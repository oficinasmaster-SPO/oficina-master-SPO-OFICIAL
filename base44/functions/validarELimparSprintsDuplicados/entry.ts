import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { workshop_id } = await req.json();

    if (!workshop_id) {
      return Response.json({ error: 'workshop_id é obrigatório' }, { status: 400 });
    }

    // Buscar todos os sprints do workshop
    const sprints = await base44.entities.ConsultoriaSprint.filter({
      workshop_id: workshop_id
    });

    if (!sprints || sprints.length === 0) {
      return Response.json({
        sucesso: true,
        duplicados_removidos: 0,
        mensagem: 'Nenhum sprint encontrado'
      });
    }

    // Agrupar por mission_id
    const sprintsPorMissao = {};
    sprints.forEach(sprint => {
      if (!sprintsPorMissao[sprint.mission_id]) {
        sprintsPorMissao[sprint.mission_id] = [];
      }
      sprintsPorMissao[sprint.mission_id].push(sprint);
    });

    // Encontrar e deletar duplicados (manter apenas o primeiro, remover os não-finalizados)
    let deletados = 0;
    const duplicadosEncontrados = [];

    for (const [missaoId, sprintsList] of Object.entries(sprintsPorMissao)) {
      if (sprintsList.length > 1) {
        // Ordenar por data de criação (mais antigo primeiro)
        const ordenados = sprintsList.sort(
          (a, b) => new Date(a.created_date) - new Date(b.created_date)
        );

        // Manter o primeiro, deletar os demais se não estiverem concluídos
        for (let i = 1; i < ordenados.length; i++) {
          const sprint = ordenados[i];
          if (sprint.status !== 'completed') {
            await base44.entities.ConsultoriaSprint.delete(sprint.id);
            deletados++;
            duplicadosEncontrados.push({
              missao_id: missaoId,
              sprint_id: sprint.id,
              titulo: sprint.title,
              motivo: 'Duplicado não finalizado'
            });
          }
        }
      }
    }

    return Response.json({
      sucesso: true,
      duplicados_removidos: deletados,
      detalhes: duplicadosEncontrados,
      mensagem: `${deletados} sprints duplicados removidos`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});