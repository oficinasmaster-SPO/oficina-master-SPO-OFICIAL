import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Validar papel
        // Nota: O campo platform_role pode não estar no objeto user padrão se não for customizado no auth, 
        // mas aqui buscamos do banco para garantir.
        // Como user.platform_role vem do token/sessão, se tiver sido atualizado, deve estar lá.
        // Caso contrário, buscamos no banco.
        const userRecord = await base44.entities.User.filter({ id: user.id });
        const fullUser = userRecord[0] || user;

        if (fullUser.platform_role !== 'consultoria_owner') {
            return Response.json({ error: 'Forbidden: Apenas consultoria_owner pode iniciar sessão Master' }, { status: 403 });
        }

        const { workshop_id, reason, duration_minutes = 60 } = await req.json();

        if (!workshop_id || !reason) {
             return Response.json({ error: 'Workshop ID e Motivo são obrigatórios' }, { status: 400 });
        }

        const now = new Date();
        const expiresAt = new Date(now.getTime() + duration_minutes * 60000);

        // Encerrar sessões anteriores ativas deste usuário
        const activeSessions = await base44.entities.AdminAccessSession.filter({
            admin_user_id: user.id,
            is_active: true
        });

        for (const session of activeSessions) {
            await base44.entities.AdminAccessSession.update(session.id, {
                is_active: false,
                ended_at: now.toISOString()
            });
        }

        // Criar nova sessão
        const session = await base44.entities.AdminAccessSession.create({
            admin_user_id: user.id,
            workshop_id,
            mode: 'MASTER',
            reason,
            duration_minutes,
            started_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
            is_active: true,
            actions_count: 0
        });

        return Response.json({ session });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});