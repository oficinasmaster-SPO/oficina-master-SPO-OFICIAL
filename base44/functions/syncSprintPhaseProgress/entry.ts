import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { sprint_id, workshop_id } = await req.json();

    if (!sprint_id || !workshop_id) {
      return Response.json({ error: 'sprint_id e workshop_id são obrigatórios' }, { status: 400 });
    }

    // Buscar sprint completa
    const sprint = await base44.asServiceRole.entities.ConsultoriaSprint.get(sprint_id);
    
    if (!sprint || sprint.workshop_id !== workshop_id) {
      return Response.json({ error: 'Sprint não encontrada ou não pertence ao workshop' }, { status: 404 });
    }

    // Calcular progresso das fases
    const phases = sprint.phases || [];
    let totalTasks = 0;
    let completedTasks = 0;

    phases.forEach(phase => {
      if (phase.tasks && Array.isArray(phase.tasks)) {
        phase.tasks.forEach(task => {
          totalTasks++;
          if (task.status === 'done') {
            completedTasks++;
          }
        });
      }
    });

    const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Atualizar sprint com progresso calculado
    const updated = await base44.asServiceRole.entities.ConsultoriaSprint.update(sprint_id, {
      progress_percentage: progressPercentage,
      total_tasks: totalTasks,
      completed_tasks: completedTasks,
      last_activity_date: new Date().toISOString()
    });

    return Response.json({
      success: true,
      sprint: {
        id: updated.id,
        title: updated.title,
        progress_percentage: updated.progress_percentage,
        total_tasks: updated.total_tasks,
        completed_tasks: updated.completed_tasks
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});