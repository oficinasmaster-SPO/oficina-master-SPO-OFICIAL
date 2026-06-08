import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const payload = await req.json();
        
        let userResult = null;
        
        if (payload.action === 'check_user_workshop') {
            const users = await base44.asServiceRole.entities.User.filter({ email: payload.email });
            if (users.length > 0) {
                const user = users[0];
                const employees = await base44.asServiceRole.entities.Employee.filter({ user_id: user.id });
                return Response.json({ user, employees });
            }
            return Response.json({ user: null });
        }
        
        return Response.json({ error: 'invalid action' });
    } catch (e) {
        return Response.json({ error: e.message });
    }
});