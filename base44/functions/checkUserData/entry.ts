import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const history = await base44.asServiceRole.entities.MonthlyGoalHistory.filter({ created_by: "tatybc2008@gmail.com" });
        const vendas = await base44.asServiceRole.entities.VendasServicos.filter({ created_by: "tatybc2008@gmail.com" });
        const atribs = await base44.asServiceRole.entities.AtribuicoesVenda.filter({ created_by: "tatybc2008@gmail.com" });
        
        return Response.json({ 
            historyCount: history.length, 
            vendasCount: vendas.length,
            atribsCount: atribs.length,
            historyFirst: history.length > 0 ? history[0].workshop_id : null
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});