import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const { summary, description, startDateTime, endDateTime, attendees } = body;

    console.log("createGoogleMeetEvent called:", { summary, startDateTime, endDateTime });

    if (!summary || !startDateTime || !endDateTime) {
      return Response.json({ error: 'Missing required fields: summary, startDateTime, endDateTime' }, { status: 400 });
    }

    // Get OAuth token via shared connector
    const connection = await base44.asServiceRole.connectors.getConnection("googlecalendar");
    const { accessToken } = connection;

    console.log("Token length:", accessToken?.length, "Token prefix:", accessToken?.substring(0, 20));

    if (!accessToken) {
      return Response.json({ error: 'Google Calendar não está conectado. Reconecte a integração.' }, { status: 503 });
    }

    const event = {
      summary,
      description: description || '',
      start: {
        dateTime: startDateTime,
        timeZone: 'America/Sao_Paulo',
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'America/Sao_Paulo',
      },
      attendees: Array.isArray(attendees) ? attendees.map(email => ({ email })) : [],
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

    const responseText = await response.text();
    let createdEvent;
    try {
      createdEvent = JSON.parse(responseText);
    } catch {
      return Response.json({ error: 'Invalid response from Google', details: responseText }, { status: 500 });
    }

    if (!response.ok) {
      console.error('Google Calendar API error:', createdEvent);
      return Response.json({ error: 'Failed to create event', details: createdEvent }, { status: 500 });
    }

    console.log("Event created:", createdEvent.id, "Meet:", createdEvent.hangoutLink);

    return Response.json({
      success: true,
      eventId: createdEvent.id,
      meetLink: createdEvent.hangoutLink,
      htmlLink: createdEvent.htmlLink,
      calendarLink: createdEvent.htmlLink,
    });

  } catch (error) {
    console.error('Error creating Google Meet event:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});