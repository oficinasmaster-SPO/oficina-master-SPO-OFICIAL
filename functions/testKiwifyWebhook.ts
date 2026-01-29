import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verificar se é admin
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { testType } = await req.json();

    // URL do webhook (pegar da URL atual)
    const webhookUrl = `${new URL(req.url).origin}/api/functions/webhookKiwify`;

    // Payloads de teste simulando eventos oficiais da Kiwify API
    const testPayloads = {
      payment_approved: {
        event: 'compra_aprovada',
        trigger: 'compra_aprovada',
        Customer: {
          email: user.email,
          full_name: user.full_name
        },
        Product: {
          product_id: 'prod_test_123',
          product_name: 'Plano Teste'
        },
        order_id: 'test_order_' + Date.now(),
        order_amount: 19700,
        custom_data: {
          workshop_id: null // Será buscado pelo email
        },
        created_at: new Date().toISOString()
      },
      payment_refused: {
        event: 'compra_recusada',
        trigger: 'compra_recusada',
        Customer: {
          email: user.email,
          full_name: user.full_name
        },
        Product: {
          product_id: 'prod_test_123'
        },
        order_id: 'test_failed_' + Date.now(),
        reason: 'Insufficient funds',
        created_at: new Date().toISOString()
      },
      subscription_cancelled: {
        event: 'subscription_canceled',
        trigger: 'subscription_canceled',
        Customer: {
          email: user.email
        },
        subscription_id: 'sub_test_' + Date.now(),
        cancelled_at: new Date().toISOString()
      }
    };

    const payload = testPayloads[testType] || testPayloads.payment_approved;

    // Enviar requisição para o webhook
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-webhook': 'true'
      },
      body: JSON.stringify(payload)
    });

    const webhookResult = await webhookResponse.json();

    return Response.json({
      success: true,
      webhook_url: webhookUrl,
      test_type: testType,
      payload_sent: payload,
      webhook_status: webhookResponse.status,
      webhook_response: webhookResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Erro ao testar webhook:", error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});