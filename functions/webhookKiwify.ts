import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Parse webhook payload
    const body = await req.text();
    const payload = JSON.parse(body);
    
    console.log("📩 Kiwify Webhook recebido:", payload);

    // Validar assinatura do webhook (se Kiwify fornecer)
    const signature = req.headers.get('x-kiwify-signature');
    const clientSecret = Deno.env.get('KIWIFY_CLIENT_SECRET');
    
    if (clientSecret && signature) {
      // Validar assinatura usando HMAC
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(clientSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      const expectedSignature = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(body)
      );
      
      const expectedHex = Array.from(new Uint8Array(expectedSignature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      if (signature !== expectedHex) {
        console.error("❌ Assinatura inválida");
        return Response.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const { event, data } = payload;
    
    // Processar diferentes eventos
    switch (event) {
      case 'payment.approved':
      case 'subscription.created':
        await handlePaymentApproved(base44, data);
        break;
        
      case 'payment.refused':
      case 'payment.cancelled':
        await handlePaymentFailed(base44, data);
        break;
        
      case 'subscription.cancelled':
      case 'subscription.expired':
        await handleSubscriptionCancelled(base44, data);
        break;
        
      default:
        console.log(`⚠️ Evento não tratado: ${event}`);
    }

    return Response.json({ 
      success: true, 
      message: 'Webhook processado com sucesso' 
    });

  } catch (error) {
    console.error("❌ Erro ao processar webhook:", error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});

async function handlePaymentApproved(base44, data) {
  console.log("✅ Pagamento aprovado:", data);
  
  const { customer_email, product_id, custom_fields } = data;
  
  // Buscar configurações Kiwify para mapear produto -> plano
  const settings = await base44.asServiceRole.entities.KiwifySettings.list();
  const kiwifyConfig = settings[0];
  
  if (!kiwifyConfig) {
    console.error("❌ Configuração Kiwify não encontrada");
    return;
  }
  
  // Encontrar mapeamento do produto
  const mapping = kiwifyConfig.plan_mappings?.find(
    m => m.kiwify_product_id === product_id
  );
  
  if (!mapping) {
    console.error(`❌ Produto ${product_id} não mapeado para nenhum plano`);
    return;
  }
  
  const planId = mapping.internal_plan_id;
  
  // Buscar workshop pelo email do cliente ou custom_field
  const workshopId = custom_fields?.workshop_id;
  let workshop;
  
  if (workshopId) {
    workshop = await base44.asServiceRole.entities.Workshop.get(workshopId);
  } else {
    // Buscar por email do owner
    const users = await base44.asServiceRole.entities.User.list();
    const user = users.find(u => u.email === customer_email);
    
    if (user) {
      const workshops = await base44.asServiceRole.entities.Workshop.list();
      workshop = workshops.find(w => w.owner_id === user.id);
    }
  }
  
  if (!workshop) {
    console.error(`❌ Workshop não encontrado para email: ${customer_email}`);
    return;
  }
  
  // Atualizar plano do workshop
  await base44.asServiceRole.entities.Workshop.update(workshop.id, {
    planoAtual: planId,
    dataAssinatura: new Date().toISOString(),
    dataRenovacao: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // +30 dias
  });
  
  // Registrar histórico de pagamento
  await base44.asServiceRole.entities.PaymentHistory.create({
    workshop_id: workshop.id,
    plan_id: planId,
    payment_provider: 'kiwify',
    payment_status: 'approved',
    amount: data.amount || 0,
    transaction_id: data.transaction_id || data.id,
    payment_date: new Date().toISOString(),
    metadata: data
  });
  
  console.log(`✅ Plano atualizado: ${workshop.name} -> ${planId}`);
}

async function handlePaymentFailed(base44, data) {
  console.log("❌ Pagamento falhou:", data);
  
  const { customer_email, transaction_id } = data;
  
  // Registrar falha no histórico
  const users = await base44.asServiceRole.entities.User.list();
  const user = users.find(u => u.email === customer_email);
  
  if (user) {
    const workshops = await base44.asServiceRole.entities.Workshop.list();
    const workshop = workshops.find(w => w.owner_id === user.id);
    
    if (workshop) {
      await base44.asServiceRole.entities.PaymentHistory.create({
        workshop_id: workshop.id,
        payment_provider: 'kiwify',
        payment_status: 'failed',
        transaction_id: transaction_id || data.id,
        payment_date: new Date().toISOString(),
        metadata: data
      });
    }
  }
}

async function handleSubscriptionCancelled(base44, data) {
  console.log("🚫 Assinatura cancelada:", data);
  
  const { customer_email } = data;
  
  // Buscar workshop e voltar para plano FREE
  const users = await base44.asServiceRole.entities.User.list();
  const user = users.find(u => u.email === customer_email);
  
  if (user) {
    const workshops = await base44.asServiceRole.entities.Workshop.list();
    const workshop = workshops.find(w => w.owner_id === user.id);
    
    if (workshop) {
      await base44.asServiceRole.entities.Workshop.update(workshop.id, {
        planoAtual: 'FREE',
        dataAssinatura: new Date().toISOString()
      });
      
      console.log(`✅ Workshop ${workshop.name} voltou para plano FREE`);
    }
  }
}