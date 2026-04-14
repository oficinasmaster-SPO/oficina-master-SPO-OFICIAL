import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const data = await req.json();
        const { tenant_id, cliente_id, plano, meses, valor_parcela, taxa_setup, ...otherData } = data;

        // ⚠️ VALIDAÇÕES CRÍTICAS
        if (!tenant_id) return Response.json({ error: 'tenant_id é obrigatório' }, { status: 400 });
        if (!cliente_id) return Response.json({ error: 'cliente_id é obrigatório' }, { status: 400 });
        if (!meses || meses <= 0) return Response.json({ error: 'meses deve ser maior que 0' }, { status: 400 });
        if (valor_parcela === undefined || valor_parcela < 0) return Response.json({ error: 'valor_parcela não pode ser negativo' }, { status: 400 });
        const setup = taxa_setup || 0;
        if (setup < 0) return Response.json({ error: 'taxa_setup não pode ser negativa' }, { status: 400 });

        // 🧠 CÁLCULOS (BACKEND)
        const mrr = valor_parcela;
        const valor_total = (valor_parcela * meses) + setup;
        const ltv = mrr * meses;

        // 3. Salva contrato
        const contractData = {
            ...otherData,
            tenant_id,
            cliente_id,
            plano,
            meses,
            contract_duration_months: meses,
            valor_parcela,
            installment_value: valor_parcela,
            taxa_setup: setup,
            setup_fee: setup,
            valor_total,
            mrr,
            ltv,
            version: 1,
            status: data.status || 'ativo'
        };

        const newContract = await base44.asServiceRole.entities.Contract.create(contractData);

        // 4. Gera cobranças automaticamente (chama billingService)
        await base44.asServiceRole.functions.invoke('gerarCobrancas', { contrato_id: newContract.id });

        return Response.json({ success: true, contract: newContract });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});