import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { FinancialEngine } from './FinancialEngine.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { workshopId, mes } = await req.json();
    if (!workshopId || !mes) {
      return Response.json({ error: 'workshopId e mes obrigatórios' }, { status: 400 });
    }

    const engine = new FinancialEngine(base44);
    const kpis = await engine.getKPIs(mes, workshopId);
    const budget = await engine.getBudgetVsActual(mes, workshopId);
    const contas = await engine.getContasReceber({ workshopId });
    const cashFlow = await engine.getCashFlow(workshopId);

    return Response.json({
      mes,
      kpis,
      budget,
      contas_receber: {
        valor_aberto: contas.valor_aberto,
        valor_vencido: contas.valor_vencido,
        total: contas.total
      },
      cash_flow: {
        saldo_atual: cashFlow.saldo_inicial,
        projecao_30d: cashFlow.saldo_final_projetado
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});