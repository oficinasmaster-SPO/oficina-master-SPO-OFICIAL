import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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

    // Buscar diagnóstico
    const diagnostic = await base44.entities.Diagnostic.get(diagnostic_id);
    
    if (!diagnostic) {
      return Response.json({ error: 'Diagnóstico não encontrado' }, { status: 404 });
    }

    // Buscar workshop
    const workshop = diagnostic.workshop_id 
      ? await base44.entities.Workshop.get(diagnostic.workshop_id)
      : null;

    // Mapear fase para descrição
    const phaseDescriptions = {
      1: "F1 Base - Sobrevivência e geração de caixa",
      2: "F2 Organização - Estruturação de processos e equipe",
      3: "F3 Tração - Crescimento e otimização",
      4: "F4 Excelência - Consolidação e escala"
    };

    const phaseDesc = phaseDescriptions[diagnostic.phase] || "Fase não identificada";

    // Verificar se tem justificativas
    const hasJustifications = diagnostic.justifications_completed && 
      diagnostic.answers?.some(a => a.justificativa_texto?.trim());

    // Construir seção de respostas e justificativas
    let answersSection = "\n### Respostas do Diagnóstico:\n\n";
    
    if (hasJustifications) {
      diagnostic.answers.forEach((answer, index) => {
        answersSection += `**Pergunta ${answer.question_id}:**\n`;
        answersSection += `- Resposta escolhida: ${answer.selected_option}\n`;
        answersSection += `- Justificativa: "${answer.justificativa_texto}"\n`;
        if (answer.observacoes?.trim()) {
          answersSection += `- Observações: "${answer.observacoes}"\n`;
        }
        if (answer.justificativa_audio_url) {
          answersSection += `- Áudio disponível: ${answer.justificativa_audio_url}\n`;
        }
        answersSection += '\n';
      });
    } else {
      answersSection += "⚠️ Este diagnóstico não possui justificativas detalhadas.\n";
      answersSection += "Distribuição de respostas:\n";
      const letterCount = { A: 0, B: 0, C: 0, D: 0 };
      diagnostic.answers.forEach(a => letterCount[a.selected_option]++);
      Object.entries(letterCount).forEach(([letter, count]) => {
        answersSection += `- Letra ${letter}: ${count} respostas\n`;
      });
    }

    // Gerar plano com IA
    const prompt = `Você é um consultor especializado em gestão de oficinas automotivas.

Baseado neste diagnóstico da oficina:
- Fase: ${diagnostic.phase} - ${phaseDesc}
- Letra Dominante: ${diagnostic.dominant_letter}
- Oficina: ${workshop?.name || 'Não especificada'}
- Faturamento: ${workshop?.monthly_revenue || 'Não informado'}
- Colaboradores: ${workshop?.employees_count || 'Não informado'}

${answersSection}

${hasJustifications ? `
**IMPORTANTE:** Use as justificativas acima para personalizar o plano. Cite explicitamente o que o cliente relatou.
Exemplo: "Você mencionou que [citação da justificativa], por isso a ação recomendada é..."
` : `
**NOTA:** Como não há justificativas detalhadas, crie um plano genérico baseado na fase identificada.
`}

Gere um plano de ação estruturado para os próximos 90 dias com:

1. Resumo do diagnóstico (2-3 parágrafos) - ${hasJustifications ? 'citando insights das justificativas' : 'baseado na fase'}
2. Objetivo principal para 90 dias (específico e mensurável)
3. Direcionamentos por área (4-6 áreas prioritárias: vendas, processos, pessoas, financeiro, etc)
4. Timeline de ações:
   - Curto prazo (0-30 dias): 4-5 ações imediatas
   - Médio prazo (30-60 dias): 4-5 ações estruturantes
   - Longo prazo (60-90 dias): 3-4 ações de consolidação
5. Cronograma detalhado: 8-12 atividades com descrições e prazos em dias
6. Indicadores chave: 4-5 KPIs para acompanhar
7. Próximos passos para esta semana: 3-5 ações práticas

Retorne APENAS o JSON no formato especificado, sem texto adicional.`;

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

    // Criar plano
    const planData = {
      diagnostic_id,
      diagnostic_type: 'Diagnostic',
      workshop_id: diagnostic.workshop_id,
      version: 1,
      plan_data: response,
      status: 'ativo',
      completion_percentage: 0,
      generated_by_ai: true,
      generated_from_justifications: hasJustifications
    };

    console.log('📝 Criando plano com dados:', planData);
    const plan = await base44.asServiceRole.entities.DiagnosticActionPlan.create(planData);
    console.log('✅ Plano criado com ID:', plan.id);

    return Response.json({ 
      success: true, 
      plan,
      had_justifications: hasJustifications
    });
  } catch (error) {
    console.error('❌ Erro ao gerar plano:', error);
    console.error('Stack:', error.stack);
    return Response.json({ 
      error: 'Erro ao gerar plano de ação',
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});