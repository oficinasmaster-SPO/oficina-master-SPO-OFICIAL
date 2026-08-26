import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  try {
    await base44.asServiceRole.entities.User.update('6a8ecc34809d9dd3600f5450', {
      role: 'admin',
      user_type: 'internal',
      consulting_firm_id: '69bab264d7c3fe5d367c3959'
    });
    const u = await base44.asServiceRole.entities.User.get('6a8ecc34809d9dd3600f5450');
    return Response.json({ ok: true, role: u.role, user_type: u.user_type });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});
