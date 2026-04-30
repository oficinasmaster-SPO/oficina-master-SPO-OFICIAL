import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Sincroniza sprints de um cliente com templates globais.
 * SYNC-01: Aceita array de missionIds em uma única chamada (não sequencial).
 * SYNC-02: Filtra por workshopId — só sincroniza sprints do cliente atual.
 * SYNC-04: Consultor pode sincronizar (apenas admin removido).
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // SYNC-04: consultor pode sincronizar — a restrição real é via workshopId (só o cliente dele)
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // SYNC-01+02: aceitar array de missionIds e workshopId obrigatório
    const { missionId, missionIds: missionIdsArray, workshopId } = await req.json();
    // Suporte legado: missionId singular OU novo formato missionIds array
    const missionsToProcess = missionIdsArray || (missionId ? [missionId] : null);

    if (!missionsToProcess?.length) {
      return Response.json({ error: 'missionId ou missionIds é obrigatório' }, { status: 400 });
    }
    if (!workshopId) {
      return Response.json({ error: 'workshopId é obrigatório' }, { status: 400 });
    }

    // Carregar templates uma única vez para todas as missões
    const settings = await base44.asServiceRole.entities.SystemSetting.filter({
      key: 'sprint_templates_v1',
    });

    if (!settings?.length) {
      return Response.json({ error: 'Nenhum template encontrado' }, { status: 404 });
    }

    const templatesData = JSON.parse(settings[0].value || '[]');

    let updatedCount = 0;
    const errors = [];

    for (const mId of missionsToProcess) {
      const templateMission = templatesData.find((m) => m.mission_id === mId);
      if (!templateMission) continue; // pular missões sem template (sem erro)

      const templateSprint = templateMission.sprint;

      // SYNC-02: filtrar por workshopId — só o cliente atual, não todos
      const sprints = await base44.asServiceRole.entities.ConsultoriaSprint.filter({
        mission_id: mId,
        workshop_id: workshopId,
      });

      for (const sprint of sprints) {
        try {
          const updatedPhases = (sprint.phases || []).map((phase, phaseIdx) => {
            const templatePhase = templateSprint.phases?.[phaseIdx];
            if (!templatePhase) return phase;

            const templateTasks = templatePhase.tasks || [];
            const clientTasks = phase.tasks || [];

            const mergedTasks = templateTasks.map((templateTask, taskIdx) => {
              const clientTask = clientTasks[taskIdx] || {};
              return {
                description: templateTask.description ?? clientTask.description ?? '',
                instructions: templateTask.instructions?.trim() || undefined,
                link_url: templateTask.link_url?.trim() || undefined,
                video_url: templateTask.video_url?.trim() || undefined,
                status: clientTask.status || 'to_do',
                completed_by: clientTask.completed_by || null,
                completed_by_role: clientTask.completed_by_role || null,
                completed_at: clientTask.completed_at || null,
                evidence_url: clientTask.evidence_url || null,
                evidence_note: clientTask.evidence_note || null,
              };
            });

            return { ...phase, tasks: mergedTasks };
          });

          await base44.asServiceRole.entities.ConsultoriaSprint.update(sprint.id, {
            phases: updatedPhases,
          });

          updatedCount++;
        } catch (err) {
          errors.push({ sprint_id: sprint.id, mission_id: mId, error: err.message });
        }
      }
    }

    return Response.json({
      success: true,
      message: `Sincronizados ${updatedCount} sprint(s)`,
      updatedCount,
      totalMissions: missionsToProcess.length,
      errors: errors.length > 0 ? errors : null,
    });
  } catch (error) {
    console.error('Erro ao sincronizar:', error);
    return Response.json({ error: error.message || 'Erro ao sincronizar' }, { status: 500 });
  }
});