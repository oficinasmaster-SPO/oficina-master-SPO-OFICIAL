import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { mode = 'all' } = body;

    // Buscar notificações do usuário (max 100 por chamada para evitar timeout)
    const notifications = await base44.asServiceRole.entities.Notification.filter(
      { user_id: user.id },
      '-created_date',
      100
    );

    if (!notifications || notifications.length === 0) {
      return Response.json({ success: true, deleted: 0, remaining: 0 });
    }

    const toDelete = mode === 'read_only'
      ? notifications.filter(n => n.is_read)
      : notifications;

    if (toDelete.length === 0) {
      return Response.json({ success: true, deleted: 0, remaining: 0 });
    }

    let deleted = 0;

    // Deletar sequencialmente com retry e delay
    for (const n of toDelete) {
      try {
        await base44.asServiceRole.entities.Notification.delete(n.id);
        deleted++;
      } catch (e) {
        if (e?.message?.includes('Rate limit') || e?.message?.includes('429')) {
          await new Promise(r => setTimeout(r, 3000));
          try {
            await base44.asServiceRole.entities.Notification.delete(n.id);
            deleted++;
          } catch (_) { /* skip */ }
        }
      }
      await new Promise(r => setTimeout(r, 300));
    }

    // Verificar se ainda restam notificações
    let remaining = 0;
    try {
      const leftover = await base44.asServiceRole.entities.Notification.filter(
        { user_id: user.id },
        '-created_date',
        1
      );
      remaining = leftover?.length || 0;
    } catch (_) {}

    return Response.json({ success: true, deleted, remaining: remaining > 0 ? remaining : 0 });
  } catch (error) {
    console.error('clearNotifications error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});