import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { employee_id, role, area, workshop_id } = await req.json();

    if (!employee_id || !role || !workshop_id) {
      return Response.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    // Gerar plano personalizado com IA
    const prompt = `Crie um plano de onboarding detalhado para um novo colaborador de uma oficina automotiva com o cargo de "${role}" na área de "${area}".

O plano deve incluir:
1. Tarefas específicas para os primeiros 30 dias
2. Documentos que devem ser coletados
3. Treinamentos necessários
4. Reuniões de alinhamento
5. Metas para o primeiro mês

Formate a resposta como um plano estruturado e prático.`;

    const aiResponse = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          plan_overview: { type: "string" },
          tasks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                day: { type: "number" },
                type: { type: "string" }
              }
            }
          },
          email_sequence: {
            type: "array",
            items: {
              type: "object",
              properties: {
                day: { type: "number" },
                subject: { type: "string" },
                content: { type: "string" }
              }
            }
          }
        }
      }
    });

    // Converter tarefas para formato correto
    const tasks = aiResponse.tasks.map(task => ({
      title: task.title,
      description: task.description,
      due_date: new Date(Date.now() + task.day * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: "pendente",
      type: task.type || "outros"
    }));

    // Criar plano de onboarding
    const onboardingPlan = await base44.asServiceRole.entities.OnboardingPlan.create({
      employee_id,
      workshop_id,
      role,
      area,
      plan_content: aiResponse.plan_overview,
      tasks,
      email_sequence: aiResponse.email_sequence || [],
      start_date: new Date().toISOString().split('T')[0],
      status: "ativo",
      completion_percentage: 0
    });

    return Response.json({
      success: true,
      plan: onboardingPlan
    });

  } catch (error) {
    console.error("Error generating onboarding plan:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});