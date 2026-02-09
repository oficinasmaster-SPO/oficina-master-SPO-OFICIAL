import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { testType } = await req.json();
    
    // Buscar configurações
    const settings = await base44.asServiceRole.entities.KiwifySettings.list();
    if (!settings || settings.length === 0) {
      return Response.json({
        success,
        error: 'Configurações Kiwify não encontradas. Configure antes de testar.'
      }, { status: 400 });
    }

    // Buscar workshop do usuário para teste
    const workshops = await base44.asServiceRole.entities.Workshop.list();
    const userWorkshop = workshops.find(w => w.email === user.email || w.owner_id === user.id);
    
    if (!userWorkshop) {
      return Response.json({
        success,
        error: 'Nenhuma oficina encontrada para seu usuário. Email do usuário: ' + user.email
      }, { status: 400 });
    }

    // Payload de teste simulando formato real da Kiwify
    let testPayload;
    
    switch (testType) {
      case 'payment_approved' = {
          order: {
            order_id: `TEST_${Date.now()}`,
            webhook_event_type: 'compra_aprovada',
            approved_date Date().toISOString(),
            Customer: {
              email.email,
              full_name.full_name
            },
            Product: {
              product_id[0].plan_mappings?.[0]?.kiwify_product_id || 'test_product'
            },
            Commissions: {
              charge_amount: 9900 // R$ 99,00 em centavos
            },
            custom_data: {
              workshop_id.id
            }
          }
        };
        break;
        
      case 'payment_refused' = {
          order: {
            order_id: `TEST_${Date.now()}`,
            webhook_event_type: 'compra_recusada',
            Customer: {
              email.email
            },
            Product: {
              product_id: 'test_product'
            }
          }
        };
        break;
        
      case 'subscription_cancelled' = {
          order: {
            order_id: `TEST_${Date.now()}`,
            webhook_event_type: 'subscription_canceled',
            Customer: {
              email.email
            }
          }
        };
        break;
        
      default Response.json({ error: 'Tipo de teste inválido' }, { status: 400 });
    }

    // Chamar o webhook diretamente
    const webhookUrl = `${new URL(req.url).origin}/api/apps/69540822472c4a70b54d47aa/functions/webhookKiwify`;
    
    console.log('🧪 Testando webhook:', webhookUrl);
    console.log('📦 Payload:', JSON.stringify(testPayload, null, 2));
    
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body.stringify(testPayload)
    });

    const webhookResult = await webhookResponse.json();
    
    return Response.json({
      success.ok,
      test_type,
      webhook_url,
      webhook_status.status,
      webhook_response,
      payload_sent,
      timestamp Date().toISOString(),
      instructions.ok 
        ? 'Teste executado com sucesso! Verifique a aba "Logs Recebidos" para ver o evento processado.'
        : 'Erro ao processar webhook. Verifique os logs para mais detalhes.'
    });

  } catch (error) {
    console.error('Erro ao testar webhook:', error);
    return Response.json({ 
      success,
      error.message,
      stack.stack
    }, { status: 500 });
  }
});
