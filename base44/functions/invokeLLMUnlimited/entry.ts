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
    console.log("🔵 Início da função invokeLLMUnlimited");
    const base44 = createClientFromRequest(req);
    
    // Verificar autenticação
    console.log("🔐 Verificando autenticação...");
    let user;
    try {
      user = await base44.auth.me();
      console.log("✅ Usuário autenticado:", user?.email);
    } catch (authError) {
      console.error("❌ Erro de autenticação:", authError.message);
      return Response.json({ error: 'Unauthorized', details: authError.message }, { status: 401 });
    }
    
    if (!user) {
      console.error("❌ Usuário não autenticado");
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse do payload
    console.log("📦 Parseando payload...");
    const payload = await req.json();
    const { prompt, response_json_schema = null } = payload;
    console.log("📝 Prompt recebido, tamanho:", prompt?.length || 0);

    // Ignorar tenantId ou workshop_id do payload/headers e obter APENAS do usuário autenticado
    const workshop_id = user.data?.workshop_id;

    if (!workshop_id) {
      console.error("❌ Usuário sem workshop_id tentando usar IA");
      return Response.json({ error: 'Forbidden: Usuário não vinculado a um tenant' }, { status: 403 });
    }

    // Bloquear divergências se o frontend tentar enviar algo diferente
    const payloadWorkshopId = payload.workshop_id || payload.tenantId;
    const headerTenantId = req.headers.get("x-tenant-id");

    if ((payloadWorkshopId && payloadWorkshopId !== workshop_id) || (headerTenantId && headerTenantId !== workshop_id)) {
       console.error("❌ Tentativa de burla de tenant (divergência entre token e request)");
       return Response.json({ error: 'Forbidden: Tenant mismatch detectado' }, { status: 403 });
    }

    // Verificação de Rate Limit (Usuário)
    if (!checkRateLimit(userLimits, user.id, USER_MAX_PER_MINUTE)) {
      console.error(`❌ Rate limit excedido para o usuário: ${user.id}`);
      return Response.json({ error: 'Too Many Requests: Limite de uso de IA por usuário excedido. Aguarde 1 minuto.' }, { status: 429 });
    }

    // Verificação de Rate Limit (Tenant) - Usando apenas o valor seguro
    if (!checkRateLimit(tenantLimits, workshop_id, TENANT_MAX_PER_MINUTE)) {
      console.error(`❌ Rate limit excedido para a oficina: ${workshop_id}`);
      return Response.json({ error: 'Too Many Requests: Limite de uso de IA por oficina excedido. Aguarde 1 minuto.' }, { status: 429 });
    }

    if (!prompt) {
      return Response.json({ error: 'Prompt is required' }, { status: 400 });
    }

    console.log("🤖 Chamando integração Base44 InvokeLLM (ilimitado via service role)...");

    // Usar a integração Base44 com service role para não contar créditos do usuário
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: response_json_schema || undefined
    });

    console.log("✅ LLM respondeu com sucesso");

    return Response.json({ success: true, result }, { status: 200 });

  } catch (error) {
    console.error("❌ ERRO CRÍTICO na função:", error);
    return Response.json({ 
      error: 'Internal server error'
    }, { status: 500 });
  }
});