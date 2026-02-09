import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { lesson_id, assessment_id, user_answers, employee_name } = await req.json();

    if (!lesson_id || !assessment_id || !user_answers) {
      return Response.json({ error: 'Missing required data' }, { status: 400 });
    }

    // Fetch Lesson and Assessment Data
    const lesson = await base44.entities.TrainingLesson.get(lesson_id);
    const assessment = await base44.entities.LessonAssessment.get(assessment_id);

    if (!lesson || !assessment) {
      return Response.json({ error: 'Lesson or Assessment not found' }, { status: 404 });
    }

    // Construct prompt for LLM
    const prompt = `
      Você é um mentor especialista em treinamento corporativo para oficinas mecânicas.
      
      CONTEXTO DA AULA: ${lesson.title}
      Descrição: ${lesson.description}
      Transcrição/Resumo: ${lesson.transcript || "Não disponível"}

      AVALIAÇÃO: ${assessment.title}
      Tipo: ${assessment.type}
      Instruções da IA: ${assessment.ai_prompt_template || "Analise e dê feedback construtivo."}

      RESPOSTAS DO ALUNO (${employee_name || "Colaborador"}):
      ${JSON.stringify(user_answers, null, 2)}

      GABARITO/PERGUNTAS:
      ${JSON.stringify(assessment.questions, null, 2)}

      TAREFA:
      1. Corrija (se for quiz/teste).
      2. Gere um feedback personalizado e motivador.
      3. Se o aluno errou, explique o conceito correto baseando-se no conteúdo da aula.
      4. Dê uma nota de 0 a 100 baseada nos acertos (para quiz) ou na qualidade da resposta (para exercícios dissertativos).
      
      RETORNE APENAS UM JSON NO SEGUINTE FORMATO:
      {
        "score" (0-100),
        "feedback": "string com o texto do feedback",
        "passed" (true se score >= ${assessment.passing_score || 70}),
        "corrections": [ { "question_id": "id", "is_correct", "explanation": "..." } ]
      }
    `;

    const aiResponse = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          score: { type: "number" },
          feedback: { type: "string" },
          passed: { type: "boolean" },
          corrections: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question_id: { type: "string" },
                is_correct: { type: "boolean" },
                explanation: { type: "string" }
              }
            }
          }
        },
        required: ["score", "feedback", "passed"]
      }
    });

    return Response.json(aiResponse);

  } catch (error) {
    return Response.json({ error.message }, { status: 500 });
  }
});
