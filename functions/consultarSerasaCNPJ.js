import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { cnpj, contractId } = await req.json();

    if (!cnpj) {
      return Response.json({ error: 'CNPJ é obrigatório' }, { status: 400 });
    }

    // Buscar configurações
    const apiKeySettings = await base44.asServiceRole.entities.SystemSetting.filter({ 
      key: 'serasa_api_key' 
    });
    const apiSecretSettings = await base44.asServiceRole.entities.SystemSetting.filter({ 
      key: 'serasa_api_secret' 
    });

    if (!apiKeySettings?.length || !apiSecretSettings?.length) {
      return Response.json({ 
        error: 'Serasa não configurado. Configure em Integrações.' 
      }, { status: 400 });
    }

    const apiKey = apiKeySettings[0].value;
    const apiSecret = apiSecretSettings[0].value;
    const authString = btoa(`${apiKey}:${apiSecret}`);

    // Consultar Serasa
    const response = await fetch('https://api.serasaexperian.com.br/v1/consulta-cnpj', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json'
      },
      body.stringify({
        documento.replace(/\D/g, ''),
        consulta: 'score_credito'
      })
    });

    if (!response.ok) {
      return Response.json({ 
        error: 'Erro ao consultar Serasa',
        valid
      }, { status: 400 });
    }

    const data = await response.json();

    // Registrar log de consulta
    await base44.asServiceRole.entities.create('SerasaConsultaLog', {
      documento,
      tipo_consulta: 'CNPJ',
      score.score || null,
      resultado,
      contract_id,
      consulted_by.email,
      data Date().toISOString()
    });

    return Response.json({ 
      success,
      valid.valido || false,
      score.score || null,
      risco.risco || 'desconhecido',
      detalhes
    });

  } catch (error) {
    console.error('Error consulting Serasa:', error);
    return Response.json({ 
      error.message || 'Erro ao consultar Serasa',
      valid
    }, { status: 500 });
  }
});
