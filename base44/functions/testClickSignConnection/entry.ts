import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { apiKey } = await req.json();

    if (!apiKey) {
      return Response.json({ error: 'API Key é obrigatória' }, { status: 400 });
    }

    // Testar conexão com ClickSign
    const response = await fetch('https://api.clicksign.com/v1/documents', {
      method: 'GET',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return Response.json({ 
        success: false,
        error: 'API Key inválida ou sem permissões'
      }, { status: 400 });
    }

    return Response.json({ 
      success: true,
      message: 'Conexão estabelecida com sucesso'
    });

  } catch (error) {
    console.error('Error testing ClickSign connection:', error);
    return Response.json({ 
      success: false,
      error: error.message || 'Erro ao testar conexão'
    }, { status: 500 });
  }
});