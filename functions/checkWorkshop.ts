import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const id = "695408b3ed74bfeb60d708c0";
        
        // Tentar buscar Workshop
        let workshop = null;
        try {
            workshop = await base44.asServiceRole.entities.Workshop.get(id);
        } catch (e) {
            // Ignora erro se não encontrar
        }

        return Response.json({ 
            workshopFound: !!workshop,
            workshopData: workshop
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});