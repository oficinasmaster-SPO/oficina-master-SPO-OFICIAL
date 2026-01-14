import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { fileName, fileContent, filePath } = await req.json();

    if (!fileName || (!fileContent && !filePath)) {
      return Response.json({ 
        error: 'Nome do arquivo e conteúdo/caminho são obrigatórios' 
      }, { status: 400 });
    }

    // Buscar chave API
    const settings = await base44.asServiceRole.entities.SystemSetting.filter({
      key: 'clicksign_api_key'
    });

    if (!settings || settings.length === 0) {
      return Response.json({ 
        error: 'Chave API do ClickSign não configurada' 
      }, { status: 400 });
    }

    const apiKey = settings[0].value;

    // Upload do documento
    const formData = new FormData();
    
    if (fileContent) {
      // Se for base64 ou buffer
      const fileBlob = new Blob([fileContent]);
      formData.append('document[archive][original]', fileBlob, fileName);
    } else if (filePath) {
      // Se for URL do arquivo
      const fileResponse = await fetch(filePath);
      const fileBlob = await fileResponse.blob();
      formData.append('document[archive][original]', fileBlob, fileName);
    }

    formData.append('document[path]', `/${fileName}`);

    const response = await fetch('https://api.clicksign.com/v3/documents', {
      method: 'POST',
      headers: {
        'Authorization': apiKey
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      return Response.json({ 
        success: false,
        error: errorData.message || 'Erro ao enviar documento'
      }, { status: response.status });
    }

    const documentData = await response.json();

    return Response.json({ 
      success: true,
      document: documentData.document,
      message: 'Documento enviado com sucesso'
    });

  } catch (error) {
    console.error('Error uploading document:', error);
    return Response.json({ 
      success: false,
      error: error.message || 'Erro ao enviar documento'
    }, { status: 500 });
  }
});