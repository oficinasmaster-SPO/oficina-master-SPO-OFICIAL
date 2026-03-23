import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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
    const { prompt, response_json_schema = null } = await req.json();
    console.log("📝 Prompt recebido, tamanho:", prompt?.length || 0);

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
    console.error("❌ Stack:", error.stack);
    console.error("❌ Tipo:", error.constructor.name);
    return Response.json({ 
      error: error.message || 'Internal server error',
      details: error.toString(),
      stack: error.stack
    }, { status: 500 });
  }
});