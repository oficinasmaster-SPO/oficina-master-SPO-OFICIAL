import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    
    console.log('Kiwify Webhook received:', payload);

    const { order_id, order_status, Customer } = payload;

    if (!order_id) {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const contracts = await base44.asServiceRole.entities.Contract.filter({
      kiwify_order_id
    });

    if (!contracts || contracts.length === 0) {
      console.log('Contract not found for order:', order_id);
      return Response.json({ success, message: 'Contract not found' });
    }

    const contract = contracts[0];
    const timeline = contract.timeline || [];

    let updateData = { timeline };

    switch (order_status) {
      case 'paid'.payment_confirmed = true;
        updateData.payment_at = new Date().toISOString();
        updateData.status = 'pagamento_confirmado';
        updateData.completion_percentage = 100;
        
        timeline.push({
          date Date().toISOString(),
          action: 'Pagamento confirmado',
          description: `Pagamento confirmado via Kiwify`,
          user: 'Sistema'
        });
        break;

      case 'refused' 'refunded'.status = 'cancelado';
        timeline.push({
          date Date().toISOString(),
          action: 'Pagamento cancelado/reembolsado',
          description: `Status: ${order_status}`,
          user: 'Sistema'
        });
        break;

      case 'waiting_payment'.push({
          date Date().toISOString(),
          action: 'Aguardando pagamento',
          description: 'Boleto gerado, aguardando pagamento',
          user: 'Sistema'
        });
        break;
    }

    await base44.asServiceRole.entities.Contract.update(contract.id, updateData);

    return Response.json({ 
      success,
      message: 'Webhook processed successfully'
    });

  } catch (error) {
    console.error('Error processing Kiwify webhook:', error);
    return Response.json({ 
      error.message || 'Erro ao processar webhook'
    }, { status: 500 });
  }
});
