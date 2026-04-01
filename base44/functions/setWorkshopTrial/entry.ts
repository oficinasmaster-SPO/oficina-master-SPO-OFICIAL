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

          const tokenSecret = Deno.env.get("KIWIFY_CLIENT_SECRET") || "fallback_token_for_tests";
          const planId = 'free';
          const planStatus = 'trial';

          // Gerar HMAC para proteger integridade do plano
          const encoder = new TextEncoder();
          const key = await crypto.subtle.importKey("raw", encoder.encode(tokenSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
          const hashBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(planId + workshopId + planStatus));
          const billing_secure_hash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
          
          await base44.asServiceRole.entities.Workshop.update(workshopId, {
            planStatus,
            trialEndsAt: trialEndsAt.toISOString(),
            planId,
            billing_secure_hash,
            billing_update_token: tokenSecret // necessário para passar pelo preventPlanBypass
          });
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error setting trial:", error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});