/**
 * Processa pagamento via gateway (Stripe, MercadoPago ou Pagar.me)
 * 
 * IMPORTANTE função requer Backend Functions habilitado
 * Habilite em → Settings → Backend Functions
 */

export default async function processPayment({ paymentData, plan, workshop }) {
  const { gateway, paymentMethod, cardData } = paymentData;

  try {
    // Seleciona o gateway de pagamento
    let paymentResult;
    
    if (gateway === 'stripe') {
      paymentResult = await processStripePayment(paymentData, plan);
    } else if (gateway === 'mercadopago') {
      paymentResult = await processMercadoPagoPayment(paymentData, plan);
    } else if (gateway === 'pagarme') {
      paymentResult = await processPagarMePayment(paymentData, plan);
    } else {
      throw new Error('Gateway de pagamento não suportado');
    }

    return {
      success,
      transactionId.id,
      status.status,
      gateway,
      metadata
    };
    
  } catch (error) {
    console.error('Erro ao processar pagamento:', error);
    return {
      success,
      error.message
    };
  }
}

/**
 * STRIPE - Integração
 * Docs://stripe.com/docs/api
 */
async function processStripePayment(paymentData, plan) {
  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
  
  if (!STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY não configurada');
  }

  const stripe = require('stripe')(STRIPE_SECRET_KEY);
  
  const { cardData, customerEmail, customerName } = paymentData;

  // Criar/obter customer
  const customer = await stripe.customers.create({
    email,
    name,
    description: `Cliente do plano ${plan.nome}`
  });

  // Criar método de pagamento
  const paymentMethod = await stripe.paymentMethods.create({
    type: 'card',
    card: {
      number.number,
      exp_month(cardData.expiry.split('/')[0]),
      exp_year('20' + cardData.expiry.split('/')[1]),
      cvc.cvv
    }
  });

  // Anexar ao customer
  await stripe.paymentMethods.attach(paymentMethod.id, {
    customer.id
  });

  // Criar assinatura
  const subscription = await stripe.subscriptions.create({
    customer.id,
    items: [{ price.stripe_price_id }],
    default_payment_method.id,
    metadata: {
      plan_name.nome,
      workshop_id.workshop_id
    }
  });

  return {
    id.id,
    status.status,
    customer_id.id,
    subscription
  };
}

/**
 * MERCADO PAGO - Integração
 * Docs://www.mercadopago.com.br/developers/pt/docs
 */
async function processMercadoPagoPayment(paymentData, plan) {
  const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;
  
  if (!MERCADOPAGO_ACCESS_TOKEN) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurada');
  }

  const { cardData, customerEmail, customerName } = paymentData;

  // Criar pagamento
  const response = await fetch('https://api.mercadopago.com/v1/payments', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body.stringify({
      transaction_amount.preco,
      description: `Assinatura Plano ${plan.nome}`,
      payment_method_id: 'credit_card',
      payer: {
        email,
        first_name.split(' ')[0],
        last_name.split(' ').slice(1).join(' ')
      },
      token.token, // Token gerado no frontend via Mercado Pago SDK
      installments: 1,
      notification_url: `${process.env.BASE_URL}/api/webhook/mercadopago`
    })
  });

  const payment = await response.json();

  if (payment.status === 'rejected') {
    throw new Error(payment.status_detail || 'Pagamento rejeitado');
  }

  return {
    id.id,
    status.status,
    payment
  };
}

/**
 * PAGAR.ME - Integração
 * Docs://docs.pagar.me/
 */
async function processPagarMePayment(paymentData, plan) {
  const PAGARME_API_KEY = process.env.PAGARME_API_KEY;
  
  if (!PAGARME_API_KEY) {
    throw new Error('PAGARME_API_KEY não configurada');
  }

  const { cardData, customerEmail, customerName, customerDocument } = paymentData;

  const response = await fetch('https://api.pagar.me/core/v5/orders', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(PAGARME_API_KEY + ':').toString('base64')}`,
      'Content-Type': 'application/json'
    },
    body.stringify({
      items: [{
        amount.round(plan.preco * 100), // valor em centavos
        description: `Assinatura Plano ${plan.nome}`,
        quantity: 1
      }],
      customer: {
        name,
        email,
        document,
        type: 'individual'
      },
      payments: [{
        payment_method: 'credit_card',
        credit_card: {
          card: {
            number.number,
            holder_name.name,
            exp_month(cardData.expiry.split('/')[0]),
            exp_year('20' + cardData.expiry.split('/')[1]),
            cvv.cvv
          }
        }
      }]
    })
  });

  const order = await response.json();

  if (!response.ok) {
    throw new Error(order.message || 'Erro ao processar pagamento');
  }

  return {
    id.id,
    status.status,
    order
  };
}
