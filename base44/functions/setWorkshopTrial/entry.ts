import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    
    const { event, data } = body;
    
    if (event.type === 'create' && event.entity_name === 'Workshop') {
      const workshopId = event.entity_id;
      
      if (!data || !data.trialEndsAt) {
          const trialEndsAt = new Date();
          trialEndsAt.setDate(trialEndsAt.getDate() + 14); // 14 dias de trial
          
          await base44.asServiceRole.entities.Workshop.update(workshopId, {
            planStatus: 'trial',
            trialEndsAt: trialEndsAt.toISOString(),
            planId: 'free'
          });
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error setting trial:", error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});