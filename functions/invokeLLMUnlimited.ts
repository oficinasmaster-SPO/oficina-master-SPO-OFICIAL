import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verificar autenticação
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse do payload
    const { prompt, add_context_from_internet = false, response_json_schema = null, file_urls = null } = await req.json();

    if (!prompt) {
      return Response.json({ error: 'Prompt is required' }, { status: 400 });
    }

    console.log("🤖 Chamando LLM via backend (ilimitado)...");

    // Usar service role para bypass de limites
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet,
      response_json_schema,
      file_urls
    });

    console.log("✅ LLM respondeu com sucesso");

    return Response.json({ success: true, result }, { status: 200 });

  } catch (error) {
    console.error("❌ Erro ao invocar LLM:", error);
    return Response.json({ 
      error: error.message || 'Internal server error',
      details: error.toString()
    }, { status: 500 });
  }
});