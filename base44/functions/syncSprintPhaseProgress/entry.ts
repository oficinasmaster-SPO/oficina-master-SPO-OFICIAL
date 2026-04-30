import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { sprint_id, workshop_id } = await req.json();

    if (!sprint_id || !workshop_id) {
      return Response.json({ error: 'sprint_id e workshop_id são obrigatórios' }, { status: 400 });
    }

    // R03: Validar se workshop_id existe antes de acessar
    const workshop = await base44.asServiceRole.entities.Workshop.get(workshop_id).catch(() => null);
    if (!workshop) {
      return Response.json({ error: 'Workshop não encontrado' }, { status: 404 });
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

    // B06: Validar permissão antes de atualizar
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verificar se usuário tem acesso ao workshop (evitar alteração não autorizada)
    if (user.role !== 'admin' && user.data?.workshop_id !== workshop_id && user.id !== sprint.consultor_id) {
      return Response.json({ error: 'Forbidden: Acesso negado a este sprint' }, { status: 403 });
    }

    // NEW-B: Atualizar apenas progress_percentage — total_tasks e completed_tasks não existem no schema
    const updated = await base44.asServiceRole.entities.ConsultoriaSprint.update(sprint_id, {
      progress_percentage: progressPercentage,
      last_activity_date: new Date().toISOString()
    });

    return Response.json({
      success: true,
      sprint: {
        id: updated.id,
        title: updated.title,
        progress_percentage: updated.progress_percentage
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});