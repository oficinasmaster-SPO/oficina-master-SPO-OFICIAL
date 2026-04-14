import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const data = await req.json();
        const { cobranca_id, status } = data;

        if (!cobranca_id || !status) {
            return Response.json({ error: 'cobranca_id e status são obrigatórios' }, { status: 400 });
        }

        const validStatuses = ['pendente', 'pago', 'vencido'];
        if (!validStatuses.includes(status)) {
            return Response.json({ error: 'Status inválido' }, { status: 400 });
        }

        const updated = await base44.asServiceRole.entities.Billing.update(cobranca_id, { status });

        return Response.json({ success: true, cobranca: updated });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});