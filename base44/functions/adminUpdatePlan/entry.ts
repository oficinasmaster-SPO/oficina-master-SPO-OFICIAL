import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Atualiza plano de um usuário (por userId) e dispara geração de bucket.
 *
 * Após o update do Workshop, chama generateWorkshopAttendances diretamente
 * (sem depender de automação entity ou changed_fields).
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden: Super Admin access required' }, { status: 403 });
    }

    const payload = await req.json();
    const { userId, plan, planStatus } = payload;

    if (!userId || !plan) {
      return Response.json({ error: 'Missing userId or plan' }, { status: 400 });
    }

    // ── Normalizar planId — sempre UPPERCASE ──────────────────────────────────
    const planId = plan.toUpperCase().trim();
    const newPlanStatus = planStatus || 'active';

    // Buscar a oficina do usuário
    let workshop = null;
    let workshop_id = null;

    const workshops = await base44.asServiceRole.entities.Workshop.filter({ owner_id: userId });
    if (workshops.length > 0) {
      workshop = workshops[0];
      workshop_id = workshop.id;
    } else {
      const targetUser = await base44.asServiceRole.entities.User.get(userId);
      if (targetUser?.workshop_id) {
        workshop_id = targetUser.workshop_id;
        workshop = await base44.asServiceRole.entities.Workshop.get(workshop_id);
      }
    }

    if (!workshop) {
      return Response.json({ error: 'Workshop not found for this user' }, { status: 404 });
    }

    // Assinatura segura
    const tokenSecret = Deno.env.get("KIWIFY_CLIENT_SECRET");
    if (!tokenSecret) {
      return Response.json({ error: 'KIWIFY_CLIENT_SECRET não configurado' }, { status: 500 });
    }

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", encoder.encode(tokenSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const hashBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(planId + workshop_id + newPlanStatus));
    const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    const updatePayload = {
      planId,               // normalizado UPPERCASE
      planoAtual: planId,   // sempre UPPERCASE — consistência
      planStatus: newPlanStatus,
      plan_source: 'admin',
      billing_secure_hash: hashHex
    };

    const result = await base44.asServiceRole.entities.Workshop.update(workshop_id, updatePayload);

    // Log obrigatório
    await base44.asServiceRole.entities.PlanChangeLog.create({
      workshop_id,
      user_id: userId,
      admin_id: user.id,
      admin_email: user.email,
      old_plan: workshop.planId,
      new_plan: planId,
      old_status: workshop.planStatus,
      new_status: newPlanStatus,
      timestamp: new Date().toISOString()
    });

    // ── Step 5: Disparar geração de bucket diretamente após atualização ───────
    let attendanceResult = null;
    if (newPlanStatus === 'active') {
      console.log(`[adminUpdatePlan] Disparando geração de bucket para ${workshop_id} plano "${planId}"`);
      try {
        attendanceResult = await base44.asServiceRole.functions.invoke('generateWorkshopAttendances', {
          workshop_id
        });
        console.log(`[adminUpdatePlan] Bucket: ${attendanceResult?.attendances_created || 0} atendimentos criados`);
      } catch (attErr) {
        console.error(`[adminUpdatePlan] Falha ao gerar bucket:`, attErr.message);
        attendanceResult = { error: attErr.message };
      }
    }

    return Response.json({
      success: true,
      workshop: result,
      attendance_generation: attendanceResult
    });

  } catch (error) {
    console.error("Erro no adminUpdatePlan:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});