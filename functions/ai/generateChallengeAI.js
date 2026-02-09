import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { scope, workshop_id } = await req.json();

        let contextData = {};
        let promptContext = "";

        if (scope === 'workshop') {
            if (!workshop_id) {
                return Response.json({ error: 'Workshop ID required for workshop scope' }, { status: 400 });
            }
            
            // Fetch workshop specific data
            const workshop = await base44.entities.Workshop.findById(workshop_id);
            
            // Fetch recent rankings to analyze performance
            const currentPeriod = new Date().toISOString().slice(0, 7);
            const rankings = await base44.entities.ProductivityRanking.filter({ 
                workshop_id,
                period
            });

            // Summarize ranking data by area
            const areaStats = rankings.reduce((acc, rank) => {
                const area = rank.area || 'outros';
                if (!acc[area]) acc[area] = { total: 0, count: 0 };
                acc[area].total += rank.total_score || 0;
                acc[area].count += 1;
                return acc;
            }, {});

            promptContext = `
                CONTEXTO DA OFICINA: ${workshop.name}
                Segmento: ${workshop.segment || 'Geral'}
                Performance Atual (Média Pontuação por Área): ${JSON.stringify(areaStats)}
                Metas Mensais: ${JSON.stringify(workshop.monthly_goals || {})}
            `;

        } else if (scope === 'global') {
            // Admin Global Scope
            // Fetch aggregated stats (simulated for performance, in real app would use DB aggregation)
            const workshops = await base44.entities.Workshop.list();
            const activeWorkshops = workshops.filter(w => w.status === 'ativo').length;
            
            // Fetch a sample of recent rankings globally
            const currentPeriod = new Date().toISOString().slice(0, 7);
            // Limit to 50 to avoid huge payload, just to get a sense
            const rankings = await base44.entities.ProductivityRanking.list('-total_score', 50); 

            promptContext = `
                CONTEXTO GLOBAL (REDE DE OFICINAS) Oficinas Ativas: ${activeWorkshops}
                Amostra de Performance Recente nos top 50 registros globais.
                Objetivo um desafio que engaje toda a rede ou grupos específicos.
            `;
        }

        // Call LLM Integration
        const prompt = `
            Atue como um consultor especialista em gestão de oficinas mecânicas e gamificação corporativa.
            
            ${promptContext}

            TAREFA os dados acima e sugira UM (1) desafio estratégico para melhorar os resultados.
            O desafio deve ser motivador, claro e focado em um KPI específico (produtividade, faturamento, qualidade, etc.).
            
            Se for nível OFICINA nas áreas com menor performance ou maior oportunidade.
            Se for nível GLOBAL em um tema que possa ser aplicado a várias oficinas.

            RETORNE APENAS UM JSON VÁLIDO COM A SEGUINTE ESTRUTURA (sem markdown, sem explicações):
            {
                "title": "Título Criativo do Desafio",
                "description": "Descrição detalhada e motivadora do que deve ser feito",
                "type": "semanal" | "mensal" | "diario",
                "target_type": "individual" | "equipe" | "oficina",
                "target_area": "vendas" | "tecnico" | "comercial" | "todos" | "administrativo",
                "metric": "produtividade" | "qualidade" | "faturamento" | "ticket_medio",
                "goal_value" (valor meta sugerido, ex: 10000 ou 100),
                "reward_xp" (ex: 500),
                "reward_badge": "nome_badge_sugerido_em_snake_case"
            }
        `;

        const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    type: { type: "string", enum: ["semanal", "mensal", "diario"] },
                    target_type: { type: "string", enum: ["individual", "equipe", "oficina"] },
                    target_area: { type: "string" },
                    metric: { type: "string" },
                    goal_value: { type: "number" },
                    reward_xp: { type: "integer" },
                    reward_badge: { type: "string" }
                },
                required: ["title", "description", "type", "target_type", "metric", "goal_value", "reward_xp"]
            }
        });

        return Response.json(llmResponse);

    } catch (error) {
        return Response.json({ error.message }, { status: 500 });
    }
});
