import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        // Use service role to bypass RLS
        const result = await base44.asServiceRole.entities.Employee.update(
            "6984e80881b5b2b276d2b518", 
            { 
                job_role: "diretor",
                position: "Diretor"
            }
        );
        return Response.json({ success: true, result });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});