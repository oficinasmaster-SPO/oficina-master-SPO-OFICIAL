import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Cache para idempotência
const processedWebhooks = new Map();

function isReplay(id) {
  if (!id) return false;
  if (processedWebhooks.has(id)) return true;
  processedWebhooks.set(id, Date.now());
  
  // Limpeza de cache
  if (Math.random() < 0.1) {
    const now = Date.now();
    for (const [key, timestamp] of processedWebhooks.entries()) {
      if (now - timestamp > 3600000) processedWebhooks.delete(key);
    }
  }
  return false;
}

// Verificação segura de assinatura HMAC SHA-256
async function verifyHmacSignature(bodyText, signature, secret) {
  if (!signature || !secret) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(bodyText));
  const hashHex = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return hashHex === signature || hashHex === signature.replace('sha256=', '');
}

// Mapeamento de produtos Kiwify para planos internos
const planMap = {
  "produto_pro": "pro",
  "produto_elite": "elite",
  // Fallbacks de segurança para produtos reais
  "pro": "pro",
  "elite": "elite"
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });

  try {
    // 1. Validar assinatura
    const signature = req.headers.get('x-kiwify-signature');
    const secret = Deno.env.get('KIWIFY_CLIENT_SECRET') || Deno.env.get('KIWIFY_WEBHOOK_SECRET');
    const bodyText = await req.text();

    if (secret) {
      if (!signature) {
        console.warn("⚠️ Tentativa de webhook sem assinatura");
        return Response.json({ error: 'Invalid signature' }, { status: 403 });
      }
      const isValid = await verifyHmacSignature(bodyText, signature, secret);
      if (!isValid) {
        console.warn("⚠️ Tentativa de webhook com assinatura inválida");
        return Response.json({ error: 'Invalid signature' }, { status: 403 });
      }
    }

    const payload = JSON.parse(bodyText);

    // 2. Validar payload
    const email = payload.order?.Customer?.email || payload.Customer?.email || payload.email;
    const produto = payload.order?.Product?.product_id || payload.Product?.product_id || payload.product_id || payload.produto;
    // Kiwify envia eventos em diferentes formatos, normalizamos o status
    const eventType = payload.order?.webhook_event_type || payload.event || payload.trigger || payload.status;
    const orderId = payload.order?.order_id || payload.order_id || payload.id;

    if (!email) {
      return Response.json({ error: 'Bad Request: Missing required email' }, { status: 400 });
    }

    // 3. Idempotência
    const eventId = orderId ? `${orderId}_${eventType}` : `${Date.now()}_${eventType}`;
    if (isReplay(eventId)) {
      return Response.json({ success: true, message: 'Event already processed' }, { status: 200 });
    }

    const base44 = createClientFromRequest(req);
    
    let processingStatus = 'success';
    let processingMessage = 'Webhook processado com sucesso';
    let workshopId = null;
    
    try {
      // 4. Buscar usuário/workshop
      let workshop = null;
      const workshopsByEmail = await base44.asServiceRole.entities.Workshop.filter({ email: email });
      if (workshopsByEmail && workshopsByEmail.length > 0) {
        workshop = workshopsByEmail[0];
      } else {
        const users = await base44.asServiceRole.entities.User.filter({ email: email });
        if (users && users.length > 0) {
          const userWorkshops = await base44.asServiceRole.entities.Workshop.filter({ owner_id: users[0].id });
          if (userWorkshops && userWorkshops.length > 0) {
            workshop = userWorkshops[0];
          }
        }
      }

      if (workshop) {
        workshopId = workshop.id;

        // Se plan_source = 'admin', NÃO sobrescrever
        if (workshop.plan_source === 'admin') {
          await base44.asServiceRole.entities.KiwifyWebhookLog.create({
            event_type: eventType || 'unknown',
            payload: payload,
            customer_email: email,
            product_id: produto || '',
            order_id: orderId || '',
            workshop_id: workshopId || '',
            processing_status: 'ignored',
            processing_message: 'Webhook ignorado: plano gerenciado manualmente pelo admin',
            received_at: new Date().toISOString()
          });
          return Response.json({ success: true, message: 'Plan is managed by admin, webhook ignored' }, { status: 200 });
        }
        
        // 5. Mapear produto → plano
        // Se o produto não estiver no mapa, tenta pegar da config dinâmica do banco, se não fallback para 'pro'
        let mappedPlan = planMap[produto];
        
        if (!mappedPlan) {
          try {
            const kiwifySettings = await base44.asServiceRole.entities.KiwifySettings.list();
            if (kiwifySettings && kiwifySettings.length > 0 && kiwifySettings[0].plan_mappings) {
              const mapping = kiwifySettings[0].plan_mappings.find(m => m.kiwify_product_id === produto);
              if (mapping) mappedPlan = mapping.internal_plan_id;
            }
          } catch(e) {}
          mappedPlan = mappedPlan || 'pro'; 
        }
        
        // 6. Atualizar status (paid = active, anything else that indicates cancellation = inactive)
        const activeEvents = ['paid', 'approved', 'order_approved', 'compra_aprovada', 'subscription_renewed'];
        const inactiveEvents = ['refunded', 'order_refunded', 'compra_reembolsada', 'chargeback', 'subscription_canceled', 'canceled'];
        
        let planStatus = workshop.planStatus; // default to current
        if (activeEvents.includes(eventType)) {
          planStatus = 'active';
        } else if (inactiveEvents.includes(eventType)) {
          planStatus = 'inactive';
        }

        // Assinatura segura para garantir que o plano não foi alterado pelo frontend
        const tokenSecret = Deno.env.get("KIWIFY_CLIENT_SECRET") || "fallback_token_for_tests";
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey("raw", encoder.encode(tokenSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
        const hashBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(mappedPlan + workshop.id + planStatus));
        const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

        // Atualizar usuário/oficina de forma segura
        await base44.asServiceRole.entities.Workshop.update(workshop.id, {
          planId: mappedPlan,
          planStatus: planStatus,
          dataAssinatura: planStatus === 'active' ? new Date().toISOString() : workshop.dataAssinatura,
          billing_secure_hash: hashHex,
          billing_update_token: tokenSecret
        });
        
        processingMessage = `Oficina atualizada: Plano = ${mappedPlan}, Status = ${planStatus}`;
      } else {
        processingStatus = 'error';
        processingMessage = `Workshop não encontrado para o email: ${email}`;
      }
    } catch (err) {
      processingStatus = 'error';
      processingMessage = err.message;
    }
    
    // 7. Logar tudo (tentativas, falhas, sucessos)
    try {
      await base44.asServiceRole.entities.KiwifyWebhookLog.create({
        event_type: eventType || 'unknown',
        payload: payload,
        customer_email: email,
        product_id: produto || '',
        order_id: orderId || '',
        workshop_id: workshopId || '',
        processing_status: processingStatus,
        processing_message: processingMessage,
        received_at: new Date().toISOString()
      });
    } catch (e) {
      console.error("Falha ao salvar log do webhook:", e);
    }

    return Response.json({ success: true, status: processingStatus, message: processingMessage }, { status: 200 });

  } catch (error) {
    console.error("Erro fatal no webhook:", error);
    return Response.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
});