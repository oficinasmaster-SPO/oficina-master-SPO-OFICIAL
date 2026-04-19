import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    if (!data?.id) {
      return Response.json({ error: 'Missing sprint data' }, { status: 400 });
    }

    // Auto-transition pending → in_progress on creation
    if (data.status === 'pending') {
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