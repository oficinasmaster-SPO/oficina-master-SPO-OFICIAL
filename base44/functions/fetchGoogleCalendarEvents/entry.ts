import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { date } = await req.json();
    const selectedDate = date ? new Date(date) : new Date();

    // Buscar eventos da semana inteira
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Domingo
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 7);
    endOfWeek.setHours(23, 59, 59, 999);

    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      `timeMin=${startOfWeek.toISOString()}&timeMax=${endOfWeek.toISOString()}&` +
      `singleEvents=true&orderBy=startTime&maxResults=250`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Falha ao buscar eventos do Google Calendar');
    }

    const data = await response.json();
    const events = data.items || [];

    return Response.json({
      success: true,
      events,
      count: events.length
    });

  } catch (error) {
    console.error('Erro ao buscar eventos:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});