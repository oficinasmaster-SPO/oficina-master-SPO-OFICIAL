import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { workshopId, banco } = await req.json();
    if (!workshopId || !banco) {
      return Response.json({ error: 'workshopId e banco obrigatórios' }, { status: 400 });
    }

    const resultado = await base44.functions.invoke('FinancialEngine', {
      action: 'conciliate',
      params: { workshopId, banco }
    });

    return Response.json(resultado.data);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});