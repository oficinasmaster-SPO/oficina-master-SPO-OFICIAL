import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * One-time migration: moves all atendimentos with ata_id 
 * from status "realizado" to "concluido".
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all "realizado" atendimentos
    const atendimentos = await base44.asServiceRole.entities.ConsultoriaAtendimento.filter(
      { status: 'realizado' },
      '-created_date',
      1000
    );

    let migrated = 0;
    for (const a of atendimentos) {
      if (a.ata_id) {
        await base44.asServiceRole.entities.ConsultoriaAtendimento.update(a.id, { status: 'concluido' });
        migrated++;
      }
    }

    return Response.json({ success: true, migrated, total_checked: atendimentos.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});