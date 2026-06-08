import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Method 1: standard invoke
    let result1 = null;
    let status1 = null;
    try {
      const res1 = await base44.functions.invoke('debugFunctionContext', {});
      result1 = res1.data;
      status1 = res1.status;
    } catch (e) {
      status1 = e.response ? e.response.status : 500;
      result1 = e.response ? e.response.data : e.message;
    }

    // Method 2: service role invoke
    let result2 = null;
    let status2 = null;
    try {
      const res2 = await base44.asServiceRole.functions.invoke('debugFunctionContext', {});
      result2 = res2.data;
      status2 = res2.status;
    } catch (e) {
      status2 = e.response ? e.response.status : 500;
      result2 = e.response ? e.response.data : e.message;
    }

    return Response.json({
      method1: { status: status1, result: result1 },
      method2: { status: status2, result: result2 }
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});