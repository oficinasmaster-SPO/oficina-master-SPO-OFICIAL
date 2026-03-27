import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    // Check for OPTIONS request (CORS preflight)
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { 
        status: 401,
        headers: { 'Access-Control-Allow-Origin': '*' }
      });
    }

    let payload;
    try {
        payload = await req.json();
    } catch (e) {
        return Response.json({ error: 'Invalid JSON body' }, { 
            status: 400,
            headers: { 'Access-Control-Allow-Origin': '*' }
        });
    }

    const body = payload;
    const workshop_id = user.data?.workshop_id || body.workshop_id;

    if (workshop_id) {
      try {
        const planCheck = await base44.functions.invoke('checkPlanAccess', {
          tenantId: workshop_id,
          feature: 'integrations',
          action: 'check_feature'
        });
        if (!planCheck.data?.success) {
          return Response.json({
            success: false,
            error: { code: 'PLAN_RESTRICTION', message: 'Recurso de IA não disponível no plano atual.' }
          }, { status: 403, headers: { 'Access-Control-Allow-Origin': '*' } });
        }
      } catch (e) {
        console.warn('Erro na validação do plano, continuando:', e);
      }
    }

    const { cdc_record_id, employee_id } = payload;

    console.log(`Generating report for CDC: ${cdc_record_id}, Employee: ${employee_id}`);

    if (!cdc_record_id || !employee_id) {
        return Response.json({ error: 'Missing cdc_record_id or employee_id' }, { 
            status: 400,
            headers: { 'Access-Control-Allow-Origin': '*' }
        });
    }

    // 1. Fetch Data with retry logic for eventual consistency
    let cdcRecord = null;
    let attempts = 0;
    while (!cdcRecord && attempts < 3) {
        if (attempts > 0) await new Promise(r => setTimeout(r, 1000));
        cdcRecord = await base44.entities.CDCRecord.get(cdc_record_id);
        attempts++;
    }
    
    const employee = await base44.entities.Employee.get(employee_id);

    if (!cdcRecord) {
        console.error(`CDC Record not found after ${attempts} attempts: ${cdc_record_id}`);
        return Response.json({ error: 'CDC Record not found' }, { 
            status: 404,
            headers: { 'Access-Control-Allow-Origin': '*' }
        });
    }

    if (!employee) {
        return Response.json({ error: 'Employee not found' }, { 
            status: 404,
            headers: { 'Access-Control-Allow-Origin': '*' }
        });
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
      Sonho Grande: ${cdcRecord.big_dream || 'Não informado'}
      Hobbies: ${cdcRecord.hobbies || 'Não informado'}
      Talentos: ${cdcRecord.talents || 'Não informado'}
      Desafios Pessoais: ${cdcRecord.personal_challenges || 'Não informado'}
      Expectativas com a empresa: ${cdcRecord.company_expectations || 'Não informado'}
      Pontos Fortes: ${cdcRecord.strengths || 'Não informado'}
      Pontos a Desenvolver: ${cdcRecord.areas_to_develop || 'Não informado'}
      Habilidades Profissionais: ${cdcRecord.professional_skills || 'Não informado'}
      Perfil DISC: ${cdcRecord.disc_profile || 'Não informado'}
      Valores Principais: ${cdcRecord.main_values || 'Não informado'}
      Cônjuge/Parceiro: ${cdcRecord.spouse_name ? `${cdcRecord.spouse_type || 'Parceiro'}: ${cdcRecord.spouse_name}` : 'Não informado'}
      
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
    try {
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
        const reportData = typeof aiResponse === 'string' ? JSON.parse(aiResponse) : aiResponse;
        
        const newReport = await base44.entities.CDCReport.create({
            cdc_record_id: cdc_record_id,
            employee_id: employee_id,
            scores: reportData.scores,
            analysis: reportData.analysis
        });

        return Response.json(newReport, {
            headers: { 'Access-Control-Allow-Origin': '*' }
        });

    } catch (llmError) {
        console.error("LLM Error:", llmError);
        return Response.json({ error: "Failed to generate AI analysis" }, { 
            status: 500,
            headers: { 'Access-Control-Allow-Origin': '*' }
        });
    }

  } catch (error) {
    console.error('Error generating CDC report:', error);
    return Response.json({ error: error.message }, { 
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }
});