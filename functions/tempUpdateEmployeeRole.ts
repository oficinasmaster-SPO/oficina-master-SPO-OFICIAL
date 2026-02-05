import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        console.log("Service role available:", !!base44.asServiceRole);
        
        // Try to read first
        const emp = await base44.asServiceRole.entities.Employee.get("6984e80881b5b2b276d2b518");
        console.log("Employee found:", emp);
        
        if (!emp) return Response.json({ error: "Employee not found" });

        // Try update
        const result = await base44.asServiceRole.entities.Employee.update(
            "6984e80881b5b2b276d2b518", 
            { 
                job_role: "diretor",
                position: "Diretor"
            }
        );
        return Response.json({ success: true, result });
    } catch (error) {
        console.error("Error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});