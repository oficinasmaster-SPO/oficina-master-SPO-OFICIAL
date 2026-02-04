import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const workshopId = "695408b3ed74bfeb60d708c0";
        
        // Listar primeiros 20 colaboradores para inspeção
        const employees = await base44.asServiceRole.entities.Employee.filter({
             workshop_id: workshopId 
        }, { limit: 20 }); 

        return Response.json({ 
            count: employees.length,
            sample: employees.map(e => ({ id: e.id, name: e.full_name, workshop_id: e.workshop_id }))
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});