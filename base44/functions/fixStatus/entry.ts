import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  // BUG-ATD-05: guard de ambiente + auth — função dev-only
  const isProduction = Deno.env.get('ENVIRONMENT') === 'production';
  if (isProduction) {
    return Response.json({ error: 'Função exclusiva de desenvolvimento.' }, { status: 403 });
  }
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }
    const updated = await base44.asServiceRole.entities.ConsultoriaAtendimento.update("69d6b874e935af168b52cd1c", {
      status: "participando"
    });
    return Response.json({ success: true, updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});