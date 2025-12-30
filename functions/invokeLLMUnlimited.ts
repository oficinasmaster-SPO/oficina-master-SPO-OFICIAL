import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import OpenAI from 'npm:openai@4.72.0';

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

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

    console.log("🤖 Chamando OpenAI diretamente (ilimitado)...");

    // Chamar OpenAI diretamente
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Você é um assistente especializado em processos operacionais e gestão de oficinas automotivas. Seja objetivo, claro e operacional."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      ...(response_json_schema && { 
        response_format: { type: "json_object" }
      })
    });

    const result = completion.choices[0].message.content;

    console.log("✅ OpenAI respondeu com sucesso");

    // Se esperava JSON, parsear
    if (response_json_schema) {
      try {
        return Response.json({ success: true, result: JSON.parse(result) }, { status: 200 });
      } catch (e) {
        return Response.json({ success: true, result }, { status: 200 });
      }
    }

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