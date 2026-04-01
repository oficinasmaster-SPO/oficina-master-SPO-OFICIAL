import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Controle de Rate Limit em memória para proteção contra loops
const userLimits = new Map();
const tenantLimits = new Map();

const USER_MAX_PER_MINUTE = 10;
const TENANT_MAX_PER_MINUTE = 30;

function checkRateLimit(map, key, maxCount) {
    if (!key) return true;
    
    const now = Date.now();
    const minute = Math.floor(now / 60000);
    const windowKey = `${key}:${minute}`;

    const currentCount = map.get(windowKey) || 0;
    
    if (currentCount >= maxCount) {
        return false;
    }

    map.set(windowKey, currentCount + 1);

    // Limpeza de memória leve (chaves antigas)
    if (Math.random() < 0.05) {
        for (const k of map.keys()) {
            const kMinute = parseInt(k.split(':')[1]);
            if (kMinute < minute - 1) {
                map.delete(k);
            }
        }
    }

    return true;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verificar autenticação
    let user;
    try {
      user = await base44.auth.me();
    } catch (authError) {
      return Response.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
    }
    
    if (!user || !user.id) {
      return Response.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
    }

    // Parse do payload
    let payload;
    try {
      payload = await req.json();
    } catch(e) {
      return Response.json({ success: false, error: { code: 'INVALID_INPUT', message: 'Payload inválido' } }, { status: 400 });
    }
    const { prompt, response_json_schema = null } = payload;

    // Ignorar tenantId ou workshop_id do payload/headers e obter APENAS do usuário autenticado
    const workshop_id = user.data?.workshop_id;

    if (!workshop_id) {
      return Response.json({ success: false, error: { code: 'FORBIDDEN', message: 'Usuário não vinculado a um tenant' } }, { status: 403 });
    }

    // Bloquear divergências se o frontend tentar enviar algo diferente
    const payloadWorkshopId = payload.workshop_id || payload.tenantId;
    const headerTenantId = req.headers.get("x-tenant-id");

    if ((payloadWorkshopId && payloadWorkshopId !== workshop_id) || (headerTenantId && headerTenantId !== workshop_id)) {
       return Response.json({ success: false, error: { code: 'FORBIDDEN', message: 'Tenant mismatch detectado' } }, { status: 403 });
    }

    // Verificação de Rate Limit (Usuário)
    if (!checkRateLimit(userLimits, user.id, USER_MAX_PER_MINUTE)) {
      return Response.json({ success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Limite de uso de IA por usuário excedido. Aguarde 1 minuto.' } }, { status: 429 });
    }

    // Verificação de Rate Limit (Tenant) - Usando apenas o valor seguro
    if (!checkRateLimit(tenantLimits, workshop_id, TENANT_MAX_PER_MINUTE)) {
      return Response.json({ success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Limite de uso de IA por oficina excedido. Aguarde 1 minuto.' } }, { status: 429 });
    }

    // Validação de Plano
    if (workshop_id) {
        try {
            const planCheck = await base44.functions.invoke('checkPlanAccess', {
                tenantId: workshop_id,
                feature: 'integrations',
                action: 'check_feature'
            });
            if (!planCheck.data?.success) {
                return Response.json({
                    success: false,
                    error: {
                        code: "PLAN_RESTRICTION",
                        message: "Limite do plano atingido"
                    }
                }, { status: 403 });
            }
        } catch (e) {
            console.error("Erro na validação do plano:", e);
        }
    }

    if (!prompt || typeof prompt !== 'string' || prompt.length > 50000) {
      return Response.json({ success: false, error: { code: 'MISSING_FIELDS', message: 'Prompt is required and must be a valid string' } }, { status: 400 });
    }

    // Usar a integração Base44 com service role para não contar créditos do usuário
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: response_json_schema || undefined
    });

    await base44.asServiceRole.functions.invoke('logIntegrationUsage', {
      function_name: 'invokeLLMUnlimited',
      provider: 'base44_llm',
      workshop_id,
      user_id: user.id,
      request_kind: response_json_schema ? 'structured_llm' : 'text_llm',
      estimated_units: 1,
      success: true
    }).catch(() => {});

    return Response.json({ success: true, data: result }, { status: 200 });

  } catch (error) {
    return Response.json({ 
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }
    }, { status: 500 });
  }
});