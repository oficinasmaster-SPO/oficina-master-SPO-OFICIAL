import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Use exact email from previous find
        const employees = await base44.asServiceRole.entities.Employee.filter({
            email: "ghrs.guilherme+Diretor@gmail.com" 
        });
        
        if (employees.length === 0) {
             return Response.json({ error: "Employee not found with exact email" });
        }
        
        const emp = employees[0];

        const result = await base44.asServiceRole.entities.Employee.update(
            emp.id, 
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