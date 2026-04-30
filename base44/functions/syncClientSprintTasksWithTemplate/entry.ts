import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Sincroniza TODOS os sprints de clientes de uma missão com o template atual.
 * Usa substituição real (não OR) para que remoções de campos no template sejam propagadas.
 * Preserva sempre: status, completed_at, completed_by, completed_by_role, evidence_url, evidence_note.
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

    // Carregar template do SystemSetting
    const settings = await base44.asServiceRole.entities.SystemSetting.filter({
      key: 'sprint_templates_v1',
    });

    if (!settings?.length) {
      return Response.json({ error: 'Nenhum template encontrado' }, { status: 404 });
    }

    const templatesData = JSON.parse(settings[0].value || '[]');
    const templateMission = templatesData.find((m) => m.mission_id === missionId);

    if (!templateMission) {
      return Response.json(
        { error: `Template para missionId ${missionId} não encontrado` },
        { status: 404 }
      );
    }

    const templateSprint = templateMission.sprint;

    const sprints = await base44.asServiceRole.entities.ConsultoriaSprint.filter({
      mission_id: missionId,
    });

    let updatedCount = 0;
    const errors = [];

    for (const sprint of sprints) {
      try {
        const updatedPhases = (sprint.phases || []).map((phase, phaseIdx) => {
          const templatePhase = templateSprint.phases?.[phaseIdx];
          if (!templatePhase) return phase;

          const templateTasks = templatePhase.tasks || [];
          const clientTasks   = phase.tasks || [];

          // Mesclagem por índice com substituição real:
          // comprimento do template define o resultado final (add/remove suportados)
          const mergedTasks = templateTasks.map((templateTask, taskIdx) => {
            const clientTask = clientTasks[taskIdx] || {};
            return {
              // R3-04: usar undefined em vez de '' para campos opcionais
              description:  templateTask.description  ?? clientTask.description  ?? '',
              instructions: templateTask.instructions?.trim() || undefined,
              link_url:     templateTask.link_url?.trim()     || undefined,
              video_url:    templateTask.video_url?.trim()    || undefined,
              // Dados do cliente preservados
              status:             clientTask.status             || 'to_do',
              completed_by:       clientTask.completed_by       || null,
              completed_by_role:  clientTask.completed_by_role  || null,
              completed_at:       clientTask.completed_at       || null,
              evidence_url:       clientTask.evidence_url       || null,
              evidence_note:      clientTask.evidence_note      || null,
            };
          });

          return { ...phase, tasks: mergedTasks };
        });

        await base44.asServiceRole.entities.ConsultoriaSprint.update(sprint.id, {
          phases: updatedPhases,
        });

        updatedCount++;
      } catch (err) {
        errors.push({ sprint_id: sprint.id, error: err.message });
      }
    }

    return Response.json({
      success: true,
      message: `Sincronizados ${updatedCount} sprint(s)`,
      updatedCount,
      totalSprints: sprints.length,
      errors: errors.length > 0 ? errors : null,
    });
  } catch (error) {
    console.error('Erro ao sincronizar:', error);
    return Response.json({ error: error.message || 'Erro ao sincronizar' }, { status: 500 });
  }
});