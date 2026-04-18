import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // ID da Oficinas Master Aceleradora
    const workshopId = "69ab04376ca4c22324455582";
    
    // Buscar sprints
    const sprints = await base44.asServiceRole.entities.ConsultoriaSprint.filter(
      { workshop_id: workshopId },
      "-updated_date"
    );

    return Response.json({
      workshopId,
      totalSprints: sprints.length,
      sprints: sprints.map(s => ({
        id: s.id,
        name: s.name || s.titulo || "Sem nome",
        status: s.status,
        start_date: s.start_date,
        end_date: s.end_date,
        completion_percentage: s.completion_percentage || 0,
        created_date: s.created_date
      }))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});