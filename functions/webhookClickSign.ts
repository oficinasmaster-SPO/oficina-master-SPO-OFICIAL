import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const payload = await req.json();
    
    console.log('ClickSign Webhook received:', payload);

    const { event, document } = payload;

    if (!document || !document.key) {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Buscar contrato pelo clicksign_contract_id
    const contracts = await base44.asServiceRole.entities.Contract.filter({
      clicksign_contract_id: document.key
    });

    if (!contracts || contracts.length === 0) {
      console.log('Contract not found for document key:', document.key);
      return Response.json({ success: true, message: 'Contract not found' });
    }

    const contract = contracts[0];
    const timeline = contract.timeline || [];

    let updateData = { timeline };

    // Processar eventos
    switch (event.name) {
      case 'sign':
        updateData.client_signed = true;
        updateData.signed_at = new Date().toISOString();
        updateData.status = 'assinado';
        updateData.completion_percentage = Math.max(contract.completion_percentage || 0, 66);
        
        timeline.push({
          date: new Date().toISOString(),
          action: 'Contrato assinado',
          description: `Assinado por ${event.data?.signer?.email || 'cliente'}`,
          user: 'Sistema'
        });
        break;

      case 'complete':
        updateData.status = 'assinado';
        updateData.completion_percentage = 66;
        
        timeline.push({
          date: new Date().toISOString(),
          action: 'Assinaturas completas',
          description: 'Todas as assinaturas foram coletadas',
          user: 'Sistema'
        });
        break;

      case 'cancel':
        updateData.status = 'cancelado';
        
        timeline.push({
          date: new Date().toISOString(),
          action: 'Contrato cancelado',
          description: 'Processo de assinatura cancelado',
          user: 'Sistema'
        });
        break;

      default:
        console.log('Unhandled event:', event.name);
    }

    // Atualizar contrato
    await base44.asServiceRole.entities.Contract.update(contract.id, updateData);

    return Response.json({ 
      success: true,
      message: 'Webhook processed successfully'
    });

  } catch (error) {
    console.error('Error processing ClickSign webhook:', error);
    return Response.json({ 
      error: error.message || 'Erro ao processar webhook'
    }, { status: 500 });
  }
});