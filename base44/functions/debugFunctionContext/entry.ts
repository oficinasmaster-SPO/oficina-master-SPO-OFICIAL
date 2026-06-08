import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let authMe = null;
    let authError = null;
    
    try {
      authMe = await base44.auth.me();
    } catch (e) {
      authError = e.message;
    }

    // Capture headers
    const headers = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });

    return Response.json({
      auth_me: authMe,
      auth_error: authError,
      headers: headers,
      service_role_detected: !!headers['x-base44-key'] || !!headers['x-base44-service-role'],
      url: req.url
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});