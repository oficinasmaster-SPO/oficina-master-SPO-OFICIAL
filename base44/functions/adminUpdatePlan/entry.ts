import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Apenas super_admin pode executar
    if (!user || user.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden: Super Admin access required' }, { status: 403 });
    }

    const payload = await req.json();
    const { userId, plan, planStatus } = payload;

    if (!userId || !plan) {
      return Response.json({ error: 'Missing userId or plan' }, { status: 400 });
    }

    const newPlanStatus = planStatus || 'active';

    // Buscar a oficina do usuário
    const workshops = await base44.asServiceRole.entities.Workshop.filter({ owner_id: userId });
    let workshop_id = null;
    let workshop = null;

    if (workshops.length > 0) {
      workshop = workshops[0];
      workshop_id = workshop.id;
    } else {
      // Tentar buscar usuário para ver se tem workshop_id
      const targetUser = await base44.asServiceRole.entities.User.get(userId);
      if (targetUser && targetUser.workshop_id) {
        workshop_id = targetUser.workshop_id;
        workshop = await base44.asServiceRole.entities.Workshop.get(workshop_id);
      }
    }

    if (!workshop) {
      return Response.json({ error: 'Workshop not found for this user' }, { status: 404 });
    }

    // Assinatura segura para garantir que o plano não foi alterado indevidamente
    const tokenSecret = Deno.env.get("KIWIFY_CLIENT_SECRET") || "fallback_token_for_tests";
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", encoder.encode(tokenSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    
    // plan = plan_type (planId)
    const hashBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(plan + workshop_id + newPlanStatus));
    const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    const updatePayload = {
      planId: plan,
      planoAtual: plan.toUpperCase(),
      planStatus: newPlanStatus,
      plan_source: 'admin',
      billing_secure_hash: hashHex,
      billing_update_token: tokenSecret
    };

    const result = await base44.asServiceRole.entities.Workshop.update(workshop_id, updatePayload);

    // Logs obrigatórios
    await base44.asServiceRole.entities.PlanChangeLog.create({
      workshop_id: workshop_id,
      user_id: userId,
      admin_id: user.id,
      admin_email: user.email,
      old_plan: workshop.planId,
      new_plan: plan,
      old_status: workshop.planStatus,
      new_status: newPlanStatus,
      timestamp: new Date().toISOString()
    });

    return Response.json({ success: true, workshop: result });
  } catch (error) {
    console.error("Erro no adminUpdatePlan:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});