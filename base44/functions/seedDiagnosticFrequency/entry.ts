import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const DIAGNOSTIC_FREQUENCY_DEFAULTS = {
  FREE: [
    { type: "entrepreneur_diagnostic", frequency_type: "annual", min_days: 365, max_occurrences: 1, has_ia: true, ia_enabled: false },
    { type: "management_diagnostic", frequency_type: "annual", min_days: 365, max_occurrences: 1, has_ia: true, ia_enabled: false },
    { type: "maturity_collaborative_diagnostic", frequency_type: "annual", min_days: 365, max_occurrences: 1, has_ia: true, ia_enabled: false },
    { type: "productivity_diagnostic_tcmp2", frequency_type: "annual", min_days: 365, max_occurrences: 1, has_ia: false, ia_enabled: false },
    { type: "performance_diagnostic_matrix30", frequency_type: "annual", min_days: 365, max_occurrences: 1, has_ia: false, ia_enabled: false },
    { type: "workload_diagnostic", frequency_type: "annual", min_days: 365, max_occurrences: 1, has_ia: false, ia_enabled: false },
    { type: "service_order_diagnostic_r70i30", frequency_type: "annual", min_days: 365, max_occurrences: 1, has_ia: false, ia_enabled: false },
    { type: "disc_behavioral_diagnostic", frequency_type: "annual", min_days: 365, max_occurrences: 1, has_ia: false, ia_enabled: false },
    { type: "debt_analysis_diagnostic", frequency_type: "annual", min_days: 365, max_occurrences: 1, has_ia: true, ia_enabled: false },
    { type: "gerencial_diagnostic", frequency_type: "annual", min_days: 365, max_occurrences: 1, has_ia: true, ia_enabled: false },
    { type: "commercial_diagnostic", frequency_type: "annual", min_days: 365, max_occurrences: 1, has_ia: true, ia_enabled: false }
  ],
  START: [
    { type: "entrepreneur_diagnostic", frequency_type: "semester", min_days: 180, max_occurrences: 2, has_ia: true, ia_enabled: true },
    { type: "management_diagnostic", frequency_type: "semester", min_days: 180, max_occurrences: 2, has_ia: true, ia_enabled: true },
    { type: "maturity_collaborative_diagnostic", frequency_type: "annual", min_days: 365, max_occurrences: 1, has_ia: true, ia_enabled: false },
    { type: "productivity_diagnostic_tcmp2", frequency_type: "quarterly", min_days: 90, max_occurrences: 4, has_ia: false, ia_enabled: false },
    { type: "performance_diagnostic_matrix30", frequency_type: "annual", min_days: 365, max_occurrences: 1, has_ia: false, ia_enabled: false },
    { type: "workload_diagnostic", frequency_type: "semester", min_days: 180, max_occurrences: 2, has_ia: false, ia_enabled: false },
    { type: "service_order_diagnostic_r70i30", frequency_type: "quarterly", min_days: 90, max_occurrences: 4, has_ia: false, ia_enabled: false },
    { type: "disc_behavioral_diagnostic", frequency_type: "annual", min_days: 365, max_occurrences: 1, has_ia: false, ia_enabled: false },
    { type: "debt_analysis_diagnostic", frequency_type: "semester", min_days: 180, max_occurrences: 2, has_ia: true, ia_enabled: true },
    { type: "gerencial_diagnostic", frequency_type: "monthly", min_days: 30, max_occurrences: 12, has_ia: true, ia_enabled: true },
    { type: "commercial_diagnostic", frequency_type: "quarterly", min_days: 90, max_occurrences: 4, has_ia: true, ia_enabled: true }
  ],
  BRONZE: [
    { type: "entrepreneur_diagnostic", frequency_type: "semester", min_days: 180, max_occurrences: 2, has_ia: true, ia_enabled: true },
    { type: "management_diagnostic", frequency_type: "quarterly", min_days: 90, max_occurrences: 4, has_ia: true, ia_enabled: true },
    { type: "maturity_collaborative_diagnostic", frequency_type: "semester", min_days: 180, max_occurrences: 2, has_ia: true, ia_enabled: false },
    { type: "productivity_diagnostic_tcmp2", frequency_type: "quarterly", min_days: 90, max_occurrences: 4, has_ia: false, ia_enabled: false },
    { type: "performance_diagnostic_matrix30", frequency_type: "semester", min_days: 180, max_occurrences: 2, has_ia: false, ia_enabled: false },
    { type: "workload_diagnostic", frequency_type: "quarterly", min_days: 90, max_occurrences: 4, has_ia: false, ia_enabled: false },
    { type: "service_order_diagnostic_r70i30", frequency_type: "monthly", min_days: 30, max_occurrences: 12, has_ia: false, ia_enabled: false },
    { type: "disc_behavioral_diagnostic", frequency_type: "semester", min_days: 180, max_occurrences: 2, has_ia: false, ia_enabled: false },
    { type: "debt_analysis_diagnostic", frequency_type: "quarterly", min_days: 90, max_occurrences: 4, has_ia: true, ia_enabled: true },
    { type: "gerencial_diagnostic", frequency_type: "monthly", min_days: 30, max_occurrences: 12, has_ia: true, ia_enabled: true },
    { type: "commercial_diagnostic", frequency_type: "monthly", min_days: 30, max_occurrences: 12, has_ia: true, ia_enabled: true }
  ],
  PRATA: [
    { type: "entrepreneur_diagnostic", frequency_type: "quarterly", min_days: 90, max_occurrences: 4, has_ia: true, ia_enabled: true },
    { type: "management_diagnostic", frequency_type: "monthly", min_days: 30, max_occurrences: 12, has_ia: true, ia_enabled: true },
    { type: "maturity_collaborative_diagnostic", frequency_type: "quarterly", min_days: 90, max_occurrences: 4, has_ia: true, ia_enabled: true },
    { type: "productivity_diagnostic_tcmp2", frequency_type: "monthly", min_days: 30, max_occurrences: 12, has_ia: false, ia_enabled: false },
    { type: "performance_diagnostic_matrix30", frequency_type: "quarterly", min_days: 90, max_occurrences: 4, has_ia: false, ia_enabled: false },
    { type: "workload_diagnostic", frequency_type: "monthly", min_days: 30, max_occurrences: 12, has_ia: false, ia_enabled: false },
    { type: "service_order_diagnostic_r70i30", frequency_type: "monthly", min_days: 30, max_occurrences: 12, has_ia: false, ia_enabled: false },
    { type: "disc_behavioral_diagnostic", frequency_type: "quarterly", min_days: 90, max_occurrences: 4, has_ia: false, ia_enabled: false },
    { type: "debt_analysis_diagnostic", frequency_type: "monthly", min_days: 30, max_occurrences: 12, has_ia: true, ia_enabled: true },
    { type: "gerencial_diagnostic", frequency_type: "monthly", min_days: 30, max_occurrences: 12, has_ia: true, ia_enabled: true },
    { type: "commercial_diagnostic", frequency_type: "monthly", min_days: 30, max_occurrences: 12, has_ia: true, ia_enabled: true }
  ],
  GOLD: [
    { type: "entrepreneur_diagnostic", frequency_type: "monthly", min_days: 30, max_occurrences: 12, has_ia: true, ia_enabled: true },
    { type: "management_diagnostic", frequency_type: "monthly", min_days: 30, max_occurrences: 12, has_ia: true, ia_enabled: true },
    { type: "maturity_collaborative_diagnostic", frequency_type: "monthly", min_days: 30, max_occurrences: 12, has_ia: true, ia_enabled: true },
    { type: "productivity_diagnostic_tcmp2", frequency_type: "monthly", min_days: 30, max_occurrences: 12, has_ia: false, ia_enabled: false },
    { type: "performance_diagnostic_matrix30", frequency_type: "monthly", min_days: 30, max_occurrences: 12, has_ia: false, ia_enabled: false },
    { type: "workload_diagnostic", frequency_type: "monthly", min_days: 30, max_occurrences: 12, has_ia: false, ia_enabled: false },
    { type: "service_order_diagnostic_r70i30", frequency_type: "monthly", min_days: 30, max_occurrences: 12, has_ia: false, ia_enabled: false },
    { type: "disc_behavioral_diagnostic", frequency_type: "quarterly", min_days: 90, max_occurrences: 4, has_ia: false, ia_enabled: false },
    { type: "debt_analysis_diagnostic", frequency_type: "monthly", min_days: 30, max_occurrences: 12, has_ia: true, ia_enabled: true },
    { type: "gerencial_diagnostic", frequency_type: "monthly", min_days: 30, max_occurrences: 12, has_ia: true, ia_enabled: true },
    { type: "commercial_diagnostic", frequency_type: "monthly", min_days: 30, max_occurrences: 12, has_ia: true, ia_enabled: true }
  ],
  IOM: [
    { type: "entrepreneur_diagnostic", frequency_type: "monthly", min_days: 30, max_occurrences: 12, has_ia: true, ia_enabled: true },
    { type: "management_diagnostic", frequency_type: "monthly", min_days: 30, max_occurrences: 12, has_ia: true, ia_enabled: true },
    { type: "maturity_collaborative_diagnostic", frequency_type: "monthly", min_days: 30, max_occurrences: 12, has_ia: true, ia_enabled: true },
    { type: "productivity_diagnostic_tcmp2", frequency_type: "monthly", min_days: 30, max_occurrences: 12, has_ia: false, ia_enabled: false },
    { type: "performance_diagnostic_matrix30", frequency_type: "monthly", min_days: 30, max_occurrences: 12, has_ia: false, ia_enabled: false },
    { type: "workload_diagnostic", frequency_type: "monthly", min_days: 30, max_occurrences: 12, has_ia: false, ia_enabled: false },
    { type: "service_order_diagnostic_r70i30", frequency_type: "monthly", min_days: 30, max_occurrences: 12, has_ia: false, ia_enabled: false },
    { type: "disc_behavioral_diagnostic", frequency_type: "quarterly", min_days: 90, max_occurrences: 4, has_ia: false, ia_enabled: false },
    { type: "debt_analysis_diagnostic", frequency_type: "monthly", min_days: 30, max_occurrences: 12, has_ia: true, ia_enabled: true },
    { type: "gerencial_diagnostic", frequency_type: "monthly", min_days: 30, max_occurrences: 12, has_ia: true, ia_enabled: true },
    { type: "commercial_diagnostic", frequency_type: "monthly", min_days: 30, max_occurrences: 12, has_ia: true, ia_enabled: true }
  ],
  MILLIONS: [
    { type: "entrepreneur_diagnostic", frequency_type: "unlimited", min_days: 0, max_occurrences: 999, has_ia: true, ia_enabled: true },
    { type: "management_diagnostic", frequency_type: "unlimited", min_days: 0, max_occurrences: 999, has_ia: true, ia_enabled: true },
    { type: "maturity_collaborative_diagnostic", frequency_type: "unlimited", min_days: 0, max_occurrences: 999, has_ia: true, ia_enabled: true },
    { type: "productivity_diagnostic_tcmp2", frequency_type: "unlimited", min_days: 0, max_occurrences: 999, has_ia: false, ia_enabled: false },
    { type: "performance_diagnostic_matrix30", frequency_type: "unlimited", min_days: 0, max_occurrences: 999, has_ia: false, ia_enabled: false },
    { type: "workload_diagnostic", frequency_type: "unlimited", min_days: 0, max_occurrences: 999, has_ia: false, ia_enabled: false },
    { type: "service_order_diagnostic_r70i30", frequency_type: "unlimited", min_days: 0, max_occurrences: 999, has_ia: false, ia_enabled: false },
    { type: "disc_behavioral_diagnostic", frequency_type: "unlimited", min_days: 0, max_occurrences: 999, has_ia: false, ia_enabled: false },
    { type: "debt_analysis_diagnostic", frequency_type: "unlimited", min_days: 0, max_occurrences: 999, has_ia: true, ia_enabled: true },
    { type: "gerencial_diagnostic", frequency_type: "unlimited", min_days: 0, max_occurrences: 999, has_ia: true, ia_enabled: true },
    { type: "commercial_diagnostic", frequency_type: "unlimited", min_days: 0, max_occurrences: 999, has_ia: true, ia_enabled: true }
  ]
};

