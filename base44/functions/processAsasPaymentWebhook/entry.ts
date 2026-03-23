import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    
    console.log('ASAS Webhook received:', payload);

    const { event, payment } = payload;

    if (!payment || !payment.id) {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const contracts = await base44.asServiceRole.entities.Contract.filter({
      asas_payment_id: payment.id
    });

    if (!contracts || contracts.length === 0) {
      console.log('Contract not found for payment:', payment.id);
      return Response.json({ success: true, message: 'Contract not found' });
    }

    const contract = contracts[0];
    const timeline = contract.timeline || [];

    let updateData = { timeline };

    switch (event) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED':
        updateData.payment_confirmed = true;
        updateData.payment_at = new Date().toISOString();
        updateData.status = 'pagamento_confirmado';
        updateData.completion_percentage = 100;
        
        timeline.push({
          date: new Date().toISOString(),
          action: 'Pagamento confirmado',
          description: `Pagamento confirmado via ASAS - R$ ${payment.value}`,
          user: 'Sistema'
        });
        break;

      case 'PAYMENT_OVERDUE':
        timeline.push({
          date: new Date().toISOString(),
          action: 'Pagamento atrasado',
          description: 'Pagamento em atraso',
          user: 'Sistema'
        });
        break;

      case 'PAYMENT_DELETED':
        updateData.status = 'cancelado';
        timeline.push({
          date: new Date().toISOString(),
          action: 'Pagamento cancelado',
          description: 'Pagamento cancelado',
          user: 'Sistema'
        });
        break;
    }

    await base44.asServiceRole.entities.Contract.update(contract.id, updateData);

    return Response.json({ 
      success: true,
      message: 'Webhook processed successfully'
    });

  } catch (error) {
    console.error('Error processing ASAS webhook:', error);
    return Response.json({ 
      error: error.message || 'Erro ao processar webhook'
    }, { status: 500 });
  }
});