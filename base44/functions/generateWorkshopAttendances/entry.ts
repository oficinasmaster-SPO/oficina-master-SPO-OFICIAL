import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Gera ContractAttendances (bucket) para uma oficina quando ela ativa plano.
 * 
 * Disparada pela automação entity em Workshop (create/update).
 * Trigger conditions: planStatus = 'active' AND changed_fields contains 'planStatus'
 * (ou create com planStatus = 'active')
 * 
 * Regras:
 * - Cria apenas registros em ContractAttendance (status 'pendente') — o bucket
 * - Verifica duplicatas por workshop_id + attendance_type_id + status pendente
 * - Processa apenas regras scheduling_type = 'frequency' (event_based requer datas de calendário)
 * - Idempotente: não recria se já existem pendentes do mesmo tipo
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { event, data, old_data, changed_fields, payload_too_large } = payload;

    if (!event || event.entity_name !== 'Workshop') {
      return Response.json({ message: 'Not a Workshop event' });
    }

    let workshop = data;
    if (payload_too_large) {
      workshop = await base44.asServiceRole.entities.Workshop.get(event.entity_id);
    }

    // Só processa quando planStatus muda para 'active' ou na criação com planStatus active
    const isCreate = event.type === 'create';
    const planStatusChangedToActive = changed_fields?.includes('planStatus') && workshop.planStatus === 'active';
    const isNewActiveWorkshop = isCreate && workshop.planStatus === 'active';

    if (!planStatusChangedToActive && !isNewActiveWorkshop) {
      return Response.json({ message: 'Workshop planStatus did not become active — skipping bucket generation' });
    }

    // Normalizar o plan_id
    const rawPlanId = workshop.planId || workshop.planoAtual;
    if (!rawPlanId) {
      return Response.json({ message: 'Workshop has no plan — skipping' });
    }

    const planIdVariants = [...new Set([rawPlanId, rawPlanId.toUpperCase(), rawPlanId.toLowerCase()])];

    let planRules = [];
    for (const variant of planIdVariants) {
      const rules = await base44.asServiceRole.entities.PlanAttendanceRule.filter({
        plan_id: variant,
        is_active: true
      });
      if (rules?.length > 0) {
        planRules = rules;
        console.log(`[generateWorkshopAttendances] Found ${rules.length} rules for plan_id="${variant}"`);
        break;
      }
    }

    if (planRules.length === 0) {
      return Response.json({ message: `Nenhuma regra de atendimento para o plano ${rawPlanId}` });
    }

    // Buscar pendentes já existentes para este workshop (anti-duplicata)
    const existingPending = await base44.asServiceRole.entities.ContractAttendance.filter({
      workshop_id: workshop.id,
      status: 'pendente'
    });

    // Indexar por attendance_type_id para lookup O(1)
    const existingByType = {};
    for (const item of existingPending) {
      const key = item.attendance_type_id || item.attendance_type_name;
      if (!existingByType[key]) existingByType[key] = 0;
      existingByType[key]++;
    }

    // Inicia 7 dias a partir de hoje para dar tempo ao CS capturar o bucket e dar início com o cliente
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 7);
    const created = [];
    const skipped = [];

    for (const rule of planRules) {
      // Apenas frequency — event_based requer datas de calendário (tratado separadamente)
      if (rule.scheduling_type !== 'frequency') {
        skipped.push({ type: rule.attendance_type_name, reason: 'event_based — requer calendário' });
        continue;
      }

      const typeKey = rule.attendance_type_id || rule.attendance_type_name;
      const alreadyExists = existingByType[typeKey] || 0;

      if (alreadyExists >= rule.total_allowed) {
        skipped.push({ type: rule.attendance_type_name, reason: `já existem ${alreadyExists} pendentes` });
        continue;
      }

      const toCreate = rule.total_allowed - alreadyExists;
      const frequencyDays = rule.frequency_days || 30;

      for (let i = 0; i < toCreate; i++) {
        const scheduledDate = new Date(startDate);
        scheduledDate.setDate(scheduledDate.getDate() + (frequencyDays * (i + alreadyExists)));

        const attendance = await base44.asServiceRole.entities.ContractAttendance.create({
          contract_id: 'plan_activation', // sem contrato formal — gerado por ativação de plano
          workshop_id: workshop.id,
          plan_id: rawPlanId,
          attendance_type_id: rule.attendance_type_id,
          attendance_type_name: rule.attendance_type_name,
          scheduled_date: scheduledDate.toISOString(),
          status: 'pendente',
          generated_by: 'system',
          sequence_number: i + alreadyExists + 1,
          consultoria_atendimento_id: null
        });
        created.push(attendance);
      }
    }

    console.log(`[generateWorkshopAttendances] Workshop ${workshop.id} (${rawPlanId}): ${created.length} criados, ${skipped.length} pulados`);

    return Response.json({
      success: true,
      message: `${created.length} atendimentos bucket gerados para ${workshop.name || workshop.id}`,
      attendances_created: created.length,
      skipped: skipped.length,
      skipped_detail: skipped
    });

  } catch (error) {
    console.error('[generateWorkshopAttendances] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});