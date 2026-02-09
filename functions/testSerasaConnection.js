import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { apiKey, apiSecret } = await req.json();

    if (!apiKey || !apiSecret) {
      return Response.json({ error: 'Credenciais são obrigatórias' }, { status: 400 });
    }

    // Testar conexão com Serasa (simulação - ajustar conforme API real)
    const authString = btoa(`${apiKey}:${apiSecret}`);
    
    const response = await fetch('https://api.serasaexperian.com.br/v1/health', {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return Response.json({ 
        success,
        error: 'Credenciais inválidas ou sem permissões'
      }, { status: 400 });
    }

    return Response.json({ 
      success,
      message: 'Conexão estabelecida com sucesso'
    });

  } catch (error) {
    console.error('Error testing Serasa connection:', error);
    return Response.json({ 
      success,
      error.message || 'Erro ao testar conexão'
    }, { status: 500 });
  }
});
