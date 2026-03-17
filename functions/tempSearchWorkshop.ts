import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Search across all workshops using asServiceRole to bypass RLS
        const matchById = await base44.asServiceRole.entities.Workshop.filter({ id: "69862ef11391ffe854033cca" });
        const matchByOwner = await base44.asServiceRole.entities.Workshop.filter({ owner_id: "69862ec05ccad4efd4cc4cae" });
        
        return Response.json({ matchById, matchByOwner });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});