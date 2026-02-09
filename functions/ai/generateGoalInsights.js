import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { goalData, historyData } = await req.json();
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Prepare context for the LLM
        const prompt = `
        Você é um analista de performance empresarial sênior especializado em oficinas mecânicas.
        Analise os dados deste mês e o histórico recente para gerar insights estratégicos.

        Dados do Mês Atual (${goalData.month_year}):
        - Meta$ ${goalData.goal_established}
        - Realizado$ ${goalData.result_achieved}
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
            prompt,
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
        return Response.json({ error.message }, { status: 500 });
    }
});
