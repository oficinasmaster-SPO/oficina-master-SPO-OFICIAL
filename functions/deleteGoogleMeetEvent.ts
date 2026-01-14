import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId } = await req.json();

    if (!eventId) {
      return Response.json({ error: 'Event ID is required' }, { status: 400 });
    }

    const accessToken = await base44.asServiceRole.connectors.getAccessToken("googlecalendar");

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok && response.status !== 204) {
      const error = await response.text();
      return Response.json({ error: 'Failed to delete event', details: error }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting Google Meet event:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});