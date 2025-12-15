import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { diagnostic_id } = await req.json();

    if (!diagnostic_id) {
      return Response.json({ error: 'diagnostic_id é obrigatório' }, { status: 400 });
    }

    const diagnostic = await base44.entities.CollaboratorMaturityDiagnostic.get(diagnostic_id);
    
    if (!diagnostic) {
      return Response.json({ error: 'Diagnóstico não encontrado' }, { status: 404 });
    }

    const employee = diagnostic.employee_id 
      ? await base44.entities.Employee.get(diagnostic.employee_id)
      : null;

    const maturityLabels = {
      bebe: "Bebê - Necessita desenvolvimento básico e supervisão constante",
      crianca: "Criança - Em desenvolvimento, precisa orientação regular",
      adolescente: "Adolescente - Quase autônomo, precisa validação ocasional",
      adulto: "Adulto - Totalmente autônomo e referência para outros"
    };

    const maturityDesc = maturityLabels[diagnostic.maturity_level] || "Nível não identificado";

    const prompt = `Você é um consultor de RH especializado em desenvolvimento de colaboradores.

Baseado neste diagnóstico de maturidade:
- Colaborador: ${employee?.full_name || diagnostic.candidate_name || 'Não especificado'}
- Cargo: ${employee?.position || 'Não especificado'}
- Nível de Maturidade: ${diagnostic.maturity_level?.toUpperCase()} - ${maturityDesc}
- Pontuações: ${JSON.stringify(diagnostic.maturity_scores)}

Gere um plano de desenvolvimento para os próximos 90 dias com:

1. Resumo do diagnóstico de maturidade (análise detalhada do nível atual)
2. Objetivo principal de desenvolvimento para 90 dias
3. Direcionamentos por competência (4-6 áreas: técnica, autonomia, comunicação, liderança, etc)
4. Timeline de desenvolvimento:
   - Curto prazo (0-30 dias): Ações de ajuste imediato
   - Médio prazo (30-60 dias): Desenvolvimento de competências
   - Longo prazo (60-90 dias): Consolidação e evolução
5. Cronograma de atividades: 8-12 ações específicas com prazos
6. Indicadores de progresso: 4-5 métricas para acompanhar evolução
7. Próximos passos desta semana: 3-5 ações práticas

Retorne APENAS o JSON no formato especificado.`;

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

    const planData = {
      diagnostic_id,
      diagnostic_type: 'CollaboratorMaturityDiagnostic',
      workshop_id: diagnostic.workshop_id,
      employee_id: diagnostic.employee_id,
      version: 1,
      plan_data: response,
      status: 'ativo',
      completion_percentage: 0,
      generated_by_ai: true
    };

    const plan = await base44.asServiceRole.entities.DiagnosticActionPlan.create(planData);

    return Response.json({ success: true, plan });
  } catch (error) {
    console.error('Erro ao gerar plano:', error);
    return Response.json({ 
      error: 'Erro ao gerar plano de ação',
      details: error.message 
    }, { status: 500 });
  }
});