import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { api_url, api_key } = await req.json();

    // Se receber credenciais, testar com elas
    const testUrl = api_url || Deno.env.get("ACTIVECAMPAIGN_API_URL");
    const testKey = api_key || Deno.env.get("ACTIVECAMPAIGN_API_KEY");

    if (!testUrl || !testKey) {
      return Response.json({
        success: false,
        error: "Credenciais do ActiveCampaign não configuradas"
      });
    }

    // Testar conexão fazendo uma chamada simples à API
    const response = await fetch(`${testUrl}/api/3/users/me`, {
      headers: {
        'Api-Token': testKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return Response.json({
        success: false,
        error: `Erro na API: ${response.status} ${response.statusText}`
      });
    }

    const data = await response.json();

    return Response.json({
      success: true,
      api_url: testUrl,
      account: data.user?.email || "Conectado"
    });

  } catch (error) {
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});