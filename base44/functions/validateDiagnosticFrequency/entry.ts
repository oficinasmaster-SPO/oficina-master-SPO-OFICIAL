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
    const workshop = await base44.entities.Workshop.list();
    const currentWorkshop = workshop.find(w => w.id === workshop_id);

    if (!currentWorkshop) {
      return Response.json(
        { error: 'Workshop not found' },
        { status: 404 }
      );
    }

    const planId = currentWorkshop.planoAtual || 'FREE';

    // 2. Buscar DiagnosticFrequency para este plano + tipo
    const frequencies = await base44.entities.DiagnosticFrequency.filter({
      plan_id: planId,
      diagnostic_type: diagnostic_type,
      is_active: true
    });

    if (frequencies.length === 0) {
      return Response.json(
        { allowed: false, reason: 'Diagnostic not available for this plan' },
        { status: 403 }
      );
    }

    const frequency = frequencies[0];

    // Se unlimited, sempre permitido
    if (frequency.frequency_type === 'unlimited') {
      return Response.json({
        allowed: true,
        nextAvailableDate: null,
        message: 'Unlimited attempts available'
      });
    }

    // 3. Buscar último diagnóstico deste tipo para este workshop
    // Buscar em TODAS as entidades de diagnóstico
    const diagnosticTables = [
      'EntrepreneurDiagnostic',
      'ManagementDiagnostic',
      'ProductivityDiagnosticTCMP2',
      'PerformanceDiagnosticMatrix30',
      'MaturityCollaboratorDiagnostic',
      'WorkloadDiagnostic',
      'ServiceOrderDiagnosticR70I30',
      'DISCBehavioralDiagnostic',
      'DebtAnalysisDiagnostic',
      'GerencialDiagnostic',
      'CommercialDiagnostic'
    ];

    let lastDiagnostic = null;

    for (const table of diagnosticTables) {
      const diagnostics = await base44.entities[table].filter(
        { workshop_id },
        '-completed_at',
        1
      ).catch(() => []);

      if (diagnostics.length > 0) {
        if (!lastDiagnostic || new Date(diagnostics[0].completed_at) > new Date(lastDiagnostic.completed_at)) {
          lastDiagnostic = { ...diagnostics[0], table };
        }
      }
    }

    // 4. Validar: dias desde último >= min_days
    if (lastDiagnostic && lastDiagnostic.completed_at) {
      const lastDate = new Date(lastDiagnostic.completed_at);
      const today = new Date();
      const daysSinceLast = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));

      if (daysSinceLast < frequency.min_days_between_attempts) {
        const nextAvailableDate = new Date(lastDate.getTime() + (frequency.min_days_between_attempts * 24 * 60 * 60 * 1000));
        const daysRemaining = frequency.min_days_between_attempts - daysSinceLast;

        return Response.json({
          allowed: false,
          nextAvailableDate: nextAvailableDate.toISOString(),
          message: `You can take this diagnostic again in ${daysRemaining} days`,
          daysRemaining
        });
      }
    }

    // 5. Tudo OK
    return Response.json({
      allowed: true,
      nextAvailableDate: null,
      message: 'You can take this diagnostic now',
      frequency_type: frequency.frequency_type,
      min_days_between_attempts: frequency.min_days_between_attempts
    });
  } catch (error) {
    console.error('Validation error:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});