import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { apiKey, content } = await req.json();

    if (!apiKey) {
      return Response.json({ error: 'API Key é obrigatória' }, { status: 400 });
    }

    // Converter conteúdo para base64
    const encoder = new TextEncoder();
    const data = encoder.encode(content || 'Documento de Teste - Oficinas Master');
    const base64Content = btoa(String.fromCharCode(...data));

    // Criar documento no ClickSign
    const response = await fetch('https://api.clicksign.com/v1/documents', {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        document: {
          path: `/teste/documento_teste_${Date.now()}.pdf`,
          content_base64: base64Content,
          deadline_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          auto_close: false,
          locale: 'pt-BR',
          sequence_enabled: false
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return Response.json({ 
        success: false,
        error: 'Erro ao criar documento',
        details: errorData 
      }, { status: 400 });
    }

    const responseData = await response.json();
    const documentKey = responseData.document.key;

    // Adicionar signatário teste
    await fetch(`https://api.clicksign.com/v1/lists`, {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        list: {
          document_key: documentKey,
          signer: {
            email: user.email,
            name: user.full_name || 'Teste',
            auths: ['email']
          },
          sign_as: 'sign'
        }
      })
    });

    return Response.json({ 
      success: true,
      documentKey,
      signLink: `https://app.clicksign.com/sign/${documentKey}`,
      message: 'Documento de teste criado com sucesso!'
    });

  } catch (error) {
    console.error('Error sending test document:', error);
    return Response.json({ 
      success: false,
      error: error.message || 'Erro ao enviar documento'
    }, { status: 500 });
  }
});