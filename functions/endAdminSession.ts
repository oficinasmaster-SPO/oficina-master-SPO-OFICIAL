import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { session_id } = await req.json();

        if (!session_id) {
             return Response.json({ error: 'Session ID required' }, { status: 400 });
        }

        // Verificar se a sessão pertence ao usuário
        const session = await base44.entities.AdminAccessSession.get(session_id); // Assumindo get ou filter

        if (!session) {
             return Response.json({ error: 'Session not found' }, { status: 404 });
        }

        // Ajuste para filter retornando array se get não existir
        const sessionData = Array.isArray(session) ? session[0] : session;

        if (sessionData.admin_user_id !== user.id) {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        const now = new Date();

        const updatedSession = await base44.entities.AdminAccessSession.update(sessionData.id, {
            is_active: false,
            ended_at: now.toISOString()
        });

        return Response.json({ session: updatedSession });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});