import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Falha ao conectar com Google Calendar');
    }

    const calendar = await response.json();

    return Response.json({
      success,
      calendar_name.summary,
      calendar_id.id,
    });

  } catch (error) {
    console.error('Erro ao testar conexão:', error);
    return Response.json({ 
      success, 
      error.message 
    }, { status: 500 });
  }
});
