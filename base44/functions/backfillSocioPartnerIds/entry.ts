import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Corrige workshops onde sócios (job_role=socio/socio_interno) têm user_id
 * mas não estão no array partner_ids do Workshop correspondente.
 * Idempotente: só adiciona se ainda não estiver presente.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const params = await req.json().catch(() => ({}));
    const dryRun = params.dry_run !== false; // default: dry_run=true para segurança

    // Buscar todos os sócios com user_id e workshop_id
    const allSocios = [];
    let skip = 0;
    const pageSize = 50;
    while (true) {
      const batch = await base44.asServiceRole.entities.Employee.list('-created_date', pageSize, skip);
      if (!batch?.length) break;
      const socios = batch.filter(e =>
        ['socio', 'socio_interno'].includes(e.job_role) && e.user_id && e.workshop_id
      );
      allSocios.push(...socios);
      if (batch.length < pageSize) break;
      skip += pageSize;
    }

    console.log(`Total sócios com user_id+workshop_id: ${allSocios.length}`);

    // Agrupar por workshop_id
    const byWorkshop = {};
    for (const socio of allSocios) {
      if (!byWorkshop[socio.workshop_id]) byWorkshop[socio.workshop_id] = [];
      byWorkshop[socio.workshop_id].push(socio);
    }

    const results = [];
    let fixedCount = 0;

    for (const [workshopId, socios] of Object.entries(byWorkshop)) {
      const wsArr = await base44.asServiceRole.entities.Workshop.filter({ id: workshopId });
      const ws = wsArr[0];
      if (!ws) continue;

      const currentPartnerIds = ws.partner_ids || [];
      const toAdd = socios
        .map(s => s.user_id)
        .filter(uid => !currentPartnerIds.includes(uid));

      if (toAdd.length === 0) continue;

      const newPartnerIds = [...new Set([...currentPartnerIds, ...toAdd])];

      results.push({
        workshop_id: workshopId,
        workshop_name: ws.name,
        added_user_ids: toAdd,
        socios: socios.filter(s => toAdd.includes(s.user_id)).map(s => ({
          name: s.full_name, email: s.email, user_id: s.user_id, job_role: s.job_role
        })),
        before: currentPartnerIds,
        after: newPartnerIds
      });

      if (!dryRun) {
        await base44.asServiceRole.entities.Workshop.update(workshopId, {
          partner_ids: newPartnerIds
        });
        fixedCount++;
        console.log(`✅ Workshop ${ws.name} (${workshopId}): adicionados ${toAdd.length} sócios`);
      }
    }

    return Response.json({
      dry_run: dryRun,
      workshops_to_fix: results.length,
      workshops_fixed: dryRun ? 0 : fixedCount,
      total_socios_missing: results.reduce((sum, r) => sum + r.added_user_ids.length, 0),
      details: results
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});