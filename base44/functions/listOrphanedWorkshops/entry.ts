import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    
    if (!caller || caller.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const workshops = await base44.asServiceRole.entities.Workshop.list('-created_date', 200);
    const orphaned = [];

    for (const ws of workshops) {
      if (!ws.owner_id) continue;
      try {
        await base44.asServiceRole.entities.User.get(ws.owner_id);
      } catch (e) {
        if (e.message?.includes('not found') || e.message?.includes('404')) {
          orphaned.push({
            workshopId: ws.id,
            workshopName: ws.name,
            city: ws.city,
            state: ws.state,
            ownerId: ws.owner_id,
            consultingFirmId: ws.consulting_firm_id,
            createdDate: ws.created_date,
            status: ws.status,
            planStatus: ws.planStatus,
          });
        }
      }
    }

    return Response.json({ total: orphaned.length, orphanedWorkshops: orphaned });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});