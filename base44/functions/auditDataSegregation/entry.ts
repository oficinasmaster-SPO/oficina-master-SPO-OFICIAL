import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const auditReport = {
      timestamp: new Date().toISOString(),
      total_users: 0,
      segregation_issues: [],
      users_with_issues: 0,
      validation_passed: true
    };

    // Buscar todos os usuários
    const allUsers = await base44.entities.User.list('-created_date', 1000);
    auditReport.total_users = allUsers.length;

    // Diagnosticadoras para verificar
    const diagnosticEntities = [
      'EntrepreneurDiagnostic',
      'ManagementDiagnostic',
      'WorkloadDiagnostic',
      'DISCBehavioralDiagnostic',
      'CommercialDiagnostic'
    ];

    // Para cada usuário, verificar se há isolamento de dados
    for (const usr of allUsers) {
      let userIssues = [];

      // Verificar cada entidade de diagnóstico
      for (const entityName of diagnosticEntities) {
        try {
          const userDiagnostics = await base44.entities[entityName]
            .filter({ user_id: usr.id })
            .catch(() => []);

          // Se user_common (não admin, sem consulting_firm_id):
          // Só deve ver diagnósticos do seu próprio workshop_id
          if (usr.role === 'user' && !usr.data?.consulting_firm_id) {
            const workshopId = usr.data?.workshop_id || usr.workshop_id;

            for (const diag of userDiagnostics) {
              // VALIDAÇÃO: diagnóstico deve ter mesmo workshop_id que user
              if (diag.workshop_id && diag.workshop_id !== workshopId) {
                userIssues.push({
                  entity: entityName,
                  diagnostic_id: diag.id,
                  issue: `User ${usr.email} tem acesso a diagnóstico de outro workshop`,
                  diagnostic_workshop: diag.workshop_id,
                  user_workshop: workshopId,
                  severity: 'CRÍTICO'
                });
              }
            }
          }

          // Se consultor (consulting_firm_id definido):
          // Deve ver APENAS diagnósticos de clientes na sua consultoria
          if (usr.data?.consulting_firm_id) {
            for (const diag of userDiagnostics) {
              if (diag.consulting_firm_id && 
                  diag.consulting_firm_id !== usr.data.consulting_firm_id) {
                userIssues.push({
                  entity: entityName,
                  diagnostic_id: diag.id,
                  issue: `Consultor ${usr.email} tem acesso a diagnóstico de outra consultoria`,
                  diagnostic_firm: diag.consulting_firm_id,
                  user_firm: usr.data.consulting_firm_id,
                  severity: 'CRÍTICO'
                });
              }
            }
          }
        } catch (e) {
          // Entity pode não existir, ignorar
        }
      }

      // Registrar problemas
      if (userIssues.length > 0) {
        auditReport.segregation_issues.push({
          user_email: usr.email,
          user_role: usr.role,
          workshop_id: usr.data?.workshop_id || usr.workshop_id,
          issues: userIssues,
          issue_count: userIssues.length
        });

        auditReport.users_with_issues++;
        auditReport.validation_passed = false;
      }
    }

    // Resumo
    const summary = {
      total_users: auditReport.total_users,
      users_with_segregation_issues: auditReport.users_with_issues,
      total_isolated_issues: auditReport.segregation_issues.reduce(
        (sum, u) => sum + u.issue_count,
        0
      ),
      validation_status: auditReport.validation_passed ? '✅ PASS' : '❌ FAIL'
    };

    return Response.json({
      success: true,
      audit_timestamp: auditReport.timestamp,
      summary,
      detailed_report: auditReport.segregation_issues,
      recommendation: auditReport.validation_passed 
        ? 'Sistema de segregação funcionando corretamente'
        : 'AÇÃO REQUERIDA: Encontrados problemas de isolamento de dados'
    });

  } catch (error) {
    console.error("Audit Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});