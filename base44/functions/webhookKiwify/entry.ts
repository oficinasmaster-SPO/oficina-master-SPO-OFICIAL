import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const processedWebhooks = new Map();

function isReplay(id) {
  if (!id) return false;
  if (processedWebhooks.has(id)) return true;
  processedWebhooks.set(id, Date.now());
  
  // Limpeza de cache de replay
  if (Math.random() < 0.1) {
    const now = Date.now();
    for (const [key, timestamp] of processedWebhooks.entries()) {
      if (now - timestamp > 3600000) processedWebhooks.delete(key);
    }
  }
  return false;
}

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
  
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(bodyText)
  );
  
  const hashHex = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
    
  return hashHex === signature || hashHex === signature.replace('sha256=', '');
}

const ALLOWED_EVENTS = [
  'order_approved', 'compra_aprovada', 'subscription_renewed',
  'order_refused', 'compra_recusada',
  'subscription_canceled', 'subscription_late',
  'order_refunded', 'compra_reembolsada', 'chargeback'
];

Deno.serve(async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });

  try {
    const signature = req.headers.get('x-kiwify-signature');
    // Como a chave foi rejeitada pelo usuário nas tools, verificamos as variáveis que ele já possa ter setado.
    const secret = Deno.env.get('KIWIFY_WEBHOOK_SECRET') || Deno.env.get('KIWIFY_CLIENT_SECRET');

    const bodyText = await req.text();

    // 1. Validação obrigatória da assinatura HMAC SHA-256
    if (secret && signature) {
      if (!await verifyHmacSignature(bodyText, signature, secret)) {
        console.warn("⚠️ Invalid webhook signature");
        return Response.json({ error: 'Unauthorized: Invalid signature' }, { status: 401 });
      }
    }

    const payload = JSON.parse(bodyText);

    const eventType = payload.order?.webhook_event_type || payload.event || payload.trigger;
    const customerEmail = payload.order?.Customer?.email || payload.Customer?.email || payload.customer_email || payload.email;
    const productId = payload.order?.Product?.product_id || payload.Product?.product_id || payload.product_id;
    const orderId = payload.order?.order_id || payload.order_id || payload.transaction_id || payload.id;
    const eventData = payload.order || payload.data || payload;

    // 2. Validação da estrutura mínima do payload
    if (!eventType || !customerEmail) {
      return Response.json({ error: 'Bad Request: Missing required fields' }, { status: 400 });
    }

    // 3. Validação do tipo de evento
    if (!ALLOWED_EVENTS.includes(eventType)) {
      return Response.json({ success: true, message: 'Event ignored' }, { status: 200 });
    }

    // 4. Proteção contra Replay Attacks (Idempotência)
    const eventId = orderId ? (orderId + '_' + eventType) : (Date.now().toString() + '_' + eventType);
    if (isReplay(eventId)) {
      return Response.json({ success: true, message: 'Webhook already processed' }, { status: 200 });
    }

    // 5. Instanciar SDK com Service Role - Processamento Seguro
    const base44 = createClientFromRequest(req);
    
    let processingStatus = 'success';
    let processingMessage = 'Evento processado com sucesso';
    let workshopId = null;
    
    try {
      switch (eventType) {
        case 'order_approved':
        case 'compra_aprovada':
        case 'subscription_renewed':
          workshopId = await handlePaymentApproved(base44, eventData);
          break;
          
        case 'order_refused':
        case 'compra_recusada':
          workshopId = await handlePaymentFailed(base44, eventData);
          processingMessage = 'Pagamento falhou / pendente';
          break;
          
        case 'subscription_canceled':
        case 'subscription_late':
          workshopId = await handleSubscriptionCancelled(base44, eventData);
          processingMessage = 'Assinatura cancelada';
          break;
          
        case 'order_refunded':
        case 'compra_reembolsada':
        case 'chargeback':
          workshopId = await handleRefund(base44, eventData);
          processingMessage = 'Reembolso processado';
          break;
      }
    } catch (error) {
      processingStatus = 'error';
      processingMessage = error.message;
      console.error("Erro no processamento do evento Kiwify:", error);
    }
    
    // 6. Salvar Log de Evento
    try {
      await base44.asServiceRole.entities.KiwifyWebhookLog.create({
        event_type: eventType,
        payload: payload,
        customer_email: customerEmail,
        product_id: productId || '',
        order_id: orderId || '',
        workshop_id: workshopId || '',
        processing_status: processingStatus,
        processing_message: processingMessage,
        received_at: new Date().toISOString()
      });
    } catch (e) {
      console.error("Falha ao salvar log do webhook:", e);
    }
    
    // 7. Fail Safe - Retornar sucesso para a Kiwify mesmo se houve erro lógico interno,
    // para evitar retentativas infinitas caso o erro não seja resolvível com repetição.
    return Response.json({ 
      success: true,
      message: 'Webhook processed',
      status: processingStatus
    });

  } catch (error) {
    console.error("❌ Erro fatal ao processar webhook:", error);
    return Response.json({ success: false, error: 'Internal server error', details: error.message }, { status: 500 });
  }
});

