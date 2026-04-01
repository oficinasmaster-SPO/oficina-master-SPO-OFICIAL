import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

globalThis.Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    await base44.asServiceRole.entities.IntegrationUsageLog.create({
      function_name: body.function_name,
      provider: body.provider,
      workshop_id: body.workshop_id || null,
      user_id: body.user_id || null,
      request_kind: body.request_kind || null,
      estimated_units: body.estimated_units ?? 1,
      prompt_tokens: body.prompt_tokens ?? null,
      completion_tokens: body.completion_tokens ?? null,
      total_tokens: body.total_tokens ?? null,
      success: body.success ?? true
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});