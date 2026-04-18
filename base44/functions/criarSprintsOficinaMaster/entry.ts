import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const workshopId = "69ab04376ca4c22324455582";
    
    // Sprint 0 - Diagnóstico & Alinhamento
    const sprint0 = {
      workshop_id: workshopId,
      sprint_number: 0,
      title: "Sprint 0 — Diagnóstico & Alinhamento",
      mission_id: "diagnostico",
      objective: "Realizar diagnóstico inicial e alinhar expectativas",
      status: "in_progress",
      start_date: "2026-03-20",
      end_date: "2026-04-10",
      progress_percentage: 12,
      phases: []
    };

    // Sprint 2 - Fechamento Imbatível  
    const sprint2 = {
      workshop_id: workshopId,
      sprint_number: 2,
      title: "Sprint 2 — Fechamento Imbatível",
      mission_id: "fechamento",
      objective: "Implementar sistema de fechamento robusto e processos de retenção",
      status: "in_progress",
      start_date: "2026-05-02",
      end_date: "2026-05-22",
      progress_percentage: 0,
      phases: []
    };

    // Atualizar Sprint 1 para status in_progress se estiver pending
    const sprint1Id = "69d8f881f549772b56299d90";
    await base44.asServiceRole.entities.ConsultoriaSprint.update(sprint1Id, {
      status: "in_progress",
      progress_percentage: 3
    });

    // Criar as novas sprints
    const newSprint0 = await base44.asServiceRole.entities.ConsultoriaSprint.create(sprint0);
    const newSprint2 = await base44.asServiceRole.entities.ConsultoriaSprint.create(sprint2);

    return Response.json({
      success: true,
      created: [
        { id: newSprint0.id, number: 0, title: sprint0.title },
        { id: newSprint2.id, number: 2, title: sprint2.title }
      ],
      updated: {
        id: sprint1Id,
        status: "in_progress",
        progress: 3
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});