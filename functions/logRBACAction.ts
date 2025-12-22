import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const {
      action_type,
      target_type,
      target_id,
      target_name,
      changes,
      affected_users_count,
      notes
    } = payload;

    // Capturar IP e User Agent
    const ip_address = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const user_agent = req.headers.get('user-agent') || 'unknown';

    // Criar log de auditoria
    const log = await base44.asServiceRole.entities.RBACLog.create({
      action_type,
      performed_by: user.email,
      performed_by_name: user.full_name || user.email,
      target_type,
      target_id: target_id || null,
      target_name: target_name || null,
      changes: changes || null,
      affected_users_count: affected_users_count || 0,
      ip_address,
      user_agent,
      notes: notes || null
    });

    return Response.json({ success: true, log_id: log.id });
  } catch (error) {
    console.error('Error logging RBAC action:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});