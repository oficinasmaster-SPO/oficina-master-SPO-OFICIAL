import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * backfillCronogramaEngineVersion — ADMIN ONLY, RUN ONCE
 *
 * Preenche engine_version, engine_source e created_by_flow
 * em todos os registros CronogramaImplementacao que ainda não possuem esses campos.
 *
 * Regras de inferência:
 * - template_item_id preenchido → template_v2
 * - sem template_item_id, sem engine_version → legacy_v1
 * - engine_version já definido → preservar (não sobrescrever)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin apenas' }, { status: 403 });
    }

    const { dry_run = true } = await req.json().catch(() => ({}));

    console.log(`[backfill] Iniciando backfill (dry_run=${dry_run})`);

    // Buscar todos os registros sem engine_version definido
    // A ausência do campo equivale a 'unknown' ou legado
    const allRecords = await base44.asServiceRole.entities.CronogramaImplementacao.list('-created_date', 500);

    const toUpdate = allRecords.filter(r =>
      !r.engine_version ||
      r.engine_version === 'legacy_v1' && !r.engine_source // tem version mas não tem source
    );

    console.log(`[backfill] ${toUpdate.length} registros para atualizar de ${allRecords.length} total`);

    const results = { updated: 0, skipped: 0, errors: 0, dry_run };
    const log = [];

    for (const record of toUpdate) {
      // Inferir engine_version
      let inferredVersion = 'legacy_v1';
      let inferredSource = 'generateFullCronograma';
      let inferredFlow = 'auto_plan_activation';

      if (record.template_item_id) {
        inferredVersion = 'template_v2';
        inferredSource = 'generateFullCronograma';
        inferredFlow = 'auto_plan_activation';
      } else if (!record.engine_version) {
        // Sem nenhum metadado → mais provável que seja legacy antigo
        inferredVersion = 'legacy_v1';
        inferredSource = 'unknown';
        inferredFlow = 'unknown';
      }

      // Não sobrescrever se já tem engine_version E engine_source
      if (record.engine_version && record.engine_source) {
        results.skipped++;
        continue;
      }

      log.push({
        id: record.id,
        workshop_id: record.workshop_id,
        item_nome: record.item_nome,
        inferred: { engine_version: inferredVersion, engine_source: inferredSource, created_by_flow: inferredFlow }
      });

      if (!dry_run) {
        try {
          await base44.asServiceRole.entities.CronogramaImplementacao.update(record.id, {
            engine_version: record.engine_version || inferredVersion,
            engine_source: record.engine_source || inferredSource,
            created_by_flow: record.created_by_flow || inferredFlow
          });
          results.updated++;
        } catch (err) {
          console.error(`[backfill] Erro ao atualizar ${record.id}:`, err.message);
          results.errors++;
        }
      } else {
        results.updated++;
      }
    }

    return Response.json({
      success: true,
      dry_run,
      summary: results,
      sample: log.slice(0, 20),
      message: dry_run
        ? `DRY RUN: ${results.updated} registros seriam atualizados. Envie dry_run=false para aplicar.`
        : `Backfill concluído: ${results.updated} atualizados, ${results.skipped} já preenchidos, ${results.errors} erros.`
    });

  } catch (error) {
    console.error('[backfill] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});