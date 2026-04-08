import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const atendimentos = await base44.asServiceRole.entities.ConsultoriaAtendimento.list('-created_date', 5);
    return Response.json({
      atendimentos: atendimentos.map(a => ({ id: a.id, status: a.status }))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});