import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Gera ContractAttendances em massa para todas as oficinas ativas de um plano.
 *
 * Delega para generateWorkshopAttendances (via SDK) para garantir:
 *   - Idempotência
 *   - Normalização do planId
 *   - Criação APENAS em ContractAttendance (bucket), nunca em ConsultoriaAtendimento
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { plan_id } = await req.json();
    if (!plan_id) {
      return Response.json({ error: 'plan_id is required' }, { status: 400 });
    }

    // Normalizar planId — sempre UPPERCASE
    const planId = plan_id.toUpperCase().trim();
    console.log(`[bulkGenerateAttendances] Iniciando para plano "${planId}"`);

    // ── Step 2: Verificar que existem regras antes de processar ──────────────
    const planRules = await base44.asServiceRole.entities.PlanAttendanceRule.filter({
      plan_id: planId,
      is_active: true
    });

    if (!planRules || planRules.length === 0) {
      return Response.json({ error: `Nenhuma regra ativa encontrada para o plano "${planId}"` }, { status: 400 });
    }

    console.log(`[bulkGenerateAttendances] ${planRules.length} regras encontradas para "${planId}"`);

    // Buscar oficinas ativas com este plano (planoAtual é sempre UPPERCASE no sistema)
    const workshops = await base44.asServiceRole.entities.Workshop.filter({
      planoAtual: planId,
      status: 'ativo',
      planStatus: 'active'
    });

    console.log(`[bulkGenerateAttendances] ${workshops.length} oficinas ativas encontradas`);

    if (workshops.length === 0) {
      return Response.json({ message: `Nenhuma oficina ativa com plano "${planId}"`, workshops_processed: 0 });
    }

    const results = [];

    // ── Step 4: Delegar para generateWorkshopAttendances — sem insert direto ─
    for (const workshop of workshops) {
      try {
        const res = await base44.asServiceRole.functions.invoke('generateWorkshopAttendances', {
          workshop_id: workshop.id
        });

        results.push({
          workshop_id: workshop.id,
          name: workshop.name,
          success: true,
          attendances_created: res?.attendances_created || 0,
          skipped: res?.skipped || 0
        });

        console.log(`[bulkGenerateAttendances] ${workshop.name}: ${res?.attendances_created || 0} criados`);
      } catch (err) {
        console.error(`[bulkGenerateAttendances] Falha para ${workshop.name}:`, err.message);
        results.push({
          workshop_id: workshop.id,
          name: workshop.name,
          success: false,
          error: err.message
        });
      }
    }

    const totalCreated = results.reduce((sum, r) => sum + (r.attendances_created || 0), 0);
    const totalFailed = results.filter(r => !r.success).length;

    return Response.json({
      success: true,
      plan_id: planId,
      summary: {
        workshops_processed: workshops.length,
        workshops_failed: totalFailed,
        total_attendances_created: totalCreated
      },
      details: results
    });

  } catch (error) {
    console.error('[bulkGenerateAttendances] Fatal error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});