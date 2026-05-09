import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Atualiza o plano de uma oficina e dispara geração de bucket de atendimentos.
 *
 * Após o update do Workshop, chama generateWorkshopAttendances diretamente
 * (sem depender de automação entity ou changed_fields).
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    const isAdmin = user.role === 'admin' || user.role === 'super_admin';
    const isPlatformAdmin = user.data?.is_platform_admin === true;
    const isConsultingFirmAdmin = !!(user.data?.consulting_firm_id);

    if (!user || (!isAdmin && !isPlatformAdmin && !isConsultingFirmAdmin)) {
      return Response.json({ error: 'Forbidden: Acesso insuficiente para alterar planos' }, { status: 403 });
    }

    const payload = await req.json();
    const { workshop_id, data } = payload;

    if (!workshop_id || !data) {
      return Response.json({ error: 'Missing workshop_id or data' }, { status: 400 });
    }

    const workshop = await base44.asServiceRole.entities.Workshop.get(workshop_id);
    if (!workshop) {
      return Response.json({ error: 'Workshop not found' }, { status: 404 });
    }

    // ── Normalizar planId — UPPERCASE, imutável como identificador ───────────
    let rawPlanId = data.planId !== undefined ? data.planId : workshop.planId;
    if (!rawPlanId && data.planoAtual) rawPlanId = data.planoAtual;
    const planId = rawPlanId ? rawPlanId.toUpperCase().trim() : null;

    let planStatus = data.planStatus !== undefined ? data.planStatus : workshop.planStatus;
    if (data.planStatus === undefined && data.status) {
      planStatus = data.status === 'ativo' ? 'active' : (data.status === 'inativo' ? 'canceled' : workshop.planStatus);
    }

    // Assinatura segura
    const tokenSecret = Deno.env.get("KIWIFY_CLIENT_SECRET") || "fallback_token_for_tests";
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", encoder.encode(tokenSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const hashBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode((planId || '') + workshop_id + (planStatus || '')));
    const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    // DS-FIX-B: garantir que consulting_firm_id seja propagado ao criar/atualizar workshop
    const adminFirmId = user.data?.consulting_firm_id;
    const consultingFirmId = data.consulting_firm_id
      || workshop.consulting_firm_id
      || (adminFirmId || undefined);

    const updatePayload = {
      ...data,
      planId: planId || workshop.planId,
      planoAtual: planId || workshop.planoAtual, // sempre UPPERCASE
      planStatus,
      plan_source: user.role === 'super_admin' ? 'admin' : workshop.plan_source,
      billing_secure_hash: hashHex,
      billing_update_token: tokenSecret,
      ...(consultingFirmId ? { consulting_firm_id: consultingFirmId } : {})
    };

    const result = await base44.asServiceRole.entities.Workshop.update(workshop_id, updatePayload);

    // Log obrigatório
    await base44.asServiceRole.entities.PlanChangeLog.create({
      workshop_id,
      admin_id: user.id,
      admin_email: user.email,
      old_plan: workshop.planId,
      new_plan: planId,
      old_status: workshop.planStatus,
      new_status: planStatus,
      timestamp: new Date().toISOString()
    });

    // ── Step 5: Disparar geração de bucket + cronograma após atualização ────────
    let attendanceResult = null;
    let cronogramaResult = null;
    if (planId && planStatus === 'active') {
      console.log(`[adminUpdateWorkshopPlan] Disparando geração de bucket para ${workshop_id} plano "${planId}"`);
      try {
        const raw = await base44.asServiceRole.functions.invoke('generateWorkshopAttendances', {
          workshop_id
        });
        attendanceResult = {
          attendances_created: raw?.attendances_created ?? raw?.data?.attendances_created ?? 0,
          success: raw?.success ?? raw?.data?.success ?? true
        };
        console.log(`[adminUpdateWorkshopPlan] Bucket: ${attendanceResult.attendances_created} atendimentos criados`);
      } catch (attErr) {
        console.error(`[adminUpdateWorkshopPlan] Falha ao gerar bucket:`, attErr.message);
        attendanceResult = { error: attErr.message };
      }

      // Disparar geração de cronograma de implementação
      console.log(`[adminUpdateWorkshopPlan] Disparando generateFullCronograma para ${workshop_id}`);
      try {
        const cronRaw = await base44.asServiceRole.functions.invoke('generateFullCronograma', {
          workshop_id,
          plan_id: planId
        });
        cronogramaResult = {
          items_created: cronRaw?.items_created ?? cronRaw?.data?.items_created ?? 0,
          success: cronRaw?.success ?? cronRaw?.data?.success ?? true,
          engine: cronRaw?.engine ?? cronRaw?.data?.engine ?? 'unknown'
        };
        console.log(`[adminUpdateWorkshopPlan] Cronograma: ${cronogramaResult.items_created} itens criados (${cronogramaResult.engine})`);
      } catch (cronErr) {
        console.error(`[adminUpdateWorkshopPlan] Falha ao gerar cronograma:`, cronErr.message);
        cronogramaResult = { error: cronErr.message };
      }
    }

    return Response.json({
      success: true,
      workshop: { id: result?.id, planId: result?.planId, planoAtual: result?.planoAtual, planStatus: result?.planStatus },
      attendance_generation: attendanceResult,
      cronograma_generation: cronogramaResult
    });

  } catch (error) {
    console.error("Erro no adminUpdateWorkshopPlan:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});