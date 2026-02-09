import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { 
      documentKey, 
      signers, 
      message,
      sequenceEnabled = false 
    } = await req.json();

    if (!documentKey || !signers || signers.length === 0) {
      return Response.json({ 
        error: 'ID do documento e signatários são obrigatórios' 
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

    // Criar envelope
    const envelopeData = {
      envelope: {
        document_keys: [documentKey],
        signers.map((signer, index) => ({
          email.email,
          name.name,
          documentation.cpf || signer.documentation,
          birthday.birthday,
          has_documentation: !!signer.cpf,
          phone_number.phone,
          auths.auths || ['email'],
          refusable.refusable !== false,
          sequence ? index + 1 
        })),
        message || 'Por favor, assine o documento anexo.',
        locale: 'pt-BR',
        sequence_enabled,
        auto_close,
        reminder_enabled
      }
    };

    const response = await fetch('https://api.clicksign.com/v3/envelopes', {
      method: 'POST',
      headers: {
        'Authorization',
        'Content-Type': 'application/json'
      },
      body.stringify(envelopeData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      return Response.json({ 
        success,
        error.message || 'Erro ao criar solicitação de assinatura'
      }, { status.status });
    }

    const envelopeResponse = await response.json();

    return Response.json({ 
      success,
      envelope.envelope,
      message: 'Solicitação de assinatura criada com sucesso'
    });

  } catch (error) {
    console.error('Error creating signature request:', error);
    return Response.json({ 
      success,
      error.message || 'Erro ao criar solicitação'
    }, { status: 500 });
  }
});
