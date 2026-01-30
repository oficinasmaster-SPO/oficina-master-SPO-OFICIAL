import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    // IMPORTANTE: Usar asServiceRole para webhooks externos (sem auth de usuário)
    const base44 = createClientFromRequest(req);
    
    // Parse webhook payload
    let payload;
    try {
      const body = await req.text();
      payload = JSON.parse(body);
    } catch (e) {
      console.error("❌ Erro ao parsear payload do webhook:", e);
      return Response.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }
    
    console.log("📩 Kiwify Webhook recebido:", JSON.stringify(payload, null, 2));
    
    // Extrair dados básicos para log (formato real da Kiwify)
    const eventType = payload.order?.webhook_event_type || payload.event || payload.trigger;
    const customerEmail = payload.order?.Customer?.email || payload.Customer?.email || payload.customer_email;
    const productId = payload.order?.Product?.product_id || payload.Product?.product_id || payload.product_id;
    const orderId = payload.order?.order_id || payload.order_id || payload.transaction_id || payload.id;
    const eventData = payload.order || payload.data || payload;
    
    // Buscar configurações do Kiwify
    const kiwifySettings = await base44.asServiceRole.entities.KiwifySettings.list();
    const kiwifyConfig = kiwifySettings[0];
    
    if (!kiwifyConfig || !kiwifyConfig.is_active) {
      // Registrar log mesmo se integração não estiver ativa
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
      
      console.log("⚠️ Integração Kiwify não está ativa");
      return Response.json({ error: 'Kiwify integration not active' }, { status: 400 });
    }
    
    let processingStatus = 'success';
    let processingMessage = 'Evento processado com sucesso';
    let workshopId = null;
    
    try {
      // Processar diferentes eventos conforme documentação Kiwify
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
          
        default:
          processingStatus = 'warning';
          processingMessage = `Evento não tratado: ${eventType}`;
          console.log(`⚠️ Evento não tratado: ${eventType}`);
      }
    } catch (error) {
      processingStatus = 'error';
      processingMessage = error.message;
      console.error('Erro ao processar webhook:', error);
    }
    
    // Registrar log do webhook
    await base44.asServiceRole.entities.KiwifyWebhookLog.create({
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
      status: processingStatus
    });

  } catch (error) {
    console.error("❌ Erro ao processar webhook:", error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});

async function handlePaymentApproved(base44, data, kiwifyConfig) {
  console.log("✅ Pagamento aprovado:", data);
  
  // Kiwify API retorna: order { Customer { email }, Product { product_id } }
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
  
  // Buscar workshop pelo email do cliente ou custom_data
  const workshopId = customData?.workshop_id;
  let workshop;
  
  if (workshopId) {
    const workshops = await base44.asServiceRole.entities.Workshop.list();
    workshop = workshops.find(w => w.id === workshopId);
  } else {
    // Buscar workshop por email do owner
    const workshops = await base44.asServiceRole.entities.Workshop.list();
    workshop = workshops.find(w => w.email === customerEmail);
  }
  
  if (!workshop) {
    console.error(`❌ Workshop não encontrado para email: ${customerEmail}`);
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
    amount: orderAmount / 100, // Kiwify envia em centavos
    transaction_id: data.order_id || data.transaction_id || data.id,
    payment_date: data.approved_date || new Date().toISOString(),
    metadata: data
  });
  
  console.log(`✅ Plano atualizado: ${workshop.name} -> ${planId}`);
  
  return workshop.id;
}

async function handleRefund(base44, data) {
  console.log("💸 Reembolso/Chargeback:", data);
  
  const customerEmail = data.Customer?.email || data.customer_email;
  
  // Buscar workshop e voltar para plano FREE
  const users = await base44.asServiceRole.entities.User.list();
  const user = users.find(u => u.email === customerEmail);
  
  if (user) {
    const workshops = await base44.asServiceRole.entities.Workshop.list();
    const workshop = workshops.find(w => w.owner_id === user.id);
    await base44.asServiceRole.entities.Workshop.update(workshop.id, {
      planoAtual: 'FREE',
      dataAssinatura: new Date().toISOString()
    });
    
    // Registrar no histórico
    await base44.asServiceRole.entities.PaymentHistory.create({
      workshop_id: workshop.id,
      payment_provider: 'kiwify',
      payment_status: 'refunded',
      transaction_id: data.order_id || data.transaction_id,
      payment_date: new Date().toISOString(),
      metadata: data
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
  console.log("🚫 Assinatura cancelada:", data);
  
  const customerEmail = data.Customer?.email || data.customer_email;
  
  // Buscar workshop e voltar para plano FREE
  const users = await base44.asServiceRole.entities.User.list();
  const user = users.find(u => u.email === customerEmail);
  
  if (user) {
    const workshops = await base44.asServiceRole.entities.Workshop.list();
    const workshop = workshops.find(w => w.owner_id === user.id);
    await base44.asServiceRole.entities.Workshop.update(workshop.id, {
      planoAtual: 'FREE',
      dataAssinatura: new Date().toISOString()
    });
    
    console.log(`✅ Workshop ${workshop.name} voltou para plano FREE`);
  }
}