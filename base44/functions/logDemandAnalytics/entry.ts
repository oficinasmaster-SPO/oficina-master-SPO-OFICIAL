import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      eventType, // 'demand_alert_shown' | 'checkpoint_decision_made' | 'demand_clicked'
      data // event-specific data
    } = await req.json();

    if (!eventType || !data) {
      return Response.json({ error: 'Missing eventType or data' }, { status: 400 });
    }

    // Estrutura do evento
    const event = {
      user_id: user.id,
      user_email: user.email,
      event_type: eventType,
      timestamp: new Date().toISOString(),
      data
    };

    // Log em memória/console (em produção seria enviar para analytics service)
    console.log('📊 DEMAND ANALYTICS EVENT:', JSON.stringify(event, null, 2));

    // Opcional: salvar em entidade se necessário
    // await base44.entities.DemandAnalyticsLog.create(event);

    return Response.json({ success: true, logged: event });
  } catch (error) {
    console.error('Error in logDemandAnalytics:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});