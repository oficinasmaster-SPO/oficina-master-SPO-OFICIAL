import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Propaga atualizações de templates para todos os sprints existentes de clientes.
 * Suporta: adição, remoção e edição de tarefas (description, instructions, link_url, video_url).
 * Preserva sempre: status, completed_at, completed_by, completed_by_role, evidence_url, evidence_note.
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

    const sprints = await base44.asServiceRole.entities.ConsultoriaSprint.filter({
      mission_id: missionId,
    });

    let updatedCount = 0;
    const errors = [];

    for (const sprint of sprints) {
      try {
        const phaseData = sprint.phases?.[phaseIdx];
        if (!phaseData) continue;

        const oldTasks = phaseData.tasks || [];

        // Mescla template (newTasks) com dados do cliente (oldTasks) por índice.
        // Tarefas novas do template são adicionadas; tarefas removidas do template são excluídas.
        const mergedTasks = newTasks.map((templateTask, taskIdx) => {
          const clientTask = oldTasks[taskIdx] || {};
          return {
            // Campos do template sempre sobrescrevem
            description:  templateTask.description  ?? clientTask.description  ?? '',
            instructions: templateTask.instructions?.trim() || undefined,
            link_url:     templateTask.link_url?.trim()     || undefined,
            video_url:    templateTask.video_url?.trim()    || undefined,
            // Dados do cliente são preservados
            status:             clientTask.status             || 'to_do',
            completed_by:       clientTask.completed_by       || null,
            completed_by_role:  clientTask.completed_by_role  || null,
            completed_at:       clientTask.completed_at       || null,
            evidence_url:       clientTask.evidence_url       || null,
            evidence_note:      clientTask.evidence_note      || null,
          };
        });
        // Tarefas além do comprimento do template são descartadas (remoção)

        const updatedPhases = sprint.phases.map((p, idx) =>
          idx === phaseIdx ? { ...p, tasks: mergedTasks } : p
        );

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
      updatedCount,
      totalSprints: sprints.length,
      errors: errors.length > 0 ? errors : null,
    });
  } catch (error) {
    console.error('Erro ao propagar templates:', error);
    return Response.json({ error: error.message || 'Erro ao propagar templates' }, { status: 500 });
  }
});