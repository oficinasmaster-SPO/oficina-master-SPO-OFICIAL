import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Buscar todos os employees que têm workshop_id definido
    const employees = await base44.asServiceRole.entities.Employee.list('-created_date', 500);
    const employeesWithWorkshop = employees.filter(e => e.workshop_id);

    // Coletar IDs únicos de workshops referenciados
    const uniqueWorkshopIds = [...new Set(employeesWithWorkshop.map(e => e.workshop_id))];

    // Verificar quais workshops existem
    const existenceChecks = await Promise.all(
      uniqueWorkshopIds.map(id =>
        base44.asServiceRole.entities.Workshop.get(id)
          .then(() => ({ id, exists: true }))
          .catch(() => ({ id, exists: false }))
      )
    );

    const orphanWorkshopIds = new Set(
      existenceChecks.filter(c => !c.exists).map(c => c.id)
    );

    if (orphanWorkshopIds.size === 0) {
      return Response.json({ success: true, message: 'Nenhum Employee órfão encontrado.', orphans_found: 0, deleted: 0 });
    }

    // Identificar employees órfãos
    const orphanEmployees = employeesWithWorkshop.filter(e => orphanWorkshopIds.has(e.workshop_id));

    console.log(`[CLEANUP] Encontrados ${orphanEmployees.length} employees órfãos de ${orphanWorkshopIds.size} workshops deletados.`);

    // Deletar em lotes com delay para evitar rate limit
    let deleted = 0;
    const errors = [];

    for (const emp of orphanEmployees) {
      try {
        await base44.asServiceRole.entities.Employee.delete(emp.id);
        deleted++;
        await new Promise(r => setTimeout(r, 100)); // 100ms entre deletes
      } catch (err) {
        errors.push({ id: emp.id, error: err.message });
      }
    }

    return Response.json({
      success: true,
      orphan_workshop_ids: [...orphanWorkshopIds],
      orphans_found: orphanEmployees.length,
      deleted,
      errors
    });

  } catch (error) {
    console.error('Erro no cleanupOrphanEmployees:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});