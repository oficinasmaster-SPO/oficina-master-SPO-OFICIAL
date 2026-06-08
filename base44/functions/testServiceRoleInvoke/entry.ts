import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Hardcode the base URL to bypass the Host header issue just for this test
    const appBaseUrl = `https://${Deno.env.get('BASE44_APP_ID')}.base44.app`;
    
    // We will do a manual fetch using the service role key
    const response = await fetch(`${appBaseUrl}/api/functions/autoAssignProfile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-base44-key': Deno.env.get('BASE44_SERVICE_ROLE_KEY')
      },
      body: JSON.stringify({
        employee_id: "test",
        job_role: "test"
      })
    });

    const data = await response.json();
    
    return Response.json({
      status: response.status,
      data: data
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});