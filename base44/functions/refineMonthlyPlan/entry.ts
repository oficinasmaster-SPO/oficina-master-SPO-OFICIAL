import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { plan_id, feedback_content, feedback_type, audio_url } = await req.json();

    // Buscar plano atual
    const currentPlan = await base44.asServiceRole.entities.MonthlyAccelerationPlan.get(plan_id);

    // Transcrever áudio se necessário
    let transcription = '';
    if (feedback_type === 'audio' && audio_url) {
      // Implementar transcrição de áudio aqui se necessário
      transcription = feedback_content; // Por enquanto usar o texto
    }

    const feedbackText = feedback_type === 'audio' ? transcription : feedback_content;

    // Construir prompt para refinamento
    const prompt = `
Você é um consultor especialista em gestão de oficinas automotivas.

PLANO ATUAL:
${JSON.stringify(currentPlan.plan_data, null, 2)}

FEEDBACK DO USUÁRIO:
"${feedbackText}"

TAREFA:
Com base no feedback do usuário, refine e ajuste o plano de aceleração.

IMPORTANTE:
- Mantenha a estrutura JSON idêntica
- Ajuste APENAS o que foi mencionado no feedback
- Preserve as partes boas do plano original
- Seja mais específico onde o usuário pediu
- Se o feedback mencionar limitações, adapte as ações

Retorne o plano refinado no mesmo formato JSON do plano atual.
`;

    // Chamar IA
    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: prompt,
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

    // Adicionar feedback ao histórico do plano atual
    const updatedFeedback = [
      ...(currentPlan.user_feedback || []),
      {
        feedback_date: new Date().toISOString(),
        feedback_type,
        content: feedback_content,
        audio_url: audio_url || null,
        transcription: transcription || null,
        user_name: user.full_name
      }
    ];

    await base44.asServiceRole.entities.MonthlyAccelerationPlan.update(plan_id, {
      user_feedback: updatedFeedback,
      status: 'refinado'
    });

    // Criar nova versão refinada
    const refinedPlan = await base44.asServiceRole.entities.MonthlyAccelerationPlan.create({
      workshop_id: currentPlan.workshop_id,
      reference_month: currentPlan.reference_month,
      phase: currentPlan.phase,
      diagnostic_id: currentPlan.diagnostic_id,
      version: currentPlan.version + 1,
      previous_version_id: plan_id,
      plan_data: aiResponse,
      status: 'ativo',
      completion_percentage: currentPlan.completion_percentage,
      generated_by_ai: true,
      refinement_notes: `Refinado com feedback do usuário em ${new Date().toLocaleDateString('pt-BR')}`
    });

    return Response.json({ 
      success: true, 
      refined_plan: refinedPlan 
    });

  } catch (error) {
    console.error('Error refining monthly plan:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});