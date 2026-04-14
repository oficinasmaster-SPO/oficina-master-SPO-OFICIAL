import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const data = await req.json();
        const { contract_id, updates } = data;

        if (!contract_id) return Response.json({ error: 'contract_id é obrigatório' }, { status: 400 });

        // Recupera o contrato antigo
        const oldContract = await base44.asServiceRole.entities.Contract.get(contract_id);
        
        if (!oldContract) {
            return Response.json({ error: 'Contrato não encontrado' }, { status: 404 });
        }

        // Merge dos dados antigos com as novas alterações
        const mergedData = { ...oldContract, ...updates };

        // Extrai campos para cálculo e validação
        const tenant_id = mergedData.tenant_id || mergedData.workshop_id;
        const cliente_id = mergedData.cliente_id || mergedData.workshop_id;
        const meses = mergedData.meses || mergedData.contract_duration_months;
        const valor_parcela = mergedData.valor_parcela !== undefined ? mergedData.valor_parcela : mergedData.installment_value;
        const taxa_setup = mergedData.taxa_setup !== undefined ? mergedData.taxa_setup : (mergedData.setup_fee || 0);
        
        if (!tenant_id) return Response.json({ error: 'tenant_id é obrigatório' }, { status: 400 });
        if (!cliente_id) return Response.json({ error: 'cliente_id é obrigatório' }, { status: 400 });
        if (!meses || meses <= 0) return Response.json({ error: 'meses deve ser maior que 0' }, { status: 400 });
        if (valor_parcela === undefined || valor_parcela < 0) return Response.json({ error: 'valor_parcela inválido' }, { status: 400 });
        if (taxa_setup < 0) return Response.json({ error: 'taxa_setup inválida' }, { status: 400 });

        // 🧠 CÁLCULOS
        const mrr = valor_parcela;
        const valor_total = (valor_parcela * meses) + taxa_setup;
        const ltv = mrr * meses;

        // Marca contrato atual como versionado / inativo para não conflitar as cobranças
        await base44.asServiceRole.entities.Contract.update(oldContract.id, { status: 'versionado' });

        // 🔄 VERSIONAMENTO DE CONTRATOS (Criar nova versão)
        const newContractData = {
            ...mergedData,
            tenant_id,
            cliente_id,
            meses,
            valor_parcela,
            taxa_setup,
            valor_total,
            mrr,
            ltv,
            version: (oldContract.version || 1) + 1,
            parent_contract_id: oldContract.id,
            status: 'ativo'
        };
        
        // Remove ids sistêmicos para criar como um novo registro
        delete newContractData.id;
        delete newContractData.created_date;
        delete newContractData.updated_date;
        delete newContractData.created_by;

        const newContract = await base44.asServiceRole.entities.Contract.create(newContractData);

        // Gera novas cobranças
        await base44.asServiceRole.functions.invoke('gerarCobrancas', { contrato_id: newContract.id });

        return Response.json({ success: true, contract: newContract });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});