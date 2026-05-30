import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * repairMigratedAttendances
 *
 * Corrige registros de ContractAttendance criados pelo backfill de 16/04/2026
 * com attendance_type_id = "migrated" (placeholder de migração).
 *
 * ESTRATÉGIA:
 *   1. Busca todos os ContractAttendance com attendance_type_id = "migrated"
 *   2. Agrupa por workshop_id
 *   3. Para cada workshop, busca o plano atual (planoAtual do Workshop)
 *   4. Busca as PlanAttendanceRule do plano (scheduling_type = frequency)
 *   5. Deleta os registros "migrated" (são inválidos e não vinculados)
 *   6. Delega para generateWorkshopAttendances → recria corretamente
 *
 * PARÂMETROS:
 *   dry_run: boolean (default: true) — se true, apenas reporta sem alterar dados
 *   workshop_id: string (opcional) — processa apenas este workshop
 *
 * ADMIN ONLY.
 */
Deno.serve(async (req) => {
  const log = (event, msg, data = {}) =>
    console.log(JSON.stringify({ event, msg, ...data, ts: new Date().toISOString() }));

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const payload = await req.json().catch(() => ({}));
    const dry_run = payload.dry_run !== false; // default: true
    const filterWorkshopId = payload.workshop_id || null;

    log('repair_started', `Iniciando repair. dry_run=${dry_run}`, { filter_workshop: filterWorkshopId });

    // ── Step 1: Buscar todos os registros migrated ────────────────────────────
    const allMigrated = await base44.asServiceRole.entities.ContractAttendance.filter(
      { attendance_type_id: 'migrated' },
      null,
      500
    );

    if (!allMigrated || allMigrated.length === 0) {
      return Response.json({ success: true, message: 'Nenhum registro migrated encontrado — nada a fazer.', total: 0 });
    }

    log('repair_found', `Encontrados ${allMigrated.length} registros migrated`, {});

    // ── Step 2: Agrupar por workshop_id ──────────────────────────────────────
    const byWorkshop = {};
    for (const rec of allMigrated) {
      const wid = rec.workshop_id;
      if (!wid) continue;
      if (filterWorkshopId && wid !== filterWorkshopId) continue;
      if (!byWorkshop[wid]) byWorkshop[wid] = [];
      byWorkshop[wid].push(rec);
    }

    const workshopIds = Object.keys(byWorkshop);
    if (workshopIds.length === 0) {
      return Response.json({ success: true, message: 'Nenhum workshop válido nos registros migrated.', total: 0 });
    }

    log('repair_workshops', `${workshopIds.length} workshops afetados`, { workshop_ids: workshopIds });

    const report = [];

    for (const workshopId of workshopIds) {
      const records = byWorkshop[workshopId];

      // ── Step 3: Buscar workshop para obter plano atual ──────────────────────
      let workshop;
      try {
        workshop = await base44.asServiceRole.entities.Workshop.get(workshopId);
      } catch {
        report.push({ workshop_id: workshopId, status: 'error', reason: 'Workshop não encontrado' });
        continue;
      }

      if (!workshop) {
        report.push({ workshop_id: workshopId, status: 'error', reason: 'Workshop não encontrado' });
        continue;
      }

      const rawPlanId = workshop.planoAtual || workshop.planId || workshop.plan_type || workshop.plano;
      if (!rawPlanId || rawPlanId === 'FREE' || rawPlanId === 'trial') {
        report.push({
          workshop_id: workshopId,
          name: workshop.name,
          status: 'skipped',
          reason: `Plano inválido para repair: "${rawPlanId}"`,
        });
        continue;
      }

      const planId = rawPlanId.toUpperCase().trim();

      // ── Step 4: Verificar que existem regras de frequência para o plano ─────
      const planRules = await base44.asServiceRole.entities.PlanAttendanceRule.filter({
        plan_id: planId,
        is_active: true,
        scheduling_type: 'frequency',
      });

      if (!planRules || planRules.length === 0) {
        report.push({
          workshop_id: workshopId,
          name: workshop.name,
          plan_id: planId,
          status: 'skipped',
          reason: `Sem regras de frequência para plano "${planId}"`,
        });
        continue;
      }

      // ── Step 5: Verificar se há registros "migrated" vinculados (com consultoria_atendimento_id) ──
      // Esses devem ser preservados — não deletamos registros já consumidos
      const consumidos = records.filter(r => r.consultoria_atendimento_id);
      const naoConsumidos = records.filter(r => !r.consultoria_atendimento_id);

      log('repair_workshop_detail', `Workshop: ${workshop.name} | plano: ${planId} | migrated: ${records.length} (${consumidos.length} consumidos, ${naoConsumidos.length} pendentes)`, { workshop_id: workshopId });

      if (dry_run) {
        report.push({
          workshop_id: workshopId,
          name: workshop.name,
          plan_id: planId,
          status: 'dry_run',
          migrated_total: records.length,
          migrated_consumidos: consumidos.length,
          migrated_pendentes: naoConsumidos.length,
          plan_rules_count: planRules.length,
          action: `DELETE ${naoConsumidos.length} pendentes + REGENERAR via generateWorkshopAttendances`,
        });
        continue;
      }

      // ── Step 6: Deletar apenas os registros migrated NÃO consumidos ─────────
      let deleted = 0;
      for (const rec of naoConsumidos) {
        try {
          await base44.asServiceRole.entities.ContractAttendance.delete(rec.id);
          deleted++;
        } catch (delErr) {
          log('repair_delete_error', `Falha ao deletar ${rec.id}`, { error: delErr.message });
        }
      }

      log('repair_deleted', `Deletados ${deleted}/${naoConsumidos.length} registros migrated pendentes`, { workshop_id: workshopId });

      // ── Step 7: Regenerar inline (mesma lógica do generateWorkshopAttendances) ──
      // Não usamos functions.invoke para evitar contexto de auth diferente
      let generated = 0;
      let generateError = null;
      try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + 7);

        for (const rule of planRules) {
          const toCreate = rule.total_allowed;
          const frequencyDays = rule.frequency_days || 30;

          for (let i = 0; i < toCreate; i++) {
            const scheduledDate = new Date(startDate);
            scheduledDate.setDate(scheduledDate.getDate() + (frequencyDays * i));

            try {
              await base44.asServiceRole.entities.ContractAttendance.create({
                contract_id: workshop.contract_id || 'plan_activation',
                workshop_id: workshopId,
                plan_id: planId,
                attendance_type_id: rule.attendance_type_id,
                attendance_type_name: rule.attendance_type_name,
                scheduled_date: scheduledDate.toISOString(),
                status: 'pendente',
                generated_by: 'system',
                sequence_number: i + 1,
                consultoria_atendimento_id: null,
              });
              generated++;
            } catch (createErr) {
              log('repair_create_error', `Falha ao criar ${rule.attendance_type_name}`, { error: createErr.message });
            }
          }
        }
        log('repair_regenerated', `Regenerados ${generated} atendimentos`, { workshop_id: workshopId });
      } catch (genErr) {
        generateError = genErr.message;
        log('repair_generate_error', `Falha ao regenerar para ${workshopId}`, { error: genErr.message });
      }

      report.push({
        workshop_id: workshopId,
        name: workshop.name,
        plan_id: planId,
        status: generateError ? 'partial_error' : 'repaired',
        migrated_deleted: deleted,
        migrated_consumidos_preserved: consumidos.length,
        attendances_regenerated: generated,
        error: generateError || undefined,
      });
    }

    const summary = {
      total_migrated_records: allMigrated.length,
      workshops_processed: report.length,
      workshops_repaired: report.filter(r => r.status === 'repaired').length,
      workshops_dry_run: report.filter(r => r.status === 'dry_run').length,
      workshops_skipped: report.filter(r => r.status === 'skipped').length,
      workshops_error: report.filter(r => r.status === 'error' || r.status === 'partial_error').length,
    };

    log('repair_completed', 'Repair concluído', summary);

    return Response.json({
      success: true,
      dry_run,
      summary,
      details: report,
    });

  } catch (error) {
    console.error('[repairMigratedAttendances] Fatal error:', error);
    return Response.json({ error: error.message, details: error.toString() }, { status: 500 });
  }
});