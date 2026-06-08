import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const payload = await req.json();
        
        let userResult = null;
        let workshopsResult = null;
        
        if (payload.action === 'check_user') {
            const users = await base44.asServiceRole.entities.User.filter({ email: payload.email });
            userResult = users.length > 0 ? users[0] : null;
            return Response.json({ user: userResult });
        } else if (payload.action === 'check_workshops') {
            const workshops = await base44.asServiceRole.entities.Workshop.list();
            const nameless = workshops.filter(w => !w.name || w.name.trim() === '');
            return Response.json({ workshops: nameless });
        }
        
        return Response.json({ error: 'invalid action' });
    } catch (e) {
        return Response.json({ error: e.message });
    }
});