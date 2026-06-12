import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const targetUsers = await base44.asServiceRole.entities.User.filter({
      role: 'user',
      user_type: 'internal'
    });

    const errors = [];
    let updated = 0;

    for (const targetUser of targetUsers) {
      try {
        if (targetUser.role === 'admin') {
          continue;
        }

        await base44.asServiceRole.entities.User.update(targetUser.id, {
          user_type: 'external'
        });

        updated += 1;
      } catch (error) {
        errors.push({
          userId: targetUser.id,
          email: targetUser.email,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      total: targetUsers.length,
      updated,
      errors
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});