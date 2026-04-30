import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const isProduction = Deno.env.get('ENVIRONMENT') === 'production';
  if (isProduction) {
    return Response.json({ error: 'Função exclusiva de desenvolvimento.' }, { status: 403 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Apenas admins podem executar esta função.' }, { status: 403 });
    }

    const workshopId = "69ab04376ca4c22324455582";
    
    // Buscar TODAS as sprints sem filtro de status
    const allSprints = await base44.asServiceRole.entities.ConsultoriaSprint.list(
      "-updated_date",
      100
    );

    // Filtrar por workshop
    const workshopSprints = allSprints.filter(s => s.workshop_id === workshopId);

    return Response.json({
      workshopId,
      totalSprintsNoBank: workshopSprints.length,
      sprints: workshopSprints.map(s => ({
        id: s.id,
        name: s.name || s.titulo || "Sem nome",
        status: s.status,
        start_date: s.start_date,
        end_date: s.end_date,
        completion_percentage: s.completion_percentage || 0,
        total_tasks: s.total_tasks || 0,
        completed_tasks: s.completed_tasks || 0,
        created_date: s.created_date,
        _allFields: s // Debug: todos os campos
      }))
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});