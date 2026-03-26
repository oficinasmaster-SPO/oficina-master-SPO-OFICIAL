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

const ALLOWED_EVENTS = ['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED', 'PAYMENT_OVERDUE', 'PAYMENT_DELETED'];

Deno.serve(async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });

  try {
    const signature = req.headers.get('asaas-signature');
    const secret = Deno.env.get('ASAAS_WEBHOOK_SECRET');

    const bodyText = await req.text();

    // 1. Validação obrigatória da assinatura HMAC SHA-256 antes de qualquer processamento
    if (!await verifyHmacSignature(bodyText, signature, secret)) {
      console.warn("⚠️ Invalid webhook signature");
      return Response.json({ error: 'Unauthorized: Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(bodyText);
    const { event, payment } = payload;

    // 2. Validação da estrutura mínima
    if (!payment || !payment.id || !event) {
      return Response.json({ error: 'Bad Request: Invalid payload structure' }, { status: 400 });
    }

    // 3. Validação de eventos permitidos
    if (!ALLOWED_EVENTS.includes(event)) {
      return Response.json({ success: true, message: 'Event ignored' }, { status: 200 });
    }

    // 4. Proteção contra Replay Attacks
    const eventId = payment.id + '_' + event;
    if (isReplay(eventId)) {
      return Response.json({ success: true, message: 'Webhook already processed' }, { status: 200 });
    }

    // 5. Instanciar SDK com Service Role SOMENTE após validação de segurança aprovada
    const base44 = createClientFromRequest(req);
    
    const contracts = await base44.asServiceRole.entities.Contract.filter({
      asas_payment_id: payment.id
    });

    if (!contracts || contracts.length === 0) {
      return Response.json({ success: true, message: 'Contract not found' });
    }

    const contract = contracts[0];
    const timeline = contract.timeline || [];

    let updateData = { timeline };

    switch (event) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED':
        updateData.payment_confirmed = true;
        updateData.payment_at = new Date().toISOString();
        updateData.status = 'pagamento_confirmado';
        updateData.completion_percentage = 100;
        
        timeline.push({
          date: new Date().toISOString(),
          action: 'Pagamento confirmado',
          description: `Pagamento confirmado via ASAS - R$ ${payment.value}`,
          user: 'Sistema'
        });
        break;

      case 'PAYMENT_OVERDUE':
        timeline.push({
          date: new Date().toISOString(),
          action: 'Pagamento atrasado',
          description: 'Pagamento em atraso',
          user: 'Sistema'
        });
        break;

      case 'PAYMENT_DELETED':
        updateData.status = 'cancelado';
        timeline.push({
          date: new Date().toISOString(),
          action: 'Pagamento cancelado',
          description: 'Pagamento cancelado',
          user: 'Sistema'
        });
        break;
    }

    await base44.asServiceRole.entities.Contract.update(contract.id, updateData);

    return Response.json({ success: true, message: 'Webhook processed successfully' });

  } catch (error) {
    console.error('Error processing ASAS webhook:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
});