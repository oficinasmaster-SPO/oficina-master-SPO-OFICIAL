import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const updated = await base44.asServiceRole.entities.ConsultoriaAtendimento.update("69d6b874e935af168b52cd1c", {
      status: "participando"
    });
    return Response.json({ success: true, updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});