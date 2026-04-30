import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Buscar apenas sprints não concluídos diretamente no banco (evita buscar completed desnecessariamente)
  const pendingSprints = await base44.asServiceRole.entities.ConsultoriaSprint.filter(
    { status: 'in_progress' }
  );
  const overdueSprints = await base44.asServiceRole.entities.ConsultoriaSprint.filter(
    { status: 'overdue' }
  );
  const ativos = [...pendingSprints, ...overdueSprints];

  let updated = 0;

  for (const sprint of ativos) {
    const updates = {};

    // Verificar overdue: end_date passou e não está completed
    if (sprint.end_date) {
      const endDate = new Date(sprint.end_date);
      endDate.setHours(0, 0, 0, 0);
      if (today > endDate && sprint.status !== 'overdue') {
        updates.status = 'overdue';
      }
    }

    // Verificar inatividade: sem atividade há 7+ dias - marcar como overdue se aplicável
    if (sprint.last_activity_date && sprint.status === 'in_progress') {
      const lastActivity = new Date(sprint.last_activity_date);
      const diffDays = Math.floor((today - lastActivity) / (1000 * 60 * 60 * 24));
      if (diffDays >= 7) {
        // Não sobrescrever overdue já definido por end_date
        if (!updates.status) updates.status = 'overdue';
      }
    }

    if (Object.keys(updates).length > 0) {
      await base44.asServiceRole.entities.ConsultoriaSprint.update(sprint.id, updates);
      updated++;
    }
  }

  return Response.json({ message: `Sprint status atualizado. ${updated} sprints modificados.`, total: ativos.length, updated });
});