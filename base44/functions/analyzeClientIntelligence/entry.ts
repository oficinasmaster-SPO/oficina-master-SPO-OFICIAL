import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { workshopId, ataId, analysisType = "full", diagnosticIds = [] } = await req.json();

    if (!workshopId) {
      return new Response(JSON.stringify({ error: "Workshop ID required" }), { status: 400 });
    }

    const suggestions = [];
    const context = [];

    try {
      // Carregar dados da ATA se fornecido
      if (ataId) {
        const ata = await base44.entities.MeetingMinutes.get(ataId);
        if (ata) {
          context.push(`Ata: ${ata.pautas || ""}`);
          context.push(`Objetivos: ${ata.objetivos_atendimento || ""}`);
          context.push(`Próximos passos: ${ata.proximos_passos?.map(p => p.descricao).join("; ") || ""}`);
        }
      }

      // Carregar dados da oficina
      const workshop = await base44.entities.Workshop.get(workshopId);
      if (workshop) {
        context.push(`Workshop: ${workshop.name}`);
        context.push(`Fase: ${workshop.maturity_level}`);
        context.push(`Faturamento: ${workshop.monthly_revenue || "N/A"}`);
        context.push(`Colaboradores: ${workshop.employees_count || 0}`);
      }

      // Carregar diagnósticos recentes
      const diagnostics = await base44.entities.Diagnostic.filter({
        workshop_id: workshopId,
      });
      if (diagnostics?.length > 0) {
        context.push(
          `Diagnósticos: ${diagnostics.slice(0, 3).map(d => `Fase ${d.phase}`).join(", ")}`
        );
      }

      // Carregar dados financeiros (DRE)
      try {
        const dreData = await base44.entities.DREMonthly.filter({
          workshop_id: workshopId,
        });
        if (dreData?.length > 0) {
          const latestDre = dreData[0];
          context.push(
            `Faturamento: R$ ${latestDre.total_revenue || 0}, TCMP²: ${latestDre.tcmp2_value || "N/A"}`
          );
        }
      } catch (e) {
        // DRE pode não existir
      }

      // Chamar IA para gerar sugestões
      const aiResponse = await base44.integrations.Core.InvokeLLM({
        prompt: `Você é um consultor de negócios especializado em oficinas automotivas. Analise os seguintes dados da oficina e gere sugestões de INTELIGÊNCIA DE CLIENTE estruturadas.

Contexto da Oficina:
${context.join("\n")}

Gere sugestões NO MÁXIMO 3-4 ITENS em formato JSON com este schema:
{
  "suggestions": [
    {
      "type": "dor|duvida|desejo|risco|evolucao",
      "title": "Título curto e direto",
      "description": "Descrição detalhada",
      "area": "vendas_conversao|marketing_demanda|operacao_tecnica|gestao_processos|financeiro|pessoas_contratacao|estoque_compras|precificacao_margem|atendimento_experiencia|lideranca_dono",
      "subcategory": "Subcategoria específica",
      "gravity": "baixa|media|alta|critica",
      "action_defined": false
    }
  ]
}

Seja objetivo e prático. As sugestões devem ser acionáveis.`,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  title: { type: "string" },
                  description: { type: "string" },
                  area: { type: "string" },
                  subcategory: { type: "string" },
                  gravity: { type: "string" },
                  action_defined: { type: "boolean" },
                },
              },
            },
          },
        },
      });

      if (aiResponse?.suggestions && Array.isArray(aiResponse.suggestions)) {
        suggestions.push(...aiResponse.suggestions);
      }
    } catch (error) {
      console.error("Erro ao chamar IA:", error);
      // Retornar vazio em vez de falhar completamente
    }

    return new Response(
      JSON.stringify({
        suggestions,
        context_used: context.length,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Erro na função:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});