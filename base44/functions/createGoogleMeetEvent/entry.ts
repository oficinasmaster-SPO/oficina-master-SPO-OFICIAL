import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { summary, description, startDateTime, endDateTime, attendees } = await req.json();

    if (!summary || !startDateTime || !endDateTime) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get OAuth token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken("googlecalendar");

    // Create Google Calendar event with Meet
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
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 30 },
        ],
      },
    };

    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return Response.json({ error: 'Failed to create event', details: error }, { status: 500 });
    }

    const createdEvent = await response.json();

    return Response.json({
      success: true,
      eventId: createdEvent.id,
      meetLink: createdEvent.hangoutLink,
      htmlLink: createdEvent.htmlLink,
    });
  } catch (error) {
    console.error('Error creating Google Meet event:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});