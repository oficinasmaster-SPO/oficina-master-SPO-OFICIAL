import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Search across all workshops using asServiceRole to bypass RLS
        const allWorkshops = await base44.asServiceRole.entities.Workshop.list();
        
        const matches = allWorkshops.filter(w => 
            w.id === '69862ef11391ffe854033cca' || 
            (w.name && w.name.toLowerCase().includes('varej')) ||
            (w.razao_social && w.razao_social.toLowerCase().includes('varej'))
        );
        
        return Response.json({ matches });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});