import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workshop_id, diagnostic_id, phase, reference_month } = await req.json();

    // Buscar dados do diagnóstico
    const diagnostic = await base44.asServiceRole.entities.Diagnostic.get(diagnostic_id);
    
    // Buscar dados da oficina
    const workshop = await base44.asServiceRole.entities.Workshop.get(workshop_id);

    // Construir prompt para IA
    const prompt = `
Você é um consultor especialista em gestão de oficinas automotivas.

DADOS DA OFICINA:
- Nome: ${workshop.name}
- Cidade: ${workshop.city} - ${workshop.state}
- Fase Atual: ${phase} (1=Sobrevivência, 2=Estruturação, 3=Crescimento, 4=Expansão)
- Segmento: ${workshop.segment}
- Faturamento Mensal: ${workshop.monthly_revenue}
- Colaboradores: ${workshop.employees_count}

DIAGNÓSTICO:
- Fase Identificada: ${diagnostic.phase}
- Letra Dominante: ${diagnostic.dominant_letter}
- Respostas: ${JSON.stringify(diagnostic.answers)}

TAREFA um Plano de Aceleração Mensal estruturado e executável para os próximos 90 dias.

O plano deve conter EXATAMENTE a seguinte estrutura JSON:
{
  "diagnostic_summary": "Resumo executivo do diagnóstico em 2-3 parágrafos",
  "main_objective_90_days": "Objetivo principal claro e mensurável para 90 dias",
  "pillar_directions": [
    {
      "pillar_name": "Nome do Pilar (ex, Pessoas, Financeiro)",
      "direction": "Direcionamento estratégico específico",
      "priority": "alta|media|baixa"
    }
  ],
  "timeline_plan": {
    "short_term": ["Ação 1 curto prazo", "Ação 2 curto prazo"],
    "medium_term": ["Ação 1 médio prazo", "Ação 2 médio prazo"],
    "long_term": ["Ação 1 longo prazo", "Ação 2 longo prazo"]
  },
  "implementation_schedule": [
    {
      "activity_name": "Nome da Atividade",
      "description": "Descrição detalhada da atividade",
      "deadline_days": 7,
      "status": "pendente"
    }
  ],
  "key_indicators": [
    {
      "indicator_name": "Nome do Indicador",
      "current_value": "Valor atual",
      "target_value": "Meta em 90 dias",
      "measurement_frequency": "Semanal|Mensal"
    }
  ],
  "next_steps_week": ["Passo 1 para esta semana", "Passo 2 para esta semana"]
}

IMPORTANTE:
- Seja específico e prático
- Foque em ações executáveis
- Considere a fase atual da oficina
- Priorize o que realmente move o negócio
- Mínimo de 5 atividades no cronograma
- Mínimo de 3 indicadores essenciais
`;

    // Chamar IA
    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          diagnostic_summary: { type: "string" },
          main_objective_90_days: { type: "string" },
          pillar_directions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                pillar_name: { type: "string" },
                direction: { type: "string" },
                priority: { type: "string" }
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
                deadline_days: { type: "number" },
                status: { type: "string" }
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

    // Criar o plano no banco
    const newPlan = await base44.asServiceRole.entities.MonthlyAccelerationPlan.create({
      workshop_id,
      reference_month,
      phase,
      diagnostic_id,
      version: 1,
      plan_data,
      status: 'ativo',
      completion_percentage: 0,
      generated_by_ai
    });

    return Response.json({ 
      success, 
      plan 
    });

  } catch (error) {
    console.error('Error generating monthly plan:', error);
    return Response.json({ 
      error.message 
    }, { status: 500 });
  }
});