const DIAGNOSTIC_NAMES = {
  entrepreneur_diagnostic: "Diagnóstico de Empreendedor",
  management_diagnostic: "Diagnóstico Gerencial",
  maturity_collaborative_diagnostic: "Diagnóstico de Maturidade Colaborador",
  productivity_diagnostic_tcmp2: "Diagnóstico de Produtividade (TCMP2)",
  performance_diagnostic_matrix30: "Diagnóstico de Desempenho (Matriz 30 Critérios)",
  workload_diagnostic: "Diagnóstico de Carga de Trabalho",
  service_order_diagnostic_r70i30: "Diagnóstico de Ordem de Serviço (R70/I30)",
  disc_behavioral_diagnostic: "Diagnóstico DISC Comportamental",
  debt_analysis_diagnostic: "Diagnóstico de Endividamento",
  gerencial_diagnostic: "Diagnóstico Gerencial",
  commercial_diagnostic: "Diagnóstico Comercial"
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized. Admin only.' }, { status: 403 });
    }

    const plans = ['FREE', 'START', 'BRONZE', 'PRATA', 'GOLD', 'IOM', 'MILLIONS'];
    let createdCount = 0;
    const errors = [];

    for (const plan of plans) {
      const diagnostics = DIAGNOSTIC_FREQUENCY_DEFAULTS[plan];

      for (const diagnostic of diagnostics) {
        try {
          await base44.entities.DiagnosticFrequency.create({
            plan_id: plan,
            diagnostic_type: diagnostic.type,
            diagnostic_display_name: DIAGNOSTIC_NAMES[diagnostic.type],
            frequency_type: diagnostic.frequency_type,
            min_days_between_attempts: diagnostic.min_days,
            max_occurrences_per_period: diagnostic.max_occurrences,
            has_personalized_action_plan_ia: diagnostic.has_ia,
            ia_plan_enabled_for_this_plan: diagnostic.ia_enabled,
            is_active: true
          });
          createdCount++;
        } catch (error) {
          errors.push({
            plan,
            diagnostic: diagnostic.type,
            error: error.message
          });
        }
      }
    }

    return Response.json({
      success: true,
      message: `Seed completed: ${createdCount} DiagnosticFrequency records created`,
      errors: errors.length > 0 ? errors : null,
      total_attempted: plans.length * 11,
      created: createdCount,
      failed: errors.length
    });
  } catch (error) {
    console.error('Seed error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});