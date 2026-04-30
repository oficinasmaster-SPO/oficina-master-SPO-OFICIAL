import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { workshop_id } = await req.json();

    if (!workshop_id) {
      return Response.json({ error: 'workshop_id é obrigatório' }, { status: 400 });
    }

    // R3-05: usar asServiceRole para contornar RLS — sem isso, o delete falha silenciosamente
    const sprints = await base44.asServiceRole.entities.ConsultoriaSprint.filter({
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

    // Regra: Só pode ter 2 sprints da mesma missão se o primeiro foi CONCLUÍDO
    let deletados = 0;
    const duplicadosEncontrados = [];

    for (const [missaoId, sprintsList] of Object.entries(sprintsPorMissao)) {
      if (sprintsList.length > 1) {
        // Ordenar por data de criação
        const ordenados = sprintsList.sort(
          (a, b) => new Date(a.created_date) - new Date(b.created_date)
        );

        // Verificar: o primeiro precisa estar CONCLUÍDO para ter um segundo
        const primeiro = ordenados[0];
        
        // Se o primeiro NÃO está concluído, deletar TODOS os outros
        if (primeiro.status !== 'completed') {
          for (let i = 1; i < ordenados.length; i++) {
            const sprint = ordenados[i];
            await base44.asServiceRole.entities.ConsultoriaSprint.delete(sprint.id);
            deletados++;
            duplicadosEncontrados.push({
              missao_id: missaoId,
              sprint_id: sprint.id,
              titulo: sprint.title,
              motivo: 'Primeiro sprint não foi concluído'
            });
          }
        } else {
          // Se primeiro foi concluído, manter apenas o segundo mais recente
          for (let i = 2; i < ordenados.length; i++) {
            const sprint = ordenados[i];
            await base44.asServiceRole.entities.ConsultoriaSprint.delete(sprint.id);
            deletados++;
            duplicadosEncontrados.push({
              missao_id: missaoId,
              sprint_id: sprint.id,
              titulo: sprint.title,
              motivo: 'Mais de 2 sprints da mesma missão'
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