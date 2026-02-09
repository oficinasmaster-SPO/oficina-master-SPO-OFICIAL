import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { invite_token, answers, type, profile_scores, dominant_profile, maturity_level, maturity_scores } = body;

    if (!invite_token) {
      return Response.json({ error: 'Token required' }, { status: 400 });
    }

    // Use service role
    const invites = await base44.asServiceRole.entities.DiagnosticInvite.filter({ invite_token });
    
    if (!invites || invites.length === 0) {
      return Response.json({ error: 'Invalid token' }, { status: 404 });
    }

    const invite = invites[0];

    if (invite.status === 'completed') {
      return Response.json({ error: 'Already completed' }, { status: 400 });
    }

    // Create the diagnostic record
    if (type === 'DISC') {
      await base44.asServiceRole.entities.DISCDiagnostic.create({
        workshop_id.workshop_id,
        employee_id.employee_id,
        candidate_name.candidate_name,
        evaluator_id, // Self evaluation
        evaluation_type: 'self',
        invite_id.id,
        answers,
        profile_scores,
        dominant_profile,
        recommended_roles: [], // Auto-calc logic could be here or frontend only
        completed
      });
    } else if (type === 'MATURITY') {
      await base44.asServiceRole.entities.CollaboratorMaturityDiagnostic.create({
        workshop_id.workshop_id,
        employee_id.employee_id,
        candidate_name.candidate_name,
        evaluator_id,
        evaluation_type: 'self',
        invite_id.id,
        answers,
        maturity_level,
        maturity_scores,
        completed
      });
    }

    // Update invite status
    await base44.asServiceRole.entities.DiagnosticInvite.update(invite.id, {
      status: 'completed'
    });

    return Response.json({ success });

  } catch (error) {
    return Response.json({ error.message }, { status: 500 });
  }
});
