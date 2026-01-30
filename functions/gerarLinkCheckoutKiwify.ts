import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    // Autenticar usuário
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse dados do pedido
    const { plan_id } = await req.json();
    
    if (!plan_id) {
      return Response.json({ error: 'Plan ID is required' }, { status: 400 });
    }
    
    // Buscar workshop do usuário
    const workshops = await base44.entities.Workshop.list();
    const workshop = workshops.find(w => w.owner_id === user.id);
    
    if (!workshop) {
      return Response.json({ 
        error: 'Workshop not found. Please register your workshop first.' 
      }, { status: 404 });
    }
    
    // Buscar configurações da Kiwify
    const kiwifySettings = await base44.asServiceRole.entities.KiwifySettings.list();
    const kiwifyConfig = kiwifySettings[0];
    
    if (!kiwifyConfig || !kiwifyConfig.is_active) {
      return Response.json({ 
        error: 'Kiwify integration is not configured' 
      }, { status: 400 });
    }
    
    // Encontrar mapeamento do plano
    const mapping = kiwifyConfig.plan_mappings?.find(
      m => m.internal_plan_id === plan_id
    );
    
    if (!mapping) {
      return Response.json({ 
        error: `Plan ${plan_id} is not mapped to any Kiwify product` 
      }, { status: 404 });
    }
    
    const kiwifyProductId = mapping.kiwify_product_id;
    
    // Construir URL de checkout da Kiwify
    const checkoutUrl = new URL(`https://pay.kiwify.com.br/${kiwifyProductId}`);
    
    // Adicionar parâmetros personalizados
    checkoutUrl.searchParams.set('custom[workshop_id]', workshop.id);
    checkoutUrl.searchParams.set('custom[user_id]', user.id);
    checkoutUrl.searchParams.set('custom[plan_id]', plan_id);
    
    // Adicionar dados do cliente
    if (user.email) {
      checkoutUrl.searchParams.set('email', user.email);
    }
    if (user.full_name) {
      checkoutUrl.searchParams.set('name', user.full_name);
    }
    
    // URLs de redirecionamento
    const baseUrl = `https://app.base44.com/${workshop.id}/`;
    const successUrl = kiwifyConfig.default_success_redirect_url || `${baseUrl}MeuPlano?status=success`;
    const failureUrl = kiwifyConfig.default_failure_redirect_url || `${baseUrl}Planos?status=failed`;
    
    checkoutUrl.searchParams.set('redirect_url', successUrl);
    checkoutUrl.searchParams.set('cancel_url', failureUrl);
    
    console.log("✅ Link de checkout gerado:", checkoutUrl.toString());
    
    return Response.json({
      success: true,
      checkout_url: checkoutUrl.toString(),
      plan_id: plan_id,
      kiwify_product_id: kiwifyProductId,
      workshop_id: workshop.id
    });
    
  } catch (error) {
    console.error("❌ Erro ao gerar link de checkout:", error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});