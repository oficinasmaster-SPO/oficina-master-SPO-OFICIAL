import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Rate Limit Global em Memória
const rateLimits = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minuto
const MAX_REQUESTS_PER_USER = 120; // 120 requests por minuto

function checkRateLimit(key) {
  if (!key) return true;
  const now = Date.now();
  const record = rateLimits.get(key);
  
  if (!record || (now - record.timestamp > RATE_LIMIT_WINDOW)) {
    rateLimits.set(key, { count: 1, timestamp: now });
    return true;
  }
  
  if (record.count >= MAX_REQUESTS_PER_USER) {
    return false;
  }
  
  record.count += 1;
  return true;
}

// Limpeza de memória do rate limit
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimits.entries()) {
    if (now - record.timestamp > RATE_LIMIT_WINDOW) rateLimits.delete(key);
  }
}, 5 * 60 * 1000);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Validar autenticação
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Não autenticado' } }, { status: 401 });
    }

    // Rate Limiting Global por Usuário
    if (!checkRateLimit(user.id)) {
      return Response.json({ success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Muitas requisições. Tente novamente em um minuto.' } }, { status: 429 });
    }

    const body = await req.json();
    const { tenantId, feature, action, currentUsage } = body;

    if (!tenantId) {
      return Response.json({ success: false, error: { code: 'MISSING_FIELDS', message: 'tenantId é obrigatório' } }, { status: 400 });
    }

    // 1. Buscar a oficina (tenant)
    let tenant = null;
    try {
      tenant = await base44.asServiceRole.entities.Workshop.get(tenantId);
    } catch(e) {}

    if (!tenant) {
      return Response.json({ success: false, error: { code: 'NOT_FOUND', message: 'Tenant não encontrado' } }, { status: 404 });
    }

    // Validação 1: Plano Inativo / Cancelado / Pendente
    // A fonte da verdade agora é o webhook (Kiwify), que altera o planStatus.
    // Qualquer status diferente de 'active' ou 'trial' bloqueia o acesso.
    if (tenant.planStatus !== 'active' && tenant.planStatus !== 'trial') {
      return Response.json({ 
        success: false, 
        error: { code: 'PLAN_INACTIVE', message: 'Plano inativo, suspenso ou cancelado. Por favor, regularize sua assinatura.' } 
      }, { status: 403 });
    }

    // Validação de Trial
    if (tenant.planStatus === 'trial') {
      let trialEndDate;
      if (tenant.trialEndsAt) {
        trialEndDate = new Date(tenant.trialEndsAt);
      } else {
        // Fallback: 14 dias a partir da criação da oficina
        trialEndDate = new Date(tenant.created_date || new Date());
        trialEndDate.setDate(trialEndDate.getDate() + 14);
      }

      if (new Date() > trialEndDate) {
        return Response.json({ 
          success: false, 
          error: { code: 'TRIAL_EXPIRED', message: 'Seu período de teste expirou. Faça um upgrade para continuar acessando os recursos.' } 
        }, { status: 403 });
      }
    }

    let planId = tenant.planId || 'free';
    const planStatus = tenant.planStatus || 'trial';

    // Validação de Integridade do Plano (Anti-Bypass do Frontend)
    if (planId !== 'free' && planId !== 'trial') {
        const tokenSecret = Deno.env.get("KIWIFY_CLIENT_SECRET") || "fallback_token_for_tests";
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey("raw", encoder.encode(tokenSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
        const hashBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(planId + tenant.id + planStatus));
        const expectedHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

        if (tenant.billing_secure_hash !== expectedHash) {
            console.warn(`[SECURITY] Fraude detectada no Workshop ${tenant.id}. Assinatura HMAC inválida! Downgrade automático para FREE.`);
            planId = 'free'; // Força o downgrade para a checagem de limites e funcionalidades
        }
    }

    // Buscar as definições do plano
    let plan = null;
    try {
      const plans = await base44.asServiceRole.entities.PlatformPlan.filter({ internal_id: planId }, undefined, 1);
      if (plans && plans.length > 0) plan = plans[0];
    } catch(e) {}

    // Fallback: se plano não cadastrado no banco, usa limites locais
    if (!plan) {
      plan = { limits: null, features: null };
    }

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
      if (!feature) {
        return Response.json({ 
          success: false, 
          error: { code: 'MISSING_FIELDS', message: 'Parâmetro "feature" é obrigatório para checar limites.' } 
        }, { status: 400 });
      }

      // 1) Estrutura Real de Limites por Plano
      const PLAN_LIMITS = {
        free: { clientes: 10, usuarios: 1, reports: 5, integrations: 1, whatsappMessages: 100 },
        pro: { clientes: 100, usuarios: 5, reports: 50, integrations: 5, whatsappMessages: 1000 },
        elite: { clientes: Infinity, usuarios: Infinity, reports: Infinity, integrations: Infinity, whatsappMessages: Infinity },
        start: { clientes: 100, usuarios: 5, reports: 20, integrations: 2, whatsappMessages: 500 },
        bronze: { clientes: Infinity, usuarios: 10, reports: 50, integrations: 5, whatsappMessages: 2000 },
        prata: { clientes: Infinity, usuarios: 20, reports: 100, integrations: 10, whatsappMessages: 5000 },
        gold: { clientes: Infinity, usuarios: 50, reports: Infinity, integrations: Infinity, whatsappMessages: 10000 },
        iom: { clientes: Infinity, usuarios: Infinity, reports: Infinity, integrations: Infinity, whatsappMessages: Infinity },
        millions: { clientes: Infinity, usuarios: Infinity, reports: Infinity, integrations: Infinity, whatsappMessages: Infinity },
      };

      const normalizedPlanId = String(planId).toLowerCase();
      // Prioriza limites do banco (PlatformPlan), senão usa a estrutura local
      let limit = plan.limits ? plan.limits[feature] : null;
      if (limit === null || limit === undefined) {
        const fallbackPlan = PLAN_LIMITS[normalizedPlanId] || PLAN_LIMITS['free'];
        limit = fallbackPlan ? fallbackPlan[feature] : Infinity;
      }
      
      // Busca a realidade no BD SEMPRE, ignorando eventuais payloads do client
      let finalUsage = 0;
      try {
          const usages = await base44.asServiceRole.entities.TenantUsage.filter({ tenant_id: tenantId, resource: feature });
          finalUsage = usages && usages.length > 0 ? usages[0].count : 0;
      } catch(e) {
          finalUsage = 0;
      }

      // Se o plano tiver o limite cadastrado e o uso atual for maior ou igual ao limite
      if (limit !== undefined && limit !== null && finalUsage >= limit) {
        // Formato padrão obrigatório
        return Response.json({ 
          success: false, 
          error: "limite_excedido", 
          message: "Você atingiu o limite do seu plano", 
          upgrade: true,
          details: `Limite de ${limit} para '${feature}' atingido.`
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