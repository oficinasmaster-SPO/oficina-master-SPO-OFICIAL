import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const headers = {};
    req.headers.forEach((v, k) => { headers[k] = v; });
    
    // Check if token exists in req
    const authHeader = req.headers.get('authorization');
    
    return Response.json({
      auth_header: authHeader,
      all_headers: headers
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});