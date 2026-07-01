import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const rawBody = await req.text();

    // Validar assinatura HMAC do Kiwify
    const signature = req.headers.get('X-Kiwify-Signature') || req.headers.get('x-kiwify-signature');
    if (signature) {
      const secret = Deno.env.get("KIWIFY_CLIENT_SECRET") || "";
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      const hashBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
      const expectedSig = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
      if (signature !== expectedSig) {
        console.warn('[SECURITY] Kiwify webhook signature mismatch — rejecting request');
        return Response.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);
    
    console.log('Kiwify Webhook received:', payload);

    const { order_id, order_status, Customer } = payload;

    if (!order_id) {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const contracts = await base44.asServiceRole.entities.Contract.filter({
      kiwify_order_id: order_id
    });

    if (!contracts || contracts.length === 0) {
      console.log('Contract not found for order:', order_id);
      return Response.json({ success: true, message: 'Contract not found' });
    }

    const contract = contracts[0];
    const timeline = contract.timeline || [];

    let updateData = { timeline };

    switch (order_status) {
      case 'paid':
        updateData.payment_confirmed = true;
        updateData.payment_at = new Date().toISOString();
        updateData.status = 'pagamento_confirmado';
        updateData.completion_percentage = 100;
        
        timeline.push({
          date: new Date().toISOString(),
          action: 'Pagamento confirmado',
          description: `Pagamento confirmado via Kiwify`,
          user: 'Sistema'
        });

        // Disparar cronograma automaticamente ao confirmar pagamento
        if (contract.workshop_id && contract.plan_type) {
          console.log(`[Kiwify] Disparando cronograma para workshop ${contract.workshop_id} plano ${contract.plan_type}`);
          try {
            await base44.asServiceRole.functions.invoke('generateFullCronograma', {
              workshop_id: contract.workshop_id,
              plan_id: contract.plan_type
            });
            console.log(`[Kiwify] Cronograma gerado com sucesso`);
          } catch (cronErr) {
            console.error(`[Kiwify] Falha ao gerar cronograma:`, cronErr.message);
          }

          // Gerar bucket de atendimentos (ContractAttendance) para o plano ativado
          console.log(`[Kiwify] Gerando bucket de atendimentos para workshop ${contract.workshop_id}`);
          try {
            await base44.asServiceRole.functions.invoke('generateWorkshopAttendances', {
              workshop_id: contract.workshop_id
            });
            console.log(`[Kiwify] Bucket de atendimentos gerado com sucesso`);
          } catch (bucketErr) {
            console.error(`[Kiwify] Falha ao gerar bucket:`, bucketErr.message);
          }
        }
        break;

      case 'refused':
      case 'refunded':
        updateData.status = 'cancelado';
        timeline.push({
          date: new Date().toISOString(),
          action: 'Pagamento cancelado/reembolsado',
          description: `Status: ${order_status}`,
          user: 'Sistema'
        });
        break;

      case 'waiting_payment':
        timeline.push({
          date: new Date().toISOString(),
          action: 'Aguardando pagamento',
          description: 'Boleto gerado, aguardando pagamento',
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
    console.error('Error processing Kiwify webhook:', error);
    return Response.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
});