import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json().catch(() => ({}));
        const { goalData, historyData } = body;
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
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

        // Prepare context for the LLM
        const prompt = `
        Você é um analista de performance empresarial sênior especializado em oficinas mecânicas.
        Analise os dados deste mês e o histórico recente para gerar insights estratégicos.

        Dados do Mês Atual (${goalData.month_year}):
        - Meta: R$ ${goalData.goal_established}
        - Realizado: R$ ${goalData.result_achieved}
        - Atingimento: ${goalData.percentage_achieved}%
        - Status: ${goalData.status}
        - Detalhes: ${JSON.stringify(goalData.detailed_data || {})}

        Histórico Recente:
        ${historyData.map(h => `- ${h.month_year}: ${h.percentage_achieved}%`).join('\n')}

        Gere um objeto JSON com a seguinte estrutura:
        {
            "summary": "Análise concisa do desempenho do mês.",
            "risks": ["Risco 1", "Risco 2"],
            "opportunities": ["Oportunidade 1", "Oportunidade 2"],
            "suggestions": ["Ação sugerida 1", "Ação sugerida 2"],
            "forecast": "Previsão curta para o próximo mês baseada na tendência."
        }
        `;

        const response = await base44.integrations.Core.InvokeLLM({
            prompt: prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    summary: { type: "string" },
                    risks: { type: "array", "items": { type: "string" } },
                    opportunities: { type: "array", "items": { type: "string" } },
                    suggestions: { type: "array", "items": { type: "string" } },
                    forecast: { type: "string" }
                },
                required: ["summary", "risks", "opportunities", "suggestions", "forecast"]
            }
        });

        return Response.json(response);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});