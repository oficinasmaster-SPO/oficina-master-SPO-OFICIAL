import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { userId, user_type } = body || {};

    if (!userId || !user_type) {
      return Response.json({ error: 'userId and user_type are required' }, { status: 400 });
    }

    if (!['internal', 'external'].includes(user_type)) {
      return Response.json({ error: 'user_type must be "internal" or "external"' }, { status: 400 });
    }

    await base44.asServiceRole.entities.User.update(userId, { user_type });
    const verifiedUser = await base44.asServiceRole.entities.User.get(userId);

    return Response.json({
      success: true,
      userId,
      user_type_applied: user_type,
      verified_user_type: verifiedUser?.user_type
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});