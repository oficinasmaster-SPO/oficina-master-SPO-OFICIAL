import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const payload = await req.json();
        const userId = payload.userId;
        const newRole = payload.role;

        if (!userId || !newRole) {
            return Response.json({ error: 'Missing userId or role' }, { status: 400 });
        }

        const result = await base44.asServiceRole.entities.User.update(userId, { role: newRole });

        return Response.json({ success: true, result });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});