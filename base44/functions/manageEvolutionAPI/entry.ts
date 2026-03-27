import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.role !== 'socio_interno' && user.role !== 'gerente' && user.role !== 'diretor')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, instanceName } = await req.json();

    const apiUrl = Deno.env.get("EVOLUTION_API_URL");
    const apiKey = Deno.env.get("EVOLUTION_API_KEY");

    if (!apiUrl || !apiKey) {
      return Response.json({ error: 'Configuração da Evolution API ausente no servidor.' }, { status: 500 });
    }

    let result;

    switch (action) {
      case 'create': {
        const response = await fetch(`${apiUrl}/instance/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': apiKey
          },
          body: JSON.stringify({
            instanceName,
            qrcode: true,
            integration: 'WHATSAPP-BAILEYS'
          })
        });
        result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Erro ao criar instância');
        break;
      }
      case 'connect': {
        const response = await fetch(`${apiUrl}/instance/connect/${instanceName}`, {
          method: 'GET',
          headers: { 'apikey': apiKey }
        });
        result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Erro ao buscar QR Code');
        break;
      }
      case 'state': {
        const response = await fetch(`${apiUrl}/instance/connectionState/${instanceName}`, {
          method: 'GET',
          headers: { 'apikey': apiKey }
        });
        result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Erro ao verificar conexão');
        break;
      }
      case 'logout': {
        const response = await fetch(`${apiUrl}/instance/logout/${instanceName}`, {
          method: 'DELETE',
          headers: { 'apikey': apiKey }
        });
        result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Erro ao desconectar');
        break;
      }
      case 'delete': {
        const response = await fetch(`${apiUrl}/instance/delete/${instanceName}`, {
          method: 'DELETE',
          headers: { 'apikey': apiKey }
        });
        result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Erro ao deletar');
        break;
      }
      default:
        return Response.json({ error: 'Ação inválida' }, { status: 400 });
    }

    return Response.json(result, { status: 200 });

  } catch (error) {
    console.error("Erro:", error);
    return Response.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
});