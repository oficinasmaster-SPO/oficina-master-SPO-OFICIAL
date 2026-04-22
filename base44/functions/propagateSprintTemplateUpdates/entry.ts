import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Propaga atualizações de templates para todos os sprints existentes de clientes
 * Preserva status de conclusão mas atualiza instruções e links
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Apenas admins podem propagar templates' }, { status: 403 });
    }

    const { missionId, phaseIdx, newTasks } = await req.json();
    
    if (!missionId || phaseIdx === undefined || !Array.isArray(newTasks)) {
      return Response.json({ error: 'Parâmetros inválidos' }, { status: 400 });
    }

    // Buscar todos os sprints de clientes para essa missão
    const sprints = await base44.asServiceRole.entities.ConsultoriaSprint.filter({
      mission_id: missionId
    });

    let updatedCount = 0;
    const errors = [];

    // Propagar para cada sprint
    for (const sprint of sprints) {
      try {
        const phaseData = sprint.phases?.[phaseIdx];
        if (!phaseData || !phaseData.tasks) continue;

        // Mapear tarefas antigas para novas baseado em índice
        const updatedPhaseTasks = phaseData.tasks.map((oldTask, taskIdx) => {
          const newTask = newTasks[taskIdx];
          
          if (!newTask) return oldTask;

          // Se tarefa foi concluída, preservar status mas atualizar conteúdo
          const isCompleted = oldTask.status === 'done' || oldTask.completed_at;
          
          if (isCompleted) {
            return {
              ...oldTask,
              instructions: newTask.instructions || oldTask.instructions,
              link_url: newTask.link_url || oldTask.link_url,
              // Preservar: status, completed_at, evidence_url, evidence_note
            };
          }

          // Se não concluída, atualizar tudo (mas preservar dados do cliente)
          return {
            description: newTask.description,
            instructions: newTask.instructions || '',
            link_url: newTask.link_url || '',
            status: oldTask.status || 'to_do',
            completed_by: oldTask.completed_by || null,
            completed_by_role: oldTask.completed_by_role || null,
            completed_at: oldTask.completed_at || null,
            evidence_url: oldTask.evidence_url || null,
            evidence_note: oldTask.evidence_note || null,
          };
        });

        // Atualizar o sprint com as tarefas atualizadas
        const updatedPhases = sprint.phases.map((p, idx) =>
          idx === phaseIdx ? { ...p, tasks: updatedPhaseTasks } : p
        );

        await base44.asServiceRole.entities.ConsultoriaSprint.update(sprint.id, {
          phases: updatedPhases,
        });

        updatedCount++;
      } catch (err) {
        errors.push({
          sprint_id: sprint.id,
          error: err.message,
        });
      }
    }

    return Response.json({
      success: true,
      updatedCount,
      totalSprints: sprints.length,
      errors: errors.length > 0 ? errors : null,
    });
  } catch (error) {
    console.error('Erro ao propagar templates:', error);
    return Response.json(
      { error: error.message || 'Erro ao propagar templates' },
      { status: 500 }
    );
  }
});