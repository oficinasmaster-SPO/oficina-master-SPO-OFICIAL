import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Apenas admin pode rodar
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { workshop_id, mission_id } = await req.json();

    if (!workshop_id || !mission_id) {
      return Response.json({ 
        error: 'workshop_id e mission_id são obrigatórios' 
      }, { status: 400 });
    }

    // Buscar template do sistema — R3-02: chave correta é 'sprint_templates_v1'
    const systemSettings = await base44.asServiceRole.entities.SystemSetting.filter(
      { key: 'sprint_templates_v1' },
      '-created_date',
      1
    );

    if (!systemSettings?.length) {
      return Response.json({ 
        error: 'Template não encontrado no sistema' 
      }, { status: 404 });
    }

    // R3-02: sprint_templates_v1 é um array JSON, não um objeto por chave
    const templatesData = JSON.parse(systemSettings[0].value || '[]');
    const templateObj = templatesData.find(m => m.mission_id === mission_id);
    const template = templateObj?.sprint;

    if (!template?.phases) {
      return Response.json({ 
        error: `Template para ${mission_id} não tem fases definidas` 
      }, { status: 404 });
    }

    // Buscar sprint antiga do cliente
    const sprints = await base44.asServiceRole.entities.ConsultoriaSprint.filter({
      workshop_id,
      mission_id
    });

    if (!sprints?.length) {
      return Response.json({
        success: true,
        message: 'Nenhuma sprint encontrada para este cliente',
        updatedCount: 0
      });
    }

    const sprint = sprints[0];
    const updatedPhases = [];

    // Sincronizar cada fase com o template
    for (let phaseIdx = 0; phaseIdx < sprint.phases.length; phaseIdx++) {
      const currentPhase = sprint.phases[phaseIdx];
      const templatePhase = template.phases[phaseIdx];

      if (!templatePhase) {
        updatedPhases.push(currentPhase);
        continue;
      }

      // Mesclar tarefas: atualizar dados do template, preservar status de conclusão
      const mergedTasks = (currentPhase.tasks || []).map((currentTask) => {
        const templateTask = templatePhase.tasks?.find(
          t => t.description === currentTask.description
        );

        if (!templateTask) {
          return currentTask; // Tarefa customizada do cliente, manter como está
        }

        // Tarefa existe no template
        const wasDone = currentTask.status === 'done';
        
        return {
          ...currentTask,
          // R3-04: usar undefined em vez de '' para campos opcionais
          instructions: templateTask.instructions?.trim() || currentTask.instructions || undefined,
          link_url: templateTask.link_url?.trim() || currentTask.link_url || undefined,
          video_url: templateTask.video_url?.trim() || currentTask.video_url || undefined,
          // Preservar status de conclusão
          status: wasDone ? 'done' : (currentTask.status || 'to_do'),
          // Se foi concluída, manter dados de conclusão
          ...(wasDone && currentTask.completed_by ? {
            completed_by: currentTask.completed_by,
            completed_by_role: currentTask.completed_by_role,
            completed_at: currentTask.completed_at,
            evidence_url: currentTask.evidence_url,
            evidence_note: currentTask.evidence_note
          } : {})
        };
      });

      updatedPhases.push({
        ...currentPhase,
        tasks: mergedTasks
      });
    }

    // Persistir atualização — R3-05 padrão: usar asServiceRole para evitar falha por RLS
    await base44.asServiceRole.entities.ConsultoriaSprint.update(sprint.id, {
      phases: updatedPhases,
      last_activity_date: new Date().toISOString()
    });

    return Response.json({
      success: true,
      message: `Sprint de ${sprint.title} sincronizada com sucesso`,
      updatedCount: 1,
      sprintId: sprint.id,
      workshop: workshop_id,
      mission: mission_id
    });

  } catch (error) {
    console.error('Erro ao sincronizar sprint:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});