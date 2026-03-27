import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { employee_id } = body;

    if (!employee_id) {
      return Response.json({ error: 'employee_id é obrigatório' }, { status: 400 });
    }

    const workshop_id = user.data?.workshop_id || body.workshop_id;

    if (workshop_id) {
      try {
        const planCheck = await base44.functions.invoke('checkPlanAccess', {
          tenantId: workshop_id,
          feature: 'integrations',
          action: 'check_feature'
        });
        if (!planCheck.data?.success) {
          return Response.json({
            success: false,
            error: { code: 'PLAN_RESTRICTION', message: 'Recurso de IA não disponível no plano atual.' }
          }, { status: 403 });
        }
      } catch (e) {
        console.warn('Erro na validação do plano, continuando:', e);
      }
    }

    // Buscar KPIs do colaborador
    const kpis = await base44.entities.EmployeeKPI.filter({ employee_id, status: 'ativo' });
    
    // Buscar dados do colaborador
    const employee = await base44.entities.Employee.get(employee_id);

    if (!employee) {
      return Response.json({ error: 'Colaborador não encontrado' }, { status: 404 });
    }

    // Preparar dados para análise
    const kpiSummary = kpis.map(kpi => ({
      name: kpi.kpi_name,
      target: kpi.target_value,
      current: kpi.current_value,
      unit: kpi.unit,
      achievement: kpi.target_value > 0 ? ((kpi.current_value / kpi.target_value) * 100).toFixed(1) : 0,
      category: kpi.category
    }));

    // Gerar insights com IA
    const prompt = `Analise o desempenho do colaborador ${employee.full_name}, cargo ${employee.position}, com base nos seguintes KPIs:

${JSON.stringify(kpiSummary, null, 2)}

Forneça:
1. Análise geral do desempenho
2. Pontos fortes identificados
3. Áreas que precisam de melhoria
4. Recomendações específicas de ações
5. Sugestão de reconhecimento ou feedback construtivo`;

    const aiAnalysis = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          overall_assessment: { type: "string" },
          performance_score: { type: "number" },
          strengths: { type: "array", items: { type: "string" } },
          improvement_areas: { type: "array", items: { type: "string" } },
          recommendations: { type: "array", items: { type: "string" } },
          recognition_suggestion: { type: "string" }
        }
      }
    });

    return Response.json({
      success: true,
      employee: {
        id: employee.id,
        name: employee.full_name,
        position: employee.position
      },
      kpi_summary: kpiSummary,
      ai_analysis: aiAnalysis
    });

  } catch (error) {
    console.error("Error analyzing performance:", error);
    return Response.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
});