import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const payload = await req.json();
        const { workshop_id } = payload;
        
        if (!workshop_id) {
            return Response.json({ error: 'workshop_id is required' }, { status: 400 });
        }
        
        const workshop = await base44.asServiceRole.entities.Workshop.get(workshop_id);
        if (!workshop) {
            return Response.json({ error: 'Workshop not found' }, { status: 404 });
        }
        
        return Response.json({ 
            id: workshop.id,
            name: workshop.name,
            logo_url: workshop.logo_url
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});