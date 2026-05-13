import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { workshop_id, isAdmin, user_id } = await req.json();

    // Define filtros baseado no role do usuário
    let filterCondition = {};

    // Se isAdmin=true (modo Admin ativo), usar só workshop_id do cliente
    if (isAdmin && workshop_id) {
      filterCondition = { workshop_id };
    } else if (user.role === 'admin' && !workshop_id) {
      // Admin vendo todos (sem filtro de cliente específico)
      filterCondition = {};
    } else if (user.data?.consulting_firm_id && !workshop_id) {
      // Consultor vendo todos os clientes da sua consultoria
      filterCondition = { consulting_firm_id: user.data.consulting_firm_id };
    } else if (workshop_id) {
      // User comum vendo sua empresa
      filterCondition = { workshop_id };
    } else {
      // User comum SEM workshop_id: só vê diagnósticos onde ELE é o user_id
      // (não por created_by, pois consultor pode ter criado para ele)
      filterCondition = { user_id: user.id };
    }

    // Todas as entidades de diagnóstico e seus tipos
    const diagnosticSources = [
      { entity: 'EntrepreneurDiagnostic', type: 'entrepreneur_diagnostic' },
      { entity: 'ManagementDiagnostic', type: 'management_diagnostic' },
      { entity: 'ProductivityDiagnosticTCMP2', type: 'productivity_diagnostic_tcmp2' },
      { entity: 'PerformanceDiagnosticMatrix30', type: 'performance_diagnostic_matrix30' },
      { entity: 'MaturityCollaboratorDiagnostic', type: 'maturity_collaborative_diagnostic' },
      { entity: 'WorkloadDiagnostic', type: 'workload_diagnostic' },
      { entity: 'ServiceOrderDiagnosticR70I30', type: 'service_order_diagnostic_r70i30' },
      { entity: 'DISCBehavioralDiagnostic', type: 'disc_behavioral_diagnostic' },
      { entity: 'DebtAnalysisDiagnostic', type: 'debt_analysis_diagnostic' },
      { entity: 'GerencialDiagnostic', type: 'gerencial_diagnostic' },
      { entity: 'CommercialDiagnostic', type: 'commercial_diagnostic' }
    ];

    let allDiagnostics = [];

    // Buscar de TODAS as tabelas
    for (const source of diagnosticSources) {
      const diagnostics = await base44.entities[source.entity].filter(
        filterCondition,
        '-completed_at',
        1000
      ).catch(() => []);

      // Adicionar tipo ao resultado + VALIDAÇÃO FINAL de isolamento
      const withType = diagnostics.map(d => ({
        ...d,
        diagnostic_type: source.type
      })).filter(d => {
        // VALIDAÇÃO CRÍTICA: Garantir que user comum vê APENAS seus diagnósticos
        if (!isAdmin && !user.data?.consulting_firm_id && !workshop_id) {
          // User comum sem workshop: validar que é seu diagnóstico por user_id
          return d.user_id === user.id;
        }
        // Para outros casos, confiar no filterCondition
        return true;
      });

      allDiagnostics = [...allDiagnostics, ...withType];
    }

    // Ordenar por data de conclusão ou criação (decrescente)
    allDiagnostics.sort((a, b) => {
      const dateA = new Date(a.completed_at || a.created_date);
      const dateB = new Date(b.completed_at || b.created_date);
      return dateB - dateA;
    });

    return Response.json({
      success: true,
      count: allDiagnostics.length,
      diagnostics: allDiagnostics,
      filter: {
        user_role: user.role,
        workshop_id: workshop_id || null,
        consulting_firm_id: user.data?.consulting_firm_id || null
      }
    });
  } catch (error) {
    console.error('History error:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});