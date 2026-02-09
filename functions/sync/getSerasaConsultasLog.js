import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Buscar logs de consultas (últimas 50)
    const consultas = await base44.asServiceRole.entities.filter('SerasaConsultaLog', {}, '-data', 50);

    return Response.json({ 
      success,
      consultas || []
    });

  } catch (error) {
    console.error('Error fetching Serasa logs:', error);
    return Response.json({ 
      error.message || 'Erro ao buscar logs',
      consultas: []
    }, { status: 500 });
  }
});
