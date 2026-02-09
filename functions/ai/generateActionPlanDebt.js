import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { diagnostic_id } = await req.json();
    const diagnostic = await base44.entities.DebtAnalysis.get(diagnostic_id);
    if (!diagnostic) return Response.json({ error: 'Diagnóstico não encontrado' }, { status: 404 });

    const prompt = `Consultor financeiro especialista em reestruturação de dívidas.

Análise de Endividamento:
- Dívidas Totais$ ${diagnostic.total_debt}
- Receita Mensal$ ${diagnostic.monthly_revenue}
- Comprometimento: ${diagnostic.debt_percentage?.toFixed(1)}%
- Classificação: ${diagnostic.risk_level}
- Dívidas Críticas: ${diagnostic.critical_debts?.length || 0}

Gere plano de reestruturação financeira para 90 dias:
1. Resumo da situação de endividamento
2. Objetivo principal (redução de dívidas e melhoria de fluxo)
3. Direcionamentos (negociação, corte de custos, aumento de receita, organização financeira)
4. Timeline (0-30, 30-60, 60-90 dias)
5. Cronograma: 8-12 ações práticas
6. Indicadores financeiros
7. Próximos passos desta semana

JSON apenas.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          diagnostic_summary: { type: "string" },
          main_objective: { type: "string" },
          action_directions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                area_name: { type: "string" },
                direction: { type: "string" },
                priority: { type: "string", enum: ["alta", "media", "baixa"] }
              }
            }
          },
          timeline_plan: {
            type: "object",
            properties: {
              short_term: { type: "array", items: { type: "string" } },
              medium_term: { type: "array", items: { type: "string" } },
              long_term: { type: "array", items: { type: "string" } }
            }
          },
          implementation_schedule: {
            type: "array",
            items: {
              type: "object",
              properties: {
                activity_name: { type: "string" },
                description: { type: "string" },
                deadline_days: { type: "integer" },
                status: { type: "string", enum: ["pendente"] }
              }
            }
          },
          key_indicators: {
            type: "array",
            items: {
              type: "object",
              properties: {
                indicator_name: { type: "string" },
                current_value: { type: "string" },
                target_value: { type: "string" },
                measurement_frequency: { type: "string" }
              }
            }
          },
          next_steps_week: { type: "array", items: { type: "string" } }
        }
      }
    });

    const plan = await base44.asServiceRole.entities.DiagnosticActionPlan.create({
      diagnostic_id,
      diagnostic_type: 'DebtAnalysis',
      workshop_id.workshop_id,
      version: 1,
      plan_data,
      status: 'ativo',
      completion_percentage: 0,
      generated_by_ai
    });

    return Response.json({ success, plan });
  } catch (error) {
    return Response.json({ error.message }, { status: 500 });
  }
});
