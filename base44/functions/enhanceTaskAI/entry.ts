import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { title, description } = await req.json();

        if (!title) {
            return Response.json({ error: 'Title is required' }, { status: 400 });
        }

        const prompt = `
        Você é um assistente especialista em gestão de oficinas mecânicas e produtividade.
        O usuário precisa de ajuda para detalhar uma tarefa para um funcionário.
        
        Título da Tarefa: "${title}"
        Descrição (opcional): "${description || ''}"

        Com base nisso, gere os seguintes campos estruturados:
        1. EPIs Recomendados: Quais equipamentos de proteção individual são necessários? (Se aplicável, senão "Não se aplica")
        2. Especificidade: Detalhes técnicos ou específicos de como a tarefa deve ser feita para evitar erros. Seja direto e claro.
        3. Passo a Passo: Lista ordenada de ações para executar a tarefa.
        4. Indicador de Sucesso: Como saber se a tarefa foi concluída com êxito? (Critério de aceitação)
        5. Prazo Sugerido: Uma estimativa de tempo ou prazo razoável para essa tarefa (em texto, ex: "2 horas", "1 dia").

        Retorne APENAS um JSON com a seguinte estrutura, sem markdown:
        {
            "epi": "string",
            "specificity": "string",
            "steps": ["passo 1", "passo 2"],
            "success_indicator": "string",
            "deadline_suggestion": "string"
        }
        `;

        const response = await base44.integrations.Core.InvokeLLM({
            prompt: prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    epi: { type: "string" },
                    specificity: { type: "string" },
                    steps: { type: "array", items: { type: "string" } },
                    success_indicator: { type: "string" },
                    deadline_suggestion: { type: "string" }
                },
                required: ["epi", "specificity", "steps", "success_indicator"]
            }
        });

        return Response.json(response);

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});