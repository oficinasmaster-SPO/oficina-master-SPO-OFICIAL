import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { workshopId, mes } = await req.json();
    if (!workshopId || !mes) {
      return Response.json({ error: 'workshopId e mes obrigatórios' }, { status: 400 });
    }

    // ✅ DEBUG: Log do workshop sendo consultado
    console.log(`[getFinancialDashboard] Buscando dados para workshop: ${workshopId}, usuário: ${user.email}`);

    // Chama FinancialEngine via SDK
    const [kpisRes, budgetRes, cashFlowRes] = await Promise.all([
      base44.functions.invoke('FinancialEngine', { action: 'getKPIs', params: { mes, workshopId } }),
      base44.functions.invoke('FinancialEngine', { action: 'getBudgetVsActual', params: { mes, workshopId } }),
      base44.functions.invoke('FinancialEngine', { action: 'getCashFlow', params: { workshopId } }),
    ]);

    return Response.json({
      mes,
      kpis: kpisRes.data,
      budget: budgetRes.data,
      cash_flow: cashFlowRes.data
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});