import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { contractId } = await req.json();

    if (!contractId) {
      return Response.json({ error: 'Contract ID é obrigatório' }, { status: 400 });
    }

    // Buscar configuração do ClickSign
    const settings = await base44.asServiceRole.entities.SystemSetting.filter({ 
      key: 'clicksign_api_key' 
    });
    
    if (!settings || settings.length === 0) {
      return Response.json({ 
        error: 'ClickSign não configurado. Configure em Integrações.' 
      }, { status: 400 });
    }

    const apiKey = settings[0].value;

    // Buscar contrato
    const contract = await base44.asServiceRole.entities.Contract.get(contractId);
    
    if (!contract) {
      return Response.json({ error: 'Contrato não encontrado' }, { status: 404 });
    }

    // Gerar PDF do contrato usando template
    const pdfContent = contract.contract_template || '';
    const pdfBase64 = btoa(unescape(encodeURIComponent(pdfContent)));

    // Enviar para ClickSign
    const clicksignResponse = await fetch('https://api.clicksign.com/v1/documents', {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        document: {
          path: `/contratos/contrato_${contract.contract_number}.pdf`,
          content_base64: pdfBase64,
          deadline_at: contract.end_date,
          auto_close: true,
          locale: 'pt-BR',
          sequence_enabled: false
        }
      })
    });

    if (!clicksignResponse.ok) {
      const errorData = await clicksignResponse.json();
      return Response.json({ 
        error: 'Erro ao enviar para ClickSign',
        details: errorData 
      }, { status: 400 });
    }

    const clicksignData = await clicksignResponse.json();
    const documentKey = clicksignData.document.key;

    // Adicionar signatários
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
            email: contract.workshop_id, // email da oficina
            name: contract.workshop_name,
            documentation: contract.workshop_id,
            birthday: null,
            has_documentation: true,
            phone_number: null,
            auths: ['email']
          },
          sign_as: 'sign'
        }
      })
    });

    // Atualizar contrato com informações do ClickSign
    await base44.asServiceRole.entities.Contract.update(contractId, {
      clicksign_contract_id: documentKey,
      status: 'enviado',
      sent_at: new Date().toISOString(),
      contract_link: `https://app.clicksign.com/sign/${documentKey}`
    });

    // Adicionar à timeline
    const timeline = contract.timeline || [];
    timeline.push({
      date: new Date().toISOString(),
      action: 'Enviado para assinatura',
      description: 'Contrato enviado para ClickSign',
      user: user.email
    });

    await base44.asServiceRole.entities.Contract.update(contractId, { timeline });

    return Response.json({ 
      success: true,
      documentKey,
      signLink: `https://app.clicksign.com/sign/${documentKey}`,
      message: 'Contrato enviado para assinatura com sucesso'
    });

  } catch (error) {
    console.error('Error sending contract to ClickSign:', error);
    return Response.json({ 
      error: error.message || 'Erro ao enviar contrato'
    }, { status: 500 });
  }
});