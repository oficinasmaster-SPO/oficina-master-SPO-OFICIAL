import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const processedWebhooks = new Map();

function isReplay(id) {
  if (!id) return false;
  if (processedWebhooks.has(id)) return true;
  processedWebhooks.set(id, Date.now());
  
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
    const secret = Deno.env.get('KIWIFY_WEBHOOK_SECRET') || Deno.env.get('KIWIFY_CLIENT_SECRET');

    const bodyText = await req.text();

    // 1. Validação obrigatória da assinatura HMAC SHA-256 antes de qualquer processamento
    if (!await verifyHmacSignature(bodyText, signature, secret)) {
      console.warn("⚠️ Invalid webhook signature");
      return Response.json({ error: 'Unauthorized: Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(bodyText);

    const eventType = payload.order?.webhook_event_type || payload.event || payload.trigger;
    const customerEmail = payload.order?.Customer?.email || payload.Customer?.email || payload.customer_email;
    const productId = payload.order?.Product?.product_id || payload.Product?.product_id || payload.product_id;
    const orderId = payload.order?.order_id || payload.order_id || payload.transaction_id || payload.id;
    const eventData = payload.order || payload.data || payload;

    // 2. Validação da estrutura mínima do payload
    if (!orderId || !eventType || !customerEmail) {
      return Response.json({ error: 'Bad Request: Missing required fields' }, { status: 400 });
    }

    // 3. Validação do tipo de evento
    if (!ALLOWED_EVENTS.includes(eventType)) {
      return Response.json({ success: true, message: 'Event ignored' }, { status: 200 });
    }

    // 4. Proteção contra Replay Attacks
    const eventId = orderId + '_' + eventType;
    if (isReplay(eventId)) {
      return Response.json({ success: true, message: 'Webhook already processed' }, { status: 200 });
    }

    // 5. Instanciar SDK com Service Role SOMENTE após validação de segurança aprovada
    const base44 = createClientFromRequest(req);
    
    const kiwifySettings = await base44.asServiceRole.entities.KiwifySettings.list();
    const kiwifyConfig = kiwifySettings[0];
    
    if (!kiwifyConfig || !kiwifyConfig.is_active) {
      await base44.asServiceRole.entities.KiwifyWebhookLog.create({
        event_type: eventType,
        payload: payload,
        customer_email: customerEmail,
        product_id: productId,
        order_id: orderId,
        processing_status: 'warning',
        processing_message: 'Integração Kiwify não está ativa',
        received_at: new Date().toISOString()
      });
      return Response.json({ success: true, message: 'Integration not active' }, { status: 200 });
    }
    
    let processingStatus = 'success';
    let processingMessage = 'Evento processado com sucesso';
    let workshopId = null;
    
    try {
      switch (eventType) {
        case 'order_approved':
        case 'compra_aprovada':
        case 'subscription_renewed':
          workshopId = await handlePaymentApproved(base44, eventData, kiwifyConfig);
          break;
          
        case 'order_refused':
        case 'compra_recusada':
          await handlePaymentFailed(base44, eventData);
          processingMessage = 'Pagamento recusado registrado';
          break;
          
        case 'subscription_canceled':
        case 'subscription_late':
          await handleSubscriptionCancelled(base44, eventData);
          processingMessage = 'Assinatura cancelada';
          break;
          
        case 'order_refunded':
        case 'compra_reembolsada':
        case 'chargeback':
          await handleRefund(base44, eventData);
          processingMessage = 'Reembolso processado';
          break;
      }
    } catch (error) {
      processingStatus = 'error';
      processingMessage = error.message;
    }
    
    const logEntry = await base44.asServiceRole.entities.KiwifyWebhookLog.create({
      event_type: eventType,
      payload: payload,
      customer_email: customerEmail,
      product_id: productId,
      order_id: orderId,
      workshop_id: workshopId,
      processing_status: processingStatus,
      processing_message: processingMessage,
      received_at: new Date().toISOString()
    });
    
    return Response.json({ 
      success: true,
      message: 'Webhook processed successfully',
      status: processingStatus,
      log_id: logEntry.id
    });

  } catch (error) {
    console.error("❌ Erro ao processar webhook:", error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
});

async function handlePaymentApproved(base44, data, kiwifyConfig) {
  const customerEmail = data.Customer?.email || data.customer_email;
  const productId = data.Product?.product_id || data.product_id;
  const orderAmount = data.Commissions?.charge_amount || data.order_amount || data.amount || 0;
  const customData = data.custom_data || data.custom_fields || {};
  
  const mapping = kiwifyConfig.plan_mappings?.find(m => m.kiwify_product_id === productId);
  if (!mapping) return;
  
  const planId = mapping.internal_plan_id;
  
  let workshop = null;
  if (customData?.workshop_id) {
    const workshops = await base44.asServiceRole.entities.Workshop.list();
    workshop = workshops.find(w => w.id === customData.workshop_id);
  }
  
  if (!workshop) {
    const workshops = await base44.asServiceRole.entities.Workshop.list();
    workshop = workshops.find(w => w.email === customerEmail);
  }
  
  if (!workshop) {
    const users = await base44.asServiceRole.entities.User.list();
    const user = users.find(u => u.email === customerEmail);
    if (user) {
      const workshops = await base44.asServiceRole.entities.Workshop.list();
      workshop = workshops.find(w => w.owner_id === user.id);
    }
  }
  
  if (!workshop) return;
  
  await base44.asServiceRole.entities.Workshop.update(workshop.id, {
    planoAtual: planId,
    dataAssinatura: new Date().toISOString(),
    dataRenovacao: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  });
  
  await base44.asServiceRole.entities.PaymentHistory.create({
    workshop_id: workshop.id,
    plan_id: planId,
    payment_provider: 'kiwify',
    payment_status: 'approved',
    amount: orderAmount / 100,
    transaction_id: data.order_id || data.transaction_id || data.id,
    payment_date: data.approved_date || new Date().toISOString(),
    metadata: data
  });
  
  return workshop.id;
}

async function handleRefund(base44, data) {
  const customerEmail = data.Customer?.email || data.customer_email;
  const workshops = await base44.asServiceRole.entities.Workshop.list();
  const workshop = workshops.find(w => w.email === customerEmail);
  
  if (workshop) {
    await base44.asServiceRole.entities.Workshop.update(workshop.id, {
      planoAtual: 'FREE',
      dataAssinatura: new Date().toISOString()
    });
    
    await base44.asServiceRole.entities.PaymentHistory.create({
      workshop_id: workshop.id,
      payment_provider: 'kiwify',
      payment_status: 'refunded',
      transaction_id: data.order_id || data.transaction_id,
      payment_date: new Date().toISOString(),
      metadata: data
    });
  }
}

async function handlePaymentFailed(base44, data) {
  const customerEmail = data.Customer?.email || data.customer_email;
  const transactionId = data.order_id || data.transaction_id;
  const workshops = await base44.asServiceRole.entities.Workshop.list();
  const workshop = workshops.find(w => w.email === customerEmail);
  
  if (workshop) {
    await base44.asServiceRole.entities.PaymentHistory.create({
      workshop_id: workshop.id,
      payment_provider: 'kiwify',
      payment_status: 'failed',
      transaction_id: transactionId,
      payment_date: new Date().toISOString(),
      metadata: data
    });
  }
}

async function handleSubscriptionCancelled(base44, data) {
  const customerEmail = data.Customer?.email || data.customer_email;
  const workshops = await base44.asServiceRole.entities.Workshop.list();
  const workshop = workshops.find(w => w.email === customerEmail);
  
  if (workshop) {
    await base44.asServiceRole.entities.Workshop.update(workshop.id, {
      planoAtual: 'FREE',
      dataAssinatura: new Date().toISOString()
    });
  }
}