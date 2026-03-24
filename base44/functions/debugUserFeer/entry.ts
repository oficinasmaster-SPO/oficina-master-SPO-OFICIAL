import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const workshopId = '69c2cf42c3d7fa43c2fc1bcd';
        
        // Log in as the user feer.rodsil@gmail.com
        // Wait, I can't impersonate them via SDK in a simple way unless I use auth tokens.
        // Let's just fetch it via service role to see if it exists.
        const wsAdmin = await base44.asServiceRole.entities.Workshop.get(workshopId);
        
        // Fetch employees
        const employees = await base44.asServiceRole.entities.Employee.filter({ email: 'feer.rodsil@gmail.com' });

        return Response.json({ wsAdmin, employees });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});