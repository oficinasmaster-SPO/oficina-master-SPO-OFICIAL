import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token } = await req.json();

    if (!token) {
      return Response.json({ error: 'Token is required' }, { status: 400 });
    }

    // Use service role to bypass RLS for public validation
    const invites = await base44.asServiceRole.entities.DiagnosticInvite.filter({ 
      invite_token: token 
    });

    if (!invites || invites.length === 0) {
      return Response.json({ valid: false, error: 'Invalid token' }, { status: 404 });
    }

    const invite = invites[0];

    // Check expiration
    if (new Date(invite.expires_at) < new Date()) {
      return Response.json({ valid: false, error: 'Token expired' }, { status: 400 });
    }

    if (invite.status === 'completed') {
      return Response.json({ valid: false, error: 'Invite already used' }, { status: 400 });
    }

    return Response.json({ valid: true, invite });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});