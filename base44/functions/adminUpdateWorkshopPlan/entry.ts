import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return Response.json({ error: 'Forbidden: Admin or Super Admin access required' }, { status: 403 });
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

    // Determinar planId e planStatus corretos
    let planId = data.planId !== undefined ? data.planId : workshop.planId;
    if (data.planId === undefined && data.planoAtual) {
        planId = data.planoAtual.toLowerCase();
    }
    
    let planStatus = data.planStatus !== undefined ? data.planStatus : workshop.planStatus;
    if (data.planStatus === undefined && data.status) {
        planStatus = data.status === 'ativo' ? 'active' : (data.status === 'inativo' ? 'canceled' : workshop.planStatus);
    }

    // Assinatura segura para garantir que o plano não foi alterado indevidamente
    const tokenSecret = Deno.env.get("KIWIFY_CLIENT_SECRET") || "fallback_token_for_tests";
    
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", encoder.encode(tokenSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const hashBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(planId + workshop_id + planStatus));
    const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    const updatePayload = {
      ...data,
      planId,
      planStatus,
      plan_source: user.role === 'super_admin' ? 'admin' : workshop.plan_source,
      billing_secure_hash: hashHex,
      billing_update_token: tokenSecret // Requisito para passar pela automação preventPlanBypass
    };

    const result = await base44.asServiceRole.entities.Workshop.update(workshop_id, updatePayload);

    // Logs obrigatórios
    await base44.asServiceRole.entities.PlanChangeLog.create({
      workshop_id: workshop_id,
      admin_id: user.id,
      admin_email: user.email,
      old_plan: workshop.planId,
      new_plan: planId,
      old_status: workshop.planStatus,
      new_status: planStatus,
      timestamp: new Date().toISOString()
    });

    return Response.json({ success: true, workshop: result });
  } catch (error) {
    console.error("Erro no adminUpdateWorkshopPlan:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});