import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Sincroniza tarefas de sprints de clientes com as instruções/links do template
 * Busca o template, e para cada sprint do cliente, atualiza as tarefas com os dados faltantes
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Apenas admins podem sincronizar' }, { status: 403 });
    }

    const { missionId } = await req.json();
    
    if (!missionId) {
      return Response.json({ error: 'missionId é obrigatório' }, { status: 400 });
    }

    // Buscar o template do SystemSetting
    const settings = await base44.asServiceRole.entities.SystemSetting.filter(
      { key: 'sprint_templates_data' }
    );
    
    if (!settings?.length) {
      return Response.json({ error: 'Nenhum template encontrado' }, { status: 404 });
    }

    const templatesData = JSON.parse(settings[0].value || '[]');
    const templateMission = templatesData.find(m => m.mission_id === missionId);
    
    if (!templateMission) {
      return Response.json({ error: `Template para missionId ${missionId} não encontrado` }, { status: 404 });
    }

    // Buscar todos os sprints desse cliente
    const sprints = await base44.asServiceRole.entities.ConsultoriaSprint.filter({
      mission_id: missionId
    });

    let updatedCount = 0;
    const errors = [];

    // Para cada sprint, sincronizar tarefas
    for (const sprint of sprints) {
      try {
        const templateSprint = templateMission.sprint;
        
        // Percorrer cada fase
        const updatedPhases = sprint.phases?.map((phase, phaseIdx) => {
          const templatePhase = templateSprint.phases?.[phaseIdx];
          
          if (!templatePhase) return phase;

          // Sincronizar tarefas dentro da fase
          const updatedTasks = phase.tasks?.map((task, taskIdx) => {
            const templateTask = templatePhase.tasks?.[taskIdx];
            
            if (!templateTask) return task;

            // Mesclar: preservar dados do cliente, atualizar instructions + link_url
            return {
              ...task,
              instructions: templateTask.instructions || task.instructions || '',
              link_url: templateTask.link_url || task.link_url || '',
              description: templateTask.description || task.description,
            };
          }) || [];

          return { ...phase, tasks: updatedTasks };
        }) || [];

        // Atualizar sprint
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
      message: `Sincronizadas ${updatedCount} sprints`,
      updatedCount,
      totalSprints: sprints.length,
      errors: errors.length > 0 ? errors : null,
    });
  } catch (error) {
    console.error('Erro ao sincronizar:', error);
    return Response.json(
      { error: error.message || 'Erro ao sincronizar' },
      { status: 500 }
    );
  }
});