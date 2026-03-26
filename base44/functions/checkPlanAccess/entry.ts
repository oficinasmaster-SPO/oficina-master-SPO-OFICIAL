import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Validar autenticação
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Não autenticado' } }, { status: 401 });
    }

    const body = await req.json();
    const { tenantId, feature, action, currentUsage } = body;

    if (!tenantId) {
      return Response.json({ success: false, error: { code: 'MISSING_FIELDS', message: 'tenantId é obrigatório' } }, { status: 400 });
    }

    // 1. Buscar a oficina (tenant)
    let tenant = null;
    try {
      const workshops = await base44.asServiceRole.entities.Workshop.filter({ id: tenantId });
      if (workshops && workshops.length > 0) {
        tenant = workshops[0];
      }
    } catch(e) {}

    if (!tenant) {
      return Response.json({ success: false, error: { code: 'NOT_FOUND', message: 'Tenant não encontrado' } }, { status: 404 });
    }

    // Validação 1: Plano Inativo
    if (tenant.planStatus === 'canceled' || !tenant.planId) {
      return Response.json({ 
        success: false, 
        error: { code: 'PLAN_INACTIVE', message: 'Plano inativo ou suspenso.' } 
      }, { status: 403 });
    }

    const planId = tenant.planId || 'free';

    // Buscar as definições do plano
    const plans = await base44.asServiceRole.entities.PlatformPlan.filter({ internal_id: planId });
    if (!plans || plans.length === 0) {
      return Response.json({ success: false, error: { code: 'NOT_FOUND', message: 'Configuração do plano não encontrada.' } }, { status: 404 });
    }
    const plan = plans[0];

    // Validação 2: Funcionalidade (Feature)
    if (action === 'check_feature' || action === 'check_both') {
      if (!feature || !plan.features || plan.features[feature] !== true) {
        return Response.json({ 
          success: false, 
          error: { code: 'FEATURE_NOT_AVAILABLE', message: `A funcionalidade '${feature}' não está disponível no plano atual.` } 
        }, { status: 403 });
      }
    }

    // Validação 3: Limites
    if (action === 'check_limit' || action === 'check_both') {
      if (!feature || currentUsage === undefined || currentUsage === null) {
        return Response.json({ 
          success: false, 
          error: { code: 'MISSING_FIELDS', message: 'Parâmetros "feature" e "currentUsage" são obrigatórios para checar limites.' } 
        }, { status: 400 });
      }

      const limit = plan.limits ? plan.limits[feature] : null;
      
      // Se o plano tiver o limite cadastrado e o uso atual for maior ou igual ao limite
      if (limit !== undefined && limit !== null && currentUsage >= limit) {
        return Response.json({ 
          success: false, 
          error: { code: 'PLAN_LIMIT_REACHED', message: `Você atingiu o limite do plano para a métrica '${feature}' (${currentUsage}/${limit}). Faça um upgrade para continuar.` } 
        }, { status: 403 });
      }
    }

    // Se passar por todas as checagens, está permitido
    return Response.json({ success: true, allowed: true });

  } catch (error) {
    console.error("Erro na checagem do plano:", error);
    return Response.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Erro interno no servidor' } }, { status: 500 });
  }
});