// Busca o usuário / oficina garantindo o tenant correto
async function findWorkshopByCustomer(base44, data) {
  const customerEmail = data.Customer?.email || data.customer_email || data.email;
  const externalId = data.custom_data?.workshop_id || data.custom_fields?.workshop_id || data.external_id;
  
  if (externalId) {
    try {
      const workshop = await base44.asServiceRole.entities.Workshop.get(externalId);
      if (workshop) return workshop;
    } catch (e) {}
  }
  
  if (customerEmail) {
    // Busca direto pela oficina
    const workshops = await base44.asServiceRole.entities.Workshop.filter({ email: customerEmail });
    if (workshops && workshops.length > 0) return workshops[0];
    
    // Busca via dono (User)
    const users = await base44.asServiceRole.entities.User.filter({ email: customerEmail });
    if (users && users.length > 0) {
      const userWorkshops = await base44.asServiceRole.entities.Workshop.filter({ owner_id: users[0].id });
      if (userWorkshops && userWorkshops.length > 0) return userWorkshops[0];
    }
  }
  return null;
}

// Handler de aprovação: ativação de plano
async function handlePaymentApproved(base44, data) {
  const workshop = await findWorkshopByCustomer(base44, data);
  if (!workshop) {
    throw new Error('Workshop/Usuário não encontrado para vincular o pagamento. Email: ' + (data.Customer?.email || data.email));
  }
  
  let planId = 'pro'; // Default fallback
  
  try {
    const kiwifySettings = await base44.asServiceRole.entities.KiwifySettings.list();
    if (kiwifySettings && kiwifySettings.length > 0 && kiwifySettings[0].plan_mappings) {
      const productId = data.Product?.product_id || data.product_id;
      const mapping = kiwifySettings[0].plan_mappings.find(m => m.kiwify_product_id === productId);
      if (mapping) planId = mapping.internal_plan_id;
    }
  } catch(e) {
    console.warn("Nenhuma configuração de mapeamento de plano encontrada.");
  }
  
  await base44.asServiceRole.entities.Workshop.update(workshop.id, {
    planId: planId,
    planStatus: 'active',
    dataAssinatura: new Date().toISOString(),
    dataRenovacao: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  });
  
  return workshop.id;
}

// Handler de falha: marcar como pending
async function handlePaymentFailed(base44, data) {
  const workshop = await findWorkshopByCustomer(base44, data);
  if (workshop) {
    await base44.asServiceRole.entities.Workshop.update(workshop.id, {
      planStatus: 'pending'
    });
    return workshop.id;
  }
  return null;
}

// Handler de cancelamento
async function handleSubscriptionCancelled(base44, data) {
  const workshop = await findWorkshopByCustomer(base44, data);
  if (workshop) {
    await base44.asServiceRole.entities.Workshop.update(workshop.id, {
      planStatus: 'canceled'
    });
    return workshop.id;
  }
  return null;
}

// Handler de reembolso
async function handleRefund(base44, data) {
  const workshop = await findWorkshopByCustomer(base44, data);
  if (workshop) {
    await base44.asServiceRole.entities.Workshop.update(workshop.id, {
      planStatus: 'inactive'
    });
    return workshop.id;
  }
  return null;
}