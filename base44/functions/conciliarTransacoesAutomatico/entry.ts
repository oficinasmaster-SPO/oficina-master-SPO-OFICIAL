import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { FinancialEngine } from './FinancialEngine.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { workshopId, banco } = await req.json();
    if (!workshopId || !banco) {
      return Response.json({ error: 'workshopId e banco obrigatórios' }, { status: 400 });
    }

    const engine = new FinancialEngine(base44);
    const resultado = await engine.conciliateBankTransactions(workshopId, banco);
    const status = await engine.getConciliacaoStatus(workshopId);

    return Response.json({
      ...resultado,
      status_geral: status
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});