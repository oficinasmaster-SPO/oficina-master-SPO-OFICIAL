import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validar se é dono de oficina
    const workshops = await base44.entities.Workshop.filter({ owner_id: user.id });
    if (!workshops || workshops.length === 0) {
      return Response.json({ 
        error: 'Apenas donos de oficina podem enviar evidências de finalização' 
      }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return Response.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    // Validar tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return Response.json({ 
        error: 'Tipo de arquivo não permitido. Apenas imagens (JPG, PNG) ou PDF.' 
      }, { status: 400 });
    }

    // Validar tamanho (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return Response.json({ 
        error: 'Arquivo muito grande. Máximo 10MB.' 
      }, { status: 400 });
    }

    // Upload via integração Core.UploadFile
    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    return Response.json({ 
      success: true,
      file_url,
      file_name: file.name,
      file_size: file.size,
      uploaded_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro no upload de evidência:', error);
    return Response.json({ 
      error: error?.message || 'Erro ao fazer upload' 
    }, { status: 500 });
  }
});