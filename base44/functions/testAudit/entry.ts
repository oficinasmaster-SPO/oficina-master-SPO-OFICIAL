import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const allEmployees = await base44.asServiceRole.entities.Employee.filter({ workshop_id: "697b986d267e4326dc3f5bf5" });
        
        let valid = 0;
        for (const emp of allEmployees) {
            if (emp.full_name && emp.position) valid++;
        }
        
        return Response.json({
            total: allEmployees.length,
            valid
        });
    } catch (error) {
        return Response.json({ error: error.message });
    }
});