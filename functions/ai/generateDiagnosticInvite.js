import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Check authentication
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { workshop_id, employee_id, candidate_name, diagnostic_type } = body;

    if (!workshop_id || !diagnostic_type) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Generate unique token
    const invite_token = crypto.randomUUID();
    
    // Set expiration (e.g., 7 days)
    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + 7);

    // Create invite record
    const invite = await base44.entities.DiagnosticInvite.create({
      workshop_id,
      employee_id || null,
      candidate_name || null,
      diagnostic_type,
      invite_token,
      expires_at.toISOString(),
      status: 'pending'
    });

    // Determine the correct path based on type
    let path = '';
    if (diagnostic_type === 'DISC') {
      path = 'ResponderDISC';
    } else if (diagnostic_type === 'MATURITY') {
      path = 'ResponderMaturidade';
    }

    // Construct full URL (assuming standard base44 app URL structure or just returning path+token for frontend to construct)
    // Since we don't know the exact domain in backend easily, we return the token and the path.
    // The frontend will construct the full URL using window.location.origin.

    return Response.json({ 
      success, 
      invite_token,
      path,
      invite_id.id 
    });

  } catch (error) {
    return Response.json({ error.message }, { status: 500 });
  }
});
