import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const adminConsultingFirmId = user.data?.consulting_firm_id;
    if (!adminConsultingFirmId) {
      return Response.json({ error: 'Admin não tem consulting_firm_id no perfil. Configure antes de executar.' }, { status: 400 });
    }

    // Buscar todos os workshops sem consulting_firm_id
    const allWorkshops = await base44.asServiceRole.entities.Workshop.list();
    const toRepair = allWorkshops.filter(w => !w.consulting_firm_id);

    console.log(`[repairWorkshopConsultingFirmId] ${toRepair.length} workshops sem consulting_firm_id de ${allWorkshops.length} total`);

    const repaired = [];
    const errors = [];

    for (const workshop of toRepair) {
      try {
        // Tentar pegar consulting_firm_id de um sprint existente do workshop
        const sprints = await base44.asServiceRole.entities.ConsultoriaSprint.filter(
          { workshop_id: workshop.id },
          '-created_date',
          1
        );

        const firmId = sprints?.[0]?.consulting_firm_id || adminConsultingFirmId;

        await base44.asServiceRole.entities.Workshop.update(workshop.id, {
          consulting_firm_id: firmId
        });

        repaired.push({
          workshop_id: workshop.id,
          name: workshop.name,
          consulting_firm_id: firmId,
          source: sprints?.[0]?.consulting_firm_id ? 'from_sprint' : 'from_admin'
        });
      } catch (err) {
        errors.push({ workshop_id: workshop.id, name: workshop.name, error: err.message });
      }
    }

    return Response.json({
      success: true,
      total_workshops: allWorkshops.length,
      already_had_firm: allWorkshops.length - toRepair.length,
      repaired: repaired.length,
      errors: errors.length,
      repaired_list: repaired,
      error_list: errors
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});