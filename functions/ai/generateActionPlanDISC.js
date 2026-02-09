import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { diagnostic_id } = await req.json();
    const diagnostic = await base44.entities.DISCDiagnostic.get(diagnostic_id);
    if (!diagnostic) return Response.json({ error: 'Diagnóstico não encontrado' }, { status: 404 });

    const employee = diagnostic.employee_id ? await base44.entities.Employee.get(diagnostic.employee_id) ;

    const profileLabels = {
      executor_d: "Executor (D) - Direto, competitivo, foco em resultados",
      comunicador_i: "Comunicador (I) - Persuasivo, entusiasta, foco em pessoas",
      planejador_s: "Planejador (S) - Estável, cooperativo, foco em harmonia",
      analista_c: "Analista (C) - Preciso, sistemático, foco em qualidade"
    };

    const prompt = `Especialista em perfis comportamentais DISC.

Perfil DISC:
- Colaborador: ${employee?.full_name || diagnostic.candidate_name || 'N/A'}
- Perfil Dominante: ${profileLabels[diagnostic.dominant_profile]}
- Pontuações=${diagnostic.profile_scores.executor_d}% I=${diagnostic.profile_scores.comunicador_i}% S=${diagnostic.profile_scores.planejador_s}% C=${diagnostic.profile_scores.analista_c}%

Gere plano de desenvolvimento comportamental para 90 dias:
1. Resumo do perfil DISC
2. Objetivo principal de desenvolvimento
3. Direcionamentos (comunicação, liderança, trabalho em equipe, gestão de conflitos)
4. Timeline (0-30, 30-60, 60-90 dias)
5. Cronograma: 8-12 ações de desenvolvimento
6. Indicadores comportamentais
7. Próximos passos desta semana

JSON apenas.`;

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

    const plan = await base44.asServiceRole.entities.DiagnosticActionPlan.create({
      diagnostic_id,
      diagnostic_type: 'DISCDiagnostic',
      workshop_id.workshop_id,
      employee_id.employee_id,
      version: 1,
      plan_data,
      status: 'ativo',
      completion_percentage: 0,
      generated_by_ai
    });

    return Response.json({ success, plan });
  } catch (error) {
    return Response.json({ error.message }, { status: 500 });
  }
});
