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

    // Payloads de teste simulando eventos Kiwify
    const testPayloads = {
      payment_approved: {
        event: 'payment.approved',
        data: {
          id: 'test_' + Date.now(),
          transaction_id: 'txn_test_' + Date.now(),
          customer_email: user.email,
          product_id: 'prod_test_123',
          amount: 19700, // R$ 197,00
          custom_fields: {
            workshop_id: null // Será buscado pelo email
          },
          created_at: new Date().toISOString()
        }
      },
      payment_refused: {
        event: 'payment.refused',
        data: {
          id: 'test_' + Date.now(),
          transaction_id: 'txn_test_failed_' + Date.now(),
          customer_email: user.email,
          product_id: 'prod_test_123',
          reason: 'Insufficient funds',
          created_at: new Date().toISOString()
        }
      },
      subscription_cancelled: {
        event: 'subscription.cancelled',
        data: {
          id: 'sub_test_' + Date.now(),
          customer_email: user.email,
          cancelled_at: new Date().toISOString()
        }
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