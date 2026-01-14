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

    // Listar documentos do ClickSign
    const response = await fetch('https://api.clicksign.com/v1/documents?limit=20', {
      method: 'GET',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      return Response.json({ 
        success: false,
        error: 'Erro ao listar documentos',
        details: errorData 
      }, { status: 400 });
    }

    const data = await response.json();
    
    // Formatar documentos
    const documents = (data.data || []).map(doc => ({
      key: doc.document?.key || doc.key,
      name: doc.document?.filename || doc.filename || 'Sem nome',
      status: doc.document?.status?.name || doc.status?.name || 'unknown',
      created_at: doc.document?.created_at || doc.created_at,
      downloads: doc.document?.downloads || doc.downloads || []
    }));

    return Response.json({ 
      success: true,
      documents,
      count: documents.length
    });

  } catch (error) {
    console.error('Error listing documents:', error);
    return Response.json({ 
      success: false,
      error: error.message || 'Erro ao listar documentos'
    }, { status: 500 });
  }
});