import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { currentMonthData, employeeHistory } = await req.json();
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const prompt = `
        Você é um especialista em gestão de oficinas mecânicas.
        Analise o desempenho ATUAL deste mês e projete o fechamento com base no histórico.

        Dados Atuais (Mês em andamento):
        - Dias úteis passados: ${currentMonthData.daysPassed || 15} de ${currentMonthData.totalDays || 22}
        - Faturamento Atual$ ${currentMonthData.currentRevenue}
        - Meta$ ${currentMonthData.targetRevenue}
        - Ritmo Diário Atual$ ${currentMonthData.currentDailyAverage}
        - Ritmo Necessário p/ Meta$ ${currentMonthData.requiredDailyAverage}

        Histórico do Colaborador (3 meses):
        ${employeeHistory.map(h => `- ${h.month}: ${h.revenue}`).join('\n')}

        Gere um JSON com:
        1. "projected_revenue" de fechamento (número)
        2. "status": "on_track" (no caminho), "risk" (risco moderado), "critical" (risco alto)
        3. "probability": % de chance de bater a meta (0-100)
        4. "alert_message" curta de alerta se houver risco
        5. "action_plan" de 3 ações corretivas imediatas sugeridas (curtas)
        `;

        const response = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    projected_revenue: { type: "number" },
                    status: { type: "string", enum: ["on_track", "risk", "critical", "success"] },
                    probability: { type: "integer" },
                    alert_message: { type: "string" },
                    action_plan: { type: "array", items: { type: "string" } }
                },
                required: ["projected_revenue", "status", "probability", "action_plan"]
            }
        });

        return Response.json(response);
    } catch (error) {
        return Response.json({ error.message }, { status: 500 });
    }
});
