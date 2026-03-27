import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Count how many have user_id null vs not null
        const page = await base44.asServiceRole.entities.Employee.list('-created_date', 1000, 0);
        
        let nullUserId = 0;
        let nullEmail = 0;
        let nullName = 0;
        let byName = {};

        for (const emp of page) {
            if (!emp.user_id) nullUserId++;
            if (!emp.email) nullEmail++;
            if (!emp.full_name) nullName++;
            
            const name = emp.full_name || 'undefined';
            byName[name] = (byName[name] || 0) + 1;
        }

        return Response.json({
            nullUserId,
            nullEmail,
            nullName,
            byName
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});