import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { gateway, payload, headers } = body;

    if (gateway === 'stripe') {
      return await handleStripeWebhook(base44, payload, headers);
    } else if (gateway === 'mercadopago') {
      return await handleMercadoPagoWebhook(base44, payload);
    } else if (gateway === 'pagarme') {
      return await handlePagarMeWebhook(base44, payload);
    }

    return Response.json({ success: false, error: 'Gateway não suportado' });
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    return Response.json({ success: false, error: 'Erro interno no servidor' }, { status: 500 });
  }
});

async function handleStripeWebhook(base44, payload, headers) {
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));
  const sig = headers['stripe-signature'];
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, sig, webhookSecret);
  } catch (err) {
    throw new Error(`Webhook signature verification failed: ${err.message}`);
  }

  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentSuccess(base44, event.data.object, 'stripe');
      break;
    case 'payment_intent.payment_failed':
      await handlePaymentFailed(base44, event.data.object, 'stripe');
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return Response.json({ success: true });
}

async function handleMercadoPagoWebhook(base44, payload) {
  return Response.json({ success: true });
}

async function handlePagarMeWebhook(base44, payload) {
  return Response.json({ success: true });
}

async function handlePaymentSuccess(base44, paymentData, gateway) {
  const transactionId = paymentData.id;
  const payments = await base44.asServiceRole.entities.PaymentHistory.filter({ transaction_id: transactionId });

  if (payments.length > 0) {
    await base44.asServiceRole.entities.PaymentHistory.update(payments[0].id, {
      payment_status: 'approved',
      metadata: paymentData
    });
  }
}

async function handlePaymentFailed(base44, paymentData, gateway) {
  const transactionId = paymentData.id;
  const payments = await base44.asServiceRole.entities.PaymentHistory.filter({ transaction_id: transactionId });

  if (payments.length > 0) {
    await base44.asServiceRole.entities.PaymentHistory.update(payments[0].id, {
      payment_status: 'failed',
      metadata: paymentData
    });
  }
}