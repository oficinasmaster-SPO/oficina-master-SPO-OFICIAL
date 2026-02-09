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

    // Salvar configuração em SystemSetting
    await base44.asServiceRole.entities.SystemSetting.create({
      key: 'clicksign_api_key',
      value,
      encrypted,
      updated_by.email
    });

    return Response.json({ 
      success,
      message: 'Configuração salva com sucesso'
    });

  } catch (error) {
    console.error('Error saving ClickSign config:', error);
    return Response.json({ 
      error.message || 'Erro ao salvar configuração'
    }, { status: 500 });
  }
});
