import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Admin only' }, { status: 403 });
  }

  // Buscar todos os sprints com consulting_firm_id preenchido
  const sprints = await base44.asServiceRole.entities.ConsultoriaSprint.list('-created_date', 5000);
  const sprintsComFirm = sprints.filter(s => s.consulting_firm_id && s.workshop_id);

  // Montar mapa: workshop_id → consulting_firm_id (pegar o primeiro encontrado)
  const workshopToFirm = {};
  for (const sprint of sprintsComFirm) {
    if (!workshopToFirm[sprint.workshop_id]) {
      workshopToFirm[sprint.workshop_id] = sprint.consulting_firm_id;
    }
  }

  const repaired = [];
  const skipped = [];

  for (const [workshopId, firmId] of Object.entries(workshopToFirm)) {
    const workshops = await base44.asServiceRole.entities.Workshop.filter({ id: workshopId });
    const workshop = workshops?.[0];
    if (!workshop) continue;
    if (workshop.consulting_firm_id) {
      skipped.push(workshopId);
      continue;
    }

    await base44.asServiceRole.entities.Workshop.update(workshopId, {
      consulting_firm_id: firmId
    });
    repaired.push({ workshop_id: workshopId, consulting_firm_id: firmId, name: workshop.name });
  }

  return Response.json({
    success: true,
    repaired_count: repaired.length,
    skipped_count: skipped.length,
    repaired
  });
});