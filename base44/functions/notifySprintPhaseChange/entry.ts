import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { sprint_id, phase_name, action, feedback } = await req.json();
  // action: "submitted_for_review" | "approved" | "returned"

  if (!sprint_id || !phase_name || !action) {
    return Response.json({ error: 'Missing params' }, { status: 400 });
  }

  let sprint;
  try {
    sprint = await base44.asServiceRole.entities.ConsultoriaSprint.get(sprint_id);
  } catch (e) {
    return Response.json({ error: 'Sprint not found' }, { status: 404 });
  }
  if (!sprint) return Response.json({ error: 'Sprint not found' }, { status: 404 });

  const phaseLabels = {
    Planning: "Planejamento",
    Execution: "Execução",
    Monitoring: "Monitoramento",
    Review: "Revisão",
    Retrospective: "Retrospectiva"
  };
  const phaseLabel = phaseLabels[phase_name] || phase_name;

  if (action === "submitted_for_review") {
    // Notify consultant
    const consultorId = sprint.consultor_id;
    if (consultorId) {
      await base44.asServiceRole.entities.Notification.create({
        user_id: consultorId,
        workshop_id: sprint.workshop_id,
        type: "status_alterado",
        title: "Fase enviada para revisão",
        message: `A oficina enviou a fase "${phaseLabel}" do sprint "${sprint.title}" para sua revisão.`,
        metadata: { sprint_id, phase_name, action }
      });
    }
  } else if (action === "approved" || action === "returned") {
    // Notify workshop owner
    let workshop;
    try {
      workshop = await base44.asServiceRole.entities.Workshop.get(sprint.workshop_id);
    } catch { /* ignore */ }

    const ownerId = workshop?.owner_id;
    if (ownerId) {
      const title = action === "approved"
        ? `Fase "${phaseLabel}" aprovada!`
        : `Fase "${phaseLabel}" devolvida`;
      const message = action === "approved"
        ? `O consultor aprovou a fase "${phaseLabel}" do sprint "${sprint.title}". Parabéns!`
        : `O consultor devolveu a fase "${phaseLabel}" do sprint "${sprint.title}" com feedback: "${feedback || '—'}"`;

      await base44.asServiceRole.entities.Notification.create({
        user_id: ownerId,
        workshop_id: sprint.workshop_id,
        type: "status_alterado",
        title,
        message,
        metadata: { sprint_id, phase_name, action, feedback }
      });
    }

    // Also notify partner_ids
    if (workshop?.partner_ids?.length) {
      for (const partnerId of workshop.partner_ids) {
        if (partnerId === ownerId) continue;
        const title2 = action === "approved"
          ? `Fase "${phaseLabel}" aprovada`
          : `Fase "${phaseLabel}" devolvida`;
        await base44.asServiceRole.entities.Notification.create({
          user_id: partnerId,
          workshop_id: sprint.workshop_id,
          type: "status_alterado",
          title: title2,
          message: `Sprint "${sprint.title}" — fase "${phaseLabel}" foi ${action === "approved" ? "aprovada" : "devolvida"}.`,
          metadata: { sprint_id, phase_name, action }
        });
      }
    }
  }

  return Response.json({ success: true });
});