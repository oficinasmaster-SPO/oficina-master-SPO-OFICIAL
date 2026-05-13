import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { workshop_id, diagnostic_type } = await req.json();

    if (!workshop_id || !diagnostic_type) {
      return Response.json(
        { error: 'Missing workshop_id or diagnostic_type' },
        { status: 400 }
      );
    }

    // 1. Buscar workshop e seu plano
    let workshop = null;
    try {
      const all = await base44.entities.Workshop.list();
      workshop = all.find(w => w.id === workshop_id) || null;
    } catch(e) { workshop = null; }

    if (!workshop) {
      return Response.json(
        { error: 'Workshop not found' },
        { status: 404 }
      );
    }
    const planId = workshop.planoAtual || 'FREE';

    // 2. Buscar DiagnosticFrequency
    const frequencies = await base44.entities.DiagnosticFrequency.filter({
      plan_id: planId,
      diagnostic_type: diagnostic_type,
      is_active: true
    });

    if (frequencies.length === 0) {
      return Response.json({
        canUseIA: false,
        reason: 'Diagnostic not found for this plan',
        has_personalized_action_plan_ia: false,
        ia_plan_enabled_for_this_plan: false
      });
    }

    const frequency = frequencies[0];

    // 3. Validar ambas as flags
    const canUseIA =
      frequency.has_personalized_action_plan_ia === true &&
      frequency.ia_plan_enabled_for_this_plan === true;

    let reason = '';
    if (!frequency.has_personalized_action_plan_ia) {
      reason = 'This diagnostic does not support AI-personalized plans';
    } else if (!frequency.ia_plan_enabled_for_this_plan) {
      reason = 'AI-personalized plans are not available in your plan';
    }

    // 4. Retornar resultado
    return Response.json({
      canUseIA,
      reason: canUseIA ? 'You can use AI-personalized plans' : reason,
      has_personalized_action_plan_ia: frequency.has_personalized_action_plan_ia,
      ia_plan_enabled_for_this_plan: frequency.ia_plan_enabled_for_this_plan,
      plan_id: planId,
      diagnostic_type: diagnostic_type
    });
  } catch (error) {
    console.error('IA eligibility error:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});