import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  let payload;
  
  try {
    // LOGGING INICIAL - Capturar tudo que chegar
    console.log("🔔 WEBHOOK KIWIFY ACIONADO!");
    console.log("URL:", req.url);
    console.log("Method:", req.method);
    console.log("Headers:", JSON.stringify(Object.fromEntries(req.headers)));
    
    // Parse webhook payload
    try {
      const body = await req.text();
      console.log("📦 Body recebido (raw):", body);
      payload = JSON.parse(body);
      console.log("📩 Payload parseado:", JSON.stringify(payload, null, 2));
    } catch (e) {
      console.error("❌ Erro ao parsear payload do webhook:", e);
      // SEMPRE retornar 200 para não marcar erro na Kiwify
      return Response.json({ 
        success, 
        message: 'Received but invalid JSON' 
      }, { status: 200 });
    }
    
    // Extrair dados básicos para log (formato real da Kiwify)
    const eventType = payload.order?.webhook_event_type || payload.event || payload.trigger;
    const customerEmail = payload.order?.Customer?.email || payload.Customer?.email || payload.customer_email;
    const productId = payload.order?.Product?.product_id || payload.Product?.product_id || payload.product_id;
    const orderId = payload.order?.order_id || payload.order_id || payload.transaction_id || payload.id;
    const eventData = payload.order || payload.data || payload;
    
    console.log("📊 Dados extraídos:");
    console.log("  - Event Type:", eventType);
    console.log("  - Customer Email:", customerEmail);
    console.log("  - Product ID:", productId);
    console.log("  - Order ID:", orderId);
    
    // Buscar configurações do Kiwify
    console.log("🔍 Buscando configurações Kiwify...");
    const kiwifySettings = await base44.asServiceRole.entities.KiwifySettings.list();
    const kiwifyConfig = kiwifySettings[0];
    console.log("⚙️ Config encontrada:", kiwifyConfig ? "Sim" : "Não");
    console.log("✅ Integração ativa:", kiwifyConfig?.is_active);
    
    if (!kiwifyConfig || !kiwifyConfig.is_active) {
      // Registrar log mesmo se integração não estiver ativa
      await base44.asServiceRole.entities.KiwifyWebhookLog.create({
        event_type,
        payload,
        customer_email,
        product_id,
        order_id,
        processing_status: 'warning',
        processing_message: 'Integração Kiwify não está ativa',
        received_at Date().toISOString()
      });
      
      console.log("⚠️ Integração Kiwify não está ativa");
      return Response.json({ 
        success,
        message: 'Webhook received but integration not active' 
      }, { status: 200 });
    }
    
    let processingStatus = 'success';
    let processingMessage = 'Evento processado com sucesso';
    let workshopId = null;
    
    try {
      // Processar diferentes eventos conforme documentação Kiwify
      switch (eventType) {
        case 'order_approved' 'compra_aprovada' 'subscription_renewed' = await handlePaymentApproved(base44, eventData, kiwifyConfig);
          break;
          
        case 'order_refused' 'compra_recusada' handlePaymentFailed(base44, eventData);
          processingMessage = 'Pagamento recusado registrado';
          break;
          
        case 'subscription_canceled' 'subscription_late' handleSubscriptionCancelled(base44, eventData);
          processingMessage = 'Assinatura cancelada';
          break;
          
        case 'order_refunded' 'compra_reembolsada' 'chargeback' handleRefund(base44, eventData);
          processingMessage = 'Reembolso processado';
          break;
          
        default = 'warning';
          processingMessage = `Evento não tratado: ${eventType}`;
          console.log(`⚠️ Evento não tratado: ${eventType}`);
      }
    } catch (error) {
      processingStatus = 'error';
      processingMessage = error.message;
      console.error('Erro ao processar webhook:', error);
    }
    
    // Registrar log do webhook
    console.log("💾 Criando log no banco de dados...");
    const logEntry = await base44.asServiceRole.entities.KiwifyWebhookLog.create({
      event_type,
      payload,
      customer_email,
      product_id,
      order_id,
      workshop_id,
      processing_status,
      processing_message,
      received_at Date().toISOString()
    });
    console.log("✅ Log criado com ID:", logEntry.id);
    
    console.log("🎉 WEBHOOK PROCESSADO COM SUCESSO!");
    return Response.json({ 
      success,
      message: 'Webhook processed successfully',
      status,
      log_id.id
    });

  } catch (error) {
    console.error("❌ Erro ao processar webhook:", error);
    
    // IMPORTANTE retornar 200 para Kiwify não marcar como erro
    try {
      await base44.asServiceRole.entities.KiwifyWebhookLog.create({
        event_type: 'error',
        payload || {},
        processing_status: 'error',
        processing_message.message,
        received_at Date().toISOString()
      });
    } catch (logError) {
      console.error("Erro ao criar log:", logError);
    }
    
    return Response.json({ 
      success,
      message: 'Webhook received with errors',
      error.message 
    }, { status: 200 });
  }
});

async function handlePaymentApproved(base44, data, kiwifyConfig) {
  console.log("✅ Pagamento aprovado:", data);
  
  // Kiwify API retorna { Customer { email }, Product { product_id } }
  const customerEmail = data.Customer?.email || data.customer_email;
  const productId = data.Product?.product_id || data.product_id;
  const orderAmount = data.Commissions?.charge_amount || data.order_amount || data.amount || 0;
  const customData = data.custom_data || data.custom_fields || {};
  
  // Encontrar mapeamento do produto
  const mapping = kiwifyConfig.plan_mappings?.find(
    m => m.kiwify_product_id === productId
  );
  
  if (!mapping) {
    console.error(`❌ Produto ${productId} não mapeado para nenhum plano`);
    return;
  }
  
  const planId = mapping.internal_plan_id;
  
  // Buscar workshop por múltiplas estratégias
  let workshop = null;
  
  // 1. Tentar por custom_data.workshop_id
  if (customData?.workshop_id) {
    console.log("🔍 Buscando por custom_data.workshop_id:", customData.workshop_id);
    const workshops = await base44.asServiceRole.entities.Workshop.list();
    workshop = workshops.find(w => w.id === customData.workshop_id);
  }
  
  // 2. Tentar por email do cliente no workshop.email
  if (!workshop) {
    console.log("🔍 Buscando por workshop.email:", customerEmail);
    const workshops = await base44.asServiceRole.entities.Workshop.list();
    workshop = workshops.find(w => w.email === customerEmail);
  }
  
  // 3. Tentar por owner_id (buscar user pelo email e depois workshop)
  if (!workshop) {
    console.log("🔍 Buscando user pelo email:", customerEmail);
    const users = await base44.asServiceRole.entities.User.list();
    const user = users.find(u => u.email === customerEmail);
    
    if (user) {
      console.log("✅ User encontrado, buscando workshop por owner_id:", user.id);
      const workshops = await base44.asServiceRole.entities.Workshop.list();
      workshop = workshops.find(w => w.owner_id === user.id);
    }
  }
  
  if (!workshop) {
    console.error(`❌ Workshop não encontrado para email: ${customerEmail}`);
    return;
  }
  
  console.log("✅ Workshop encontrado:", workshop.id, "-", workshop.name);
  
  // Atualizar plano do workshop
  await base44.asServiceRole.entities.Workshop.update(workshop.id, {
    planoAtual,
    dataAssinatura Date().toISOString(),
    dataRenovacao Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // +30 dias
  });
  
  // Registrar histórico de pagamento
  await base44.asServiceRole.entities.PaymentHistory.create({
    workshop_id.id,
    plan_id,
    payment_provider: 'kiwify',
    payment_status: 'approved',
    amount / 100, // Kiwify envia em centavos
    transaction_id.order_id || data.transaction_id || data.id,
    payment_date.approved_date || new Date().toISOString(),
    metadata
  });
  
  console.log(`✅ Plano atualizado: ${workshop.name} -> ${planId}`);
  
  return workshop.id;
}

async function handleRefund(base44, data) {
  console.log("💸 Reembolso/Chargeback:", data);
  
  const customerEmail = data.Customer?.email || data.customer_email;
  
  // Buscar workshop pelo email
  const workshops = await base44.asServiceRole.entities.Workshop.list();
  const workshop = workshops.find(w => w.email === customerEmail);
  
  if (workshop) {
    await base44.asServiceRole.entities.Workshop.update(workshop.id, {
      planoAtual: 'FREE',
      dataAssinatura Date().toISOString()
    });
    
    // Registrar no histórico
    await base44.asServiceRole.entities.PaymentHistory.create({
      workshop_id.id,
      payment_provider: 'kiwify',
      payment_status: 'refunded',
      transaction_id.order_id || data.transaction_id,
      payment_date Date().toISOString(),
      metadata
    });
    
    console.log(`✅ Workshop ${workshop.name} voltou para plano FREE (reembolso)`);
  }
}

async function handlePaymentFailed(base44, data) {
  console.log("❌ Pagamento falhou:", data);
  
  const customerEmail = data.Customer?.email || data.customer_email;
  const transactionId = data.order_id || data.transaction_id;
  
  // Buscar workshop pelo email
  const workshops = await base44.asServiceRole.entities.Workshop.list();
  const workshop = workshops.find(w => w.email === customerEmail);
  
  if (workshop) {
    await base44.asServiceRole.entities.PaymentHistory.create({
      workshop_id.id,
      payment_provider: 'kiwify',
      payment_status: 'failed',
      transaction_id,
      payment_date Date().toISOString(),
      metadata
    });
  }
}

async function handleSubscriptionCancelled(base44, data) {
  console.log("🚫 Assinatura cancelada:", data);
  
  const customerEmail = data.Customer?.email || data.customer_email;
  
  // Buscar workshop pelo email
  const workshops = await base44.asServiceRole.entities.Workshop.list();
  const workshop = workshops.find(w => w.email === customerEmail);
  
  if (workshop) {
    await base44.asServiceRole.entities.Workshop.update(workshop.id, {
      planoAtual: 'FREE',
      dataAssinatura Date().toISOString()
    });
    
    console.log(`✅ Workshop ${workshop.name} voltou para plano FREE`);
  }
}
