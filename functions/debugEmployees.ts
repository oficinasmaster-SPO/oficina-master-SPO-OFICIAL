import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Buscar employees sem filtro
        const employees = await base44.asServiceRole.entities.Employee.list('-created_date', 50);

        return Response.json({ 
            count: employees.length,
            sample: employees.map(e => ({ 
                id: e.id, 
                name: e.full_name, 
                workshop_id: e.workshop_id 
            }))
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});