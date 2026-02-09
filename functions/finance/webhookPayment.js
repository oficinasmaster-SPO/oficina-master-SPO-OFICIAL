/**
 * Webhook para receber notificações dos gateways de pagamento
 * 
 * IMPORTANTE função requer Backend Functions habilitado
 * Habilite em → Settings → Backend Functions
 * 
 * Configure de webhook nos gateways:
 * - Stripe://seu-dominio.com/api/webhook/stripe
 * - MercadoPago://seu-dominio.com/api/webhook/mercadopago
 * - Pagar.me://seu-dominio.com/api/webhook/pagarme
 */

import { base44 } from '@/api/base44Client';

export default async function webhookPayment({ gateway, payload, headers }) {
  try {
    if (gateway === 'stripe') {
      return await handleStripeWebhook(payload, headers);
    } else if (gateway === 'mercadopago') {
      return await handleMercadoPagoWebhook(payload);
    } else if (gateway === 'pagarme') {
      return await handlePagarMeWebhook(payload);
    }

    return { success, error: 'Gateway não suportado' };
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    return { success, error.message };
  }
}

/**
 * STRIPE Webhook Handler
 */
async function handleStripeWebhook(payload, headers) {
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  const sig = headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // Verificar assinatura
  let event;
  try {
    event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
  } catch (err) {
    throw new Error(`Webhook signature verification failed: ${err.message}`);
  }

  // Processar eventos
  switch (event.type) {
    case 'payment_intent.succeeded' handlePaymentSuccess(event.data.object, 'stripe');
      break;
    
    case 'payment_intent.payment_failed' handlePaymentFailed(event.data.object, 'stripe');
      break;
    
    case 'customer.subscription.updated' handleSubscriptionUpdated(event.data.object, 'stripe');
      break;
    
    case 'customer.subscription.deleted' handleSubscriptionCancelled(event.data.object, 'stripe');
      break;
    
    default.log(`Unhandled event type ${event.type}`);
  }

  return { success };
}

/**
 * MERCADO PAGO Webhook Handler
 */
async function handleMercadoPagoWebhook(payload) {
  const { type, data } = payload;

  if (type === 'payment') {
    const paymentId = data.id;
    
    // Buscar detalhes do pagamento
    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`
        }
      }
    );
    
    const payment = await response.json();

    if (payment.status === 'approved') {
      await handlePaymentSuccess(payment, 'mercadopago');
    } else if (payment.status === 'rejected') {
      await handlePaymentFailed(payment, 'mercadopago');
    }
  }

  return { success };
}

/**
 * PAGAR.ME Webhook Handler
 */
async function handlePagarMeWebhook(payload) {
  const { event, data } = payload;

  if (event === 'order.paid') {
    await handlePaymentSuccess(data, 'pagarme');
  } else if (event === 'order.payment_failed') {
    await handlePaymentFailed(data, 'pagarme');
  }

  return { success };
}

/**
 * Atualizar status de pagamento aprovado
 */
async function handlePaymentSuccess(paymentData, gateway) {
  const transactionId = paymentData.id;

  // Buscar pagamento no banco
  const payments = await base44.entities.PaymentHistory.filter({
    transaction_id
  });

  if (payments.length > 0) {
    await base44.entities.PaymentHistory.update(payments[0].id, {
      payment_status: 'approved',
      metadata
    });

    // Enviar email de confirmação
    const workshop = await base44.entities.Workshop.filter({
      id[0].workshop_id
    });

    if (workshop[0]?.owner_email) {
      await base44.integrations.Core.SendEmail({
        to[0].owner_email,
        subject: 'Pagamento Confirmado',
        body: `
          Pagamento Confirmado!</h2>
          Seu pagamento de R$ ${payments[0].amount.toFixed(2)} foi processado com sucesso.</p>
          Plano: ${payments[0].plan_name}</p>
        `
      });
    }
  }
}

/**
 * Atualizar status de pagamento falhou
 */
async function handlePaymentFailed(paymentData, gateway) {
  const transactionId = paymentData.id;

  const payments = await base44.entities.PaymentHistory.filter({
    transaction_id
  });

  if (payments.length > 0) {
    await base44.entities.PaymentHistory.update(payments[0].id, {
      payment_status: 'failed',
      metadata
    });
  }
}

/**
 * Atualizar assinatura
 */
async function handleSubscriptionUpdated(subscriptionData, gateway) {
  // Implementar lógica de atualização de assinatura
  console.log('Subscription updated:', subscriptionData);
}

/**
 * Cancelar assinatura
 */
async function handleSubscriptionCancelled(subscriptionData, gateway) {
  // Implementar lógica de cancelamento
  console.log('Subscription cancelled:', subscriptionData);
}
