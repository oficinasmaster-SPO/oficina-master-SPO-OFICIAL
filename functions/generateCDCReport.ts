import { createClientFromRequest } from 'npm:@base44/sdk@0.8.11';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cdc_record_id, employee_id } = await req.json();

    if (!cdc_record_id || !employee_id) {
        return Response.json({ error: 'Missing cdc_record_id or employee_id' }, { status: 400 });
    }

    // 1. Fetch Data
    const cdcRecord = await base44.entities.CDCRecord.get(cdc_record_id);
    const employee = await base44.entities.Employee.get(employee_id);

    if (!cdcRecord) {
        return Response.json({ error: 'CDC Record not found' }, { status: 404 });
    }

    // 2. Prepare Prompt for LLM
    const prompt = `
      Analise os dados do colaborador e do CDC (Conexão e Diagnóstico do Colaborador) abaixo e gere um relatório de análise de perfil.
      
      Dados do Colaborador:
      Nome: ${employee.full_name}
      Cargo: ${employee.position}
      Data de Nascimento: ${employee.data_nascimento}
      Tempo de casa: ${employee.hire_date ? employee.hire_date : 'N/A'}
      
      Dados do CDC (Respostas do Colaborador/Gestor):
      Sonho Grande: ${cdcRecord.big_dream}
      Hobbies: ${cdcRecord.hobbies}
      Talentos: ${cdcRecord.talents}
      Desafios Pessoais: ${cdcRecord.personal_challenges}
      Expectativas com a empresa: ${cdcRecord.company_expectations}
      Pontos Fortes: ${cdcRecord.strengths}
      Pontos a Desenvolver: ${cdcRecord.areas_to_develop}
      Habilidades Profissionais: ${cdcRecord.professional_skills}
      Perfil DISC: ${cdcRecord.disc_profile}
      Valores Principais: ${cdcRecord.main_values}
      
      Tarefa:
      Gere um objeto JSON com a seguinte estrutura estrita:
      {
        "scores": {
          "leadership": number (0-100),
          "commitment": number (0-100),
          "culture_alignment": number (0-100),
          "growth_potential": number (0-100)
        },
        "analysis": {
          "behavioral": "Texto detalhado com análise comportamental baseada no DISC e respostas",
          "leadership_potential": "Texto avaliando o potencial de liderança",
          "commitment_level": "Texto avaliando o nível de comprometimento com a empresa",
          "risk_alerts": ["Alerta 1", "Alerta 2"],
          "development_plan": {
            "short_term": "Ações para curto prazo",
            "medium_term": "Ações para médio prazo",
            "long_term": "Ações para longo prazo"
          },
          "custom_message": "Uma mensagem motivacional e personalizada para o colaborador"
        }
      }
      
      Seja profissional, direto e use psicologia organizacional.
      Retorne APENAS o JSON.
    `;

    // 3. Invoke LLM
    const aiResponse = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
            type: "object",
            properties: {
                scores: {
                    type: "object",
                    properties: {
                        leadership: { type: "number" },
                        commitment: { type: "number" },
                        culture_alignment: { type: "number" },
                        growth_potential: { type: "number" }
                    },
                    required: ["leadership", "commitment", "culture_alignment", "growth_potential"]
                },
                analysis: {
                    type: "object",
                    properties: {
                        behavioral: { type: "string" },
                        leadership_potential: { type: "string" },
                        commitment_level: { type: "string" },
                        risk_alerts: { type: "array", items: { type: "string" } },
                        development_plan: {
                            type: "object",
                            properties: {
                                short_term: { type: "string" },
                                medium_term: { type: "string" },
                                long_term: { type: "string" }
                            },
                            required: ["short_term", "medium_term", "long_term"]
                        },
                        custom_message: { type: "string" }
                    },
                    required: ["behavioral", "leadership_potential", "commitment_level", "risk_alerts", "development_plan", "custom_message"]
                }
            },
            required: ["scores", "analysis"]
        }
    });

    // 4. Save CDC Report
    const reportData = aiResponse; // InvokeLLM with json schema returns the object directly
    
    const newReport = await base44.entities.CDCReport.create({
        cdc_record_id: cdc_record_id,
        employee_id: employee_id,
        scores: reportData.scores,
        analysis: reportData.analysis
    });

    return Response.json(newReport);

  } catch (error) {
    console.error('Error generating CDC report:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});