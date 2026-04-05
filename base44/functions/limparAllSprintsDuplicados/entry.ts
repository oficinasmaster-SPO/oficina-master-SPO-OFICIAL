import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Apenas admins podem executar limpeza' }, { status: 403 });
    }

    // Buscar TODOS os sprints do sistema
    const todosSprints = await base44.asServiceRole.entities.ConsultoriaSprint.list('-created_date', 999);

    // Agrupar por (workshop_id + mission_id) para detectar duplicatas
    const sprintsPorMissaoWorkshop = {};
    todosSprints.forEach(sprint => {
      const chave = `${sprint.workshop_id}||${sprint.mission_id}`;
      if (!sprintsPorMissaoWorkshop[chave]) {
        sprintsPorMissaoWorkshop[chave] = [];
      }
      sprintsPorMissaoWorkshop[chave].push(sprint);
    });

    let deletados = 0;
    const detalhes = [];

    // Para cada grupo de sprints da mesma missão no mesmo workshop
    for (const [chave, sprintsList] of Object.entries(sprintsPorMissaoWorkshop)) {
      if (sprintsList.length > 1) {
        // Ordenar por data de criação (mais antigo primeiro)
        const ordenados = sprintsList.sort(
          (a, b) => new Date(a.created_date) - new Date(b.created_date)
        );

        const primeiro = ordenados[0];
        
        // Regra: se o primeiro NÃO está concluído, deletar TODOS os outros
        if (primeiro.status !== 'completed') {
          for (let i = 1; i < ordenados.length; i++) {
            const sprint = ordenados[i];
            await base44.asServiceRole.entities.ConsultoriaSprint.delete(sprint.id);
            deletados++;
            detalhes.push({
              sprint_id: sprint.id,
              titulo: sprint.title,
              workshop: sprint.workshop_id,
              missao: sprint.mission_id,
              motivo: `Primeiro sprint não concluído - ${primeiro.status}`
            });
          }
        } else {
          // Se primeiro foi concluído, manter apenas o segundo
          for (let i = 2; i < ordenados.length; i++) {
            const sprint = ordenados[i];
            await base44.asServiceRole.entities.ConsultoriaSprint.delete(sprint.id);
            deletados++;
            detalhes.push({
              sprint_id: sprint.id,
              titulo: sprint.title,
              workshop: sprint.workshop_id,
              missao: sprint.mission_id,
              motivo: 'Mais de 2 sprints da mesma missão'
            });
          }
        }
      }
    }

    return Response.json({
      sucesso: true,
      total_deletados: deletados,
      detalhes: detalhes,
      mensagem: `✅ ${deletados} sprints duplicados foram removidos do sistema`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});