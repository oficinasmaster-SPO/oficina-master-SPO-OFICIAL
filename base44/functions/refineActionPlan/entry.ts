import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { plan_id, feedback_content, feedback_type, audio_url } = await req.json();

    if (!plan_id || !feedback_content) {
      return Response.json({ error: 'plan_id e feedback_content são obrigatórios' }, { status: 400 });
    }

    const currentPlan = await base44.entities.DiagnosticActionPlan.get(plan_id);
    
    if (!currentPlan) {
      return Response.json({ error: 'Plano não encontrado' }, { status: 404 });
    }

    // Marcar plano atual como refinado
    await base44.asServiceRole.entities.DiagnosticActionPlan.update(plan_id, {
      status: 'refinado'
    });

    const prompt = `Você é um consultor especializado.

Aqui está o plano de ação atual:
${JSON.stringify(currentPlan.plan_data, null, 2)}

O usuário deu o seguinte feedback:
"${feedback_content}"

Refine o plano considerando o feedback do usuário. Mantenha a estrutura, mas ajuste:
- Objetivos se necessário
- Prioridades das ações
- Timeline se preciso
- Adicione/remova/modifique atividades conforme feedback
- Ajuste indicadores

Retorne o plano refinado no mesmo formato JSON.`;

    const response = await base44.integrations.Core.InvokeLLM({
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
                priority: { type: "string", enum: ["alta", "media", "baixa"] }
              },
              required: ["pillar_name", "direction"]
            }
          },
          timeline_plan: {
            type: "object",
            properties: {
              short_term: { type: "array", items: { type: "string" } },
              medium_term: { type: "array", items: { type: "string" } },
              long_term: { type: "array", items: { type: "string" } }
            },
            required: ["short_term", "medium_term", "long_term"]
          },
          implementation_schedule: {
            type: "array",
            items: {
              type: "object",
              properties: {
                activity_name: { type: "string" },
                description: { type: "string" },
                deadline_days: { type: "integer" },
                status: { type: "string", enum: ["pendente", "em_andamento", "concluida"], default: "pendente" },
                completed_date: { type: "string", format: "date-time" }
              },
              required: ["activity_name", "description", "deadline_days"]
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
              },
              required: ["indicator_name", "current_value", "target_value", "measurement_frequency"]
            }
          },
          next_steps_week: { type: "array", items: { type: "string" } }
        },
        required: ["diagnostic_summary", "main_objective_90_days", "pillar_directions", "timeline_plan", "implementation_schedule", "key_indicators", "next_steps_week"]
      }
    });

    // Criar nova versão
    const newPlanData = {
      diagnostic_id: currentPlan.diagnostic_id,
      diagnostic_type: currentPlan.diagnostic_type,
      workshop_id: currentPlan.workshop_id,
      employee_id: currentPlan.employee_id,
      version: currentPlan.version + 1,
      previous_version_id: plan_id,
      plan_data: response,
      user_feedback: [
        ...(currentPlan.user_feedback || []),
        {
          feedback_date: new Date().toISOString(),
          feedback_type,
          content: feedback_content,
          audio_url: audio_url || null,
          user_name: user.full_name || user.email
        }
      ],
      refinement_notes: `Refinado baseado em feedback do usuário em ${new Date().toLocaleDateString('pt-BR')}`,
      status: 'ativo',
      completion_percentage: 0,
      generated_by_ai: true
    };

    const refinedPlan = await base44.asServiceRole.entities.DiagnosticActionPlan.create(newPlanData);

    return Response.json({ success: true, plan: refinedPlan });
  } catch (error) {
    console.error('Erro ao refinar plano:', error);
    return Response.json({ 
      error: 'Erro ao refinar plano',
      details: error.message 
    }, { status: 500 });
  }
});