import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId, summary, description, startDateTime, endDateTime, attendees } = await req.json();

    if (!eventId) {
      return Response.json({ error: 'Event ID is required' }, { status: 400 });
    }

    const accessToken = await base44.asServiceRole.connectors.getAccessToken("googlecalendar");

    const event = {
      summary,
      description,
      start: {
        dateTime: startDateTime,
        timeZone: 'America/Sao_Paulo',
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'America/Sao_Paulo',
      },
      attendees: attendees?.map(email => ({ email })) || [],
    };

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return Response.json({ error: 'Failed to update event', details: error }, { status: 500 });
    }

    const updatedEvent = await response.json();

    return Response.json({
      success: true,
      eventId: updatedEvent.id,
      meetLink: updatedEvent.hangoutLink,
      htmlLink: updatedEvent.htmlLink,
    });
  } catch (error) {
    console.error('Error updating Google Meet event:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});