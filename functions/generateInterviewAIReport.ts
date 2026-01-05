import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { interview_id } = await req.json();

    if (!interview_id) {
      return Response.json({ error: 'interview_id é obrigatório' }, { status: 400 });
    }

    // Buscar dados da entrevista
    const interview = await base44.entities.CandidateInterview.get(interview_id);
    if (!interview) {
      return Response.json({ error: 'Entrevista não encontrada' }, { status: 404 });
    }

    // Buscar dados do candidato
    const candidate = await base44.entities.Candidate.get(interview.candidate_id);

    // Preparar dados para o prompt
    const formsData = (interview.forms_used || []).map(form => {
      const answers = (form.answers || []).map(a => ({
        criterio: a.question_text,
        pontuacao: a.score,
        observacao: a.observation || a.answer
      }));
      return {
        formulario: form.form_name,
        tipo: form.is_lead_score ? 'Lead Score' : 'PPE',
        scores: form.scores,
        respostas: answers
      };
    });

    const prompt = `Você é um especialista em RH e recrutamento automotivo. Analise esta entrevista e gere um relatório executivo completo.

DADOS DO CANDIDATO:
- Nome: ${candidate?.full_name || 'N/A'}
- Cargo Pretendido: ${candidate?.desired_position || 'N/A'}
- Cidade/Bairro: ${candidate?.city || ''} ${candidate?.neighborhood || ''}
- Lead Score Inicial: ${candidate?.initial_lead_score || 'N/A'}
- Anos de Experiência: ${candidate?.experience_years || 'N/A'}
- Autoavaliação Técnica: ${candidate?.self_technical_rating || 'N/A'}/10
- Maior Ponto Forte: ${candidate?.strongest_skill || 'N/A'}
- Área de Melhoria: ${candidate?.improvement_area || 'N/A'}
- Motivo da Mudança: ${candidate?.reason_for_change || 'N/A'}
- Expectativas: ${candidate?.company_expectations || 'N/A'}
- Melhor Líder: ${candidate?.best_leader_experience || 'N/A'}
- Disponibilidade: ${candidate?.availability || 'N/A'}
- Expectativa Salarial: ${candidate?.salary_expectation || 'N/A'}
- Momento de Vida: ${candidate?.life_moment || 'N/A'}
- Sonhos: ${candidate?.dreams || 'N/A'}

HISTÓRICO PROFISSIONAL:
${candidate?.work_history?.map((w, i) => `
${i + 1}. ${w.company_name} - ${w.position}
   Líder: ${w.direct_leader || 'N/A'}
   Duração: ${w.duration_months || 0} meses
   Motivo saída: ${w.leaving_reason || 'N/A'}
`).join('\n') || 'Não informado'}

FORMAÇÃO E CURSOS:
${candidate?.courses?.map((c, i) => `
${i + 1}. ${c.course_name} - ${c.institution}
   Instrutor: ${c.instructor || 'N/A'} | ${c.hours}h | ${c.year}
`).join('\n') || 'Não informado'}

DADOS DA ENTREVISTA:
- Data: ${interview.interview_date}
- Entrevistador: ${interview.interviewer_name || 'N/A'} (${interview.interviewer_position || ''} - ${interview.interviewer_area || ''})
- Score Final: ${interview.final_score}/100
- Score Técnico: ${interview.technical_score}
- Score Comportamental: ${interview.behavioral_score}
- Score Cultural: ${interview.cultural_score}
- Recomendação do Entrevistador: ${interview.recommendation}
- Observações: ${interview.interviewer_notes || 'Nenhuma'}

FORMULÁRIOS UTILIZADOS E RESPOSTAS:
${JSON.stringify(formsData, null, 2)}

Baseado nestes dados, gere um relatório JSON com:
1. summary: Resumo executivo em 2-3 parágrafos sobre o candidato
2. strengths: Array com 3-5 pontos fortes identificados
3. weaknesses: Array com 2-4 pontos de atenção/fraquezas
4. risk_factors: Array com fatores de risco para contratação (se houver)
5. development_areas: Array com áreas de desenvolvimento sugeridas
6. hiring_recommendation: Texto com recomendação detalhada de contratação
7. onboarding_suggestions: Array com 3-5 sugestões para integração caso seja contratado
8. interview_quality_score: Nota de 0-100 sobre a qualidade/completude da entrevista

Responda APENAS com o JSON válido, sem explicações adicionais.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          strengths: { type: "array", items: { type: "string" } },
          weaknesses: { type: "array", items: { type: "string" } },
          risk_factors: { type: "array", items: { type: "string" } },
          development_areas: { type: "array", items: { type: "string" } },
          hiring_recommendation: { type: "string" },
          onboarding_suggestions: { type: "array", items: { type: "string" } },
          interview_quality_score: { type: "number" }
        }
      }
    });

    const aiReport = {
      ...response,
      generated_at: new Date().toISOString()
    };

    // Salvar relatório na entrevista
    await base44.entities.CandidateInterview.update(interview_id, {
      ai_report: aiReport
    });

    return Response.json({ 
      success: true, 
      report: aiReport 
    });

  } catch (error) {
    console.error("Erro ao gerar relatório IA:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});