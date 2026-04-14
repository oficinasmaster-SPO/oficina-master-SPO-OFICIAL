import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const data = await req.json();
        const { contrato_id } = data;

        if (!contrato_id) return Response.json({ error: 'contrato_id é obrigatório' }, { status: 400 });

        const contract = await base44.asServiceRole.entities.Contract.get(contrato_id);
        
        if (!contract) return Response.json({ error: 'Contrato não encontrado' }, { status: 404 });

        const meses = contract.meses || contract.contract_duration_months || 1;
        const valor_parcela = contract.valor_parcela !== undefined ? contract.valor_parcela : (contract.installment_value || 0);
        const taxa_setup = contract.taxa_setup !== undefined ? contract.taxa_setup : (contract.setup_fee || 0);
        const tenant_id = contract.tenant_id || contract.workshop_id;
        const start_date = contract.start_date || new Date().toISOString();

        const cobrancasToCreate = [];

        // Cobrança da Taxa de Setup
        if (taxa_setup > 0) {
            cobrancasToCreate.push({
                tenant_id,
                contrato_id,
                valor: taxa_setup,
                data_vencimento: start_date, // setup para a mesma data de início
                status: 'pendente',
                metodo_pagamento: contract.payment_method || 'pix'
            });
        }

        // Cobranças Mensais Recorrentes
        let currentDate = new Date(start_date);
        for (let i = 0; i < meses; i++) {
            let dueDate = new Date(currentDate);
            dueDate.setMonth(dueDate.getMonth() + i); // Adiciona N meses
            
            cobrancasToCreate.push({
                tenant_id,
                contrato_id,
                valor: valor_parcela,
                data_vencimento: dueDate.toISOString().split('T')[0],
                status: 'pendente',
                metodo_pagamento: contract.payment_method || 'pix'
            });
        }

        const createdCobrancas = await base44.asServiceRole.entities.Billing.bulkCreate(cobrancasToCreate);

        return Response.json({ success: true, cobrancas: createdCobrancas });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});