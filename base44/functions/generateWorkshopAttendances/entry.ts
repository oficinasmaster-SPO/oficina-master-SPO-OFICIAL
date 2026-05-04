import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Gera ContractAttendances (bucket) para uma oficina quando ela ativa plano.
 *
 * PODE ser chamada de duas formas:
 *   1. Pela automação entity em Workshop (create/update) — payload tem { event, data, ... }
 *   2. Diretamente por adminUpdateWorkshopPlan/adminUpdatePlan — payload tem { workshop_id }
 *
 * Regras:
 *   - Cria APENAS em ContractAttendance (status 'pendente') — o bucket
 *   - NUNCA cria diretamente em ConsultoriaAtendimento
 *   - Idempotente: não recria se já existem pendentes do mesmo tipo para o mesmo plan_id
 *   - Case-insensitive: planId é sempre normalizado para UPPERCASE
 *   - Não depende de changed_fields — verifica estado atual diretamente
 */
Deno.serve(async (req) => {
  const log = (event, msg, data = {}) => {
    console.log(JSON.stringify({ event, msg, ...data, ts: new Date().toISOString() }));
  };

  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    // ── Suporte a chamada direta (não via automação) ──────────────────────────
    if (payload.workshop_id && !payload.event) {
      const workshop = await base44.asServiceRole.entities.Workshop.get(payload.workshop_id);
      if (!workshop) {
        return Response.json({ error: 'Workshop not found' }, { status: 404 });
      }
      return await generateForWorkshop(base44, workshop, log);
    }

    // ── Chamada via automação entity ──────────────────────────────────────────
    const { event, data, payload_too_large } = payload;

    if (!event || event.entity_name !== 'Workshop') {
      return Response.json({ message: 'Not a Workshop event' });
    }

    let workshop = data;
    if (payload_too_large) {
      workshop = await base44.asServiceRole.entities.Workshop.get(event.entity_id);
    }

    // Processar se planStatus === 'active' — independente de changed_fields
    if (workshop.planStatus !== 'active') {
      log('attendance_generation_skipped', 'planStatus não é active', { workshop_id: workshop.id, planStatus: workshop.planStatus });
      return Response.json({ message: 'planStatus not active — skipping' });
    }

    return await generateForWorkshop(base44, workshop, log);

  } catch (error) {
    console.error('[generateWorkshopAttendances] Fatal error:', error);
    return Response.json({ error: error.message, details: error.toString() }, { status: 500 });
  }
});

async function generateForWorkshop(base44, workshop, log) {
  // ── Step 1: Normalizar planId — case-insensitive, trim ────────────────────
  const rawPlanId = workshop.plan_type || workshop.plan_id || workshop.planId || workshop.planoAtual || workshop.plano;
  if (!rawPlanId) {
    log('attendance_generation_skipped', 'Nenhum plan_id encontrado no workshop', { workshop_id: workshop.id });
    return Response.json({ message: 'Workshop has no plan — skipping' });
  }

  const planId = rawPlanId.toUpperCase().trim();
  log('plan_id_normalized', `planId normalizado: "${rawPlanId}" → "${planId}"`, { workshop_id: workshop.id });

  // ── Step 2: Buscar regras do plano (sempre com planId normalizado) ─────────
  log('attendance_generation_started', 'Iniciando geração de bucket', { workshop_id: workshop.id, plan_id: planId });

  const planRules = await base44.asServiceRole.entities.PlanAttendanceRule.filter({
    plan_id: planId,
    is_active: true
  });

  if (!planRules || planRules.length === 0) {
    log('attendance_generation_skipped', `Nenhuma regra encontrada para plano "${planId}"`, { workshop_id: workshop.id });
    return Response.json({ message: `Nenhuma regra de atendimento para o plano ${planId}` });
  }

  // ── Step 6: Idempotência — buscar pendentes já existentes ─────────────────
  // Verifica por workshop_id + plan_id para garantir que não regera se o plano mudou
  const existingPending = await base44.asServiceRole.entities.ContractAttendance.filter({
    workshop_id: workshop.id,
    plan_id: planId,
    status: 'pendente'
  });

  // Indexar por attendance_type_id → contagem
  const existingByType = {};
  for (const item of existingPending) {
    const key = item.attendance_type_id;
    if (key) {
      existingByType[key] = (existingByType[key] || 0) + 1;
    }
  }

  // Inicia 7 dias a partir de hoje para dar tempo ao CS
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 7);

  const created = [];
  const skipped = [];

  for (const rule of planRules) {
    if (rule.scheduling_type !== 'frequency') {
      skipped.push({ type: rule.attendance_type_name, reason: 'event_based — requer calendário' });
      log('attendance_skipped_existing', 'Regra event_based ignorada', { type: rule.attendance_type_name });
      continue;
    }

    const typeKey = rule.attendance_type_id;
    const alreadyExists = existingByType[typeKey] || 0;

    if (alreadyExists >= rule.total_allowed) {
      skipped.push({ type: rule.attendance_type_name, reason: `já existem ${alreadyExists}/${rule.total_allowed} pendentes` });
      log('attendance_skipped_existing', `Tipo já tem cobertura total`, { type: rule.attendance_type_name, existing: alreadyExists, allowed: rule.total_allowed });
      continue;
    }

    const toCreate = rule.total_allowed - alreadyExists;
    const frequencyDays = rule.frequency_days || 30;

    for (let i = 0; i < toCreate; i++) {
      const scheduledDate = new Date(startDate);
      scheduledDate.setDate(scheduledDate.getDate() + (frequencyDays * (i + alreadyExists)));

      try {
        // ── Step 3/7: APENAS ContractAttendance — NUNCA ConsultoriaAtendimento ──
        const attendance = await base44.asServiceRole.entities.ContractAttendance.create({
          contract_id: workshop.contract_id || 'plan_activation',
          workshop_id: workshop.id,
          plan_id: planId, // sempre normalizado UPPERCASE
          attendance_type_id: rule.attendance_type_id,
          attendance_type_name: rule.attendance_type_name,
          scheduled_date: scheduledDate.toISOString(),
          status: 'pendente',
          generated_by: 'system',
          sequence_number: i + alreadyExists + 1,
          consultoria_atendimento_id: null
        });
        created.push(attendance);
        log('attendance_created', `Criado: ${rule.attendance_type_name} #${i + alreadyExists + 1}`, {
          workshop_id: workshop.id,
          plan_id: planId,
          attendance_type: rule.attendance_type_name,
          sequence: i + alreadyExists + 1
        });
      } catch (createErr) {
        log('attendance_failed', `Falha ao criar: ${rule.attendance_type_name}`, {
          workshop_id: workshop.id,
          error: createErr.message
        });
      }
    }
  }

  log('attendance_generation_started', `Concluído: ${created.length} criados, ${skipped.length} pulados`, {
    workshop_id: workshop.id,
    plan_id: planId
  });

  return Response.json({
    success: true,
    message: `${created.length} atendimentos bucket gerados para ${workshop.name || workshop.id}`,
    workshop_id: workshop.id,
    plan_id: planId,
    attendances_created: created.length,
    skipped: skipped.length,
    skipped_detail: skipped
  });
}