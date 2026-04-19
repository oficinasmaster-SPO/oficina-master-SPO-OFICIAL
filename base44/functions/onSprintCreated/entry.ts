import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    if (!data?.id) {
      return Response.json({ error: 'Missing sprint data' }, { status: 400 });
    }

    // Small delay to ensure entity is fully persisted before updating
    await new Promise(resolve => setTimeout(resolve, 500));

    // Auto-transition pending → in_progress on creation
    // Re-fetch to get the latest status in case it was already changed
    const current = await base44.asServiceRole.entities.ConsultoriaSprint.get(data.id);
    if (current?.status === 'pending') {
      await base44.asServiceRole.entities.ConsultoriaSprint.update(data.id, {
        status: 'in_progress',
        last_activity_date: new Date().toISOString(),
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});