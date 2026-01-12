import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import OpenAI from 'npm:openai@4.28.0';

const openai = new OpenAI({
    apiKey: Deno.env.get("OPENAI_API_KEY_SECONDARY"),
});

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { message, context, includeWorkshopData } = await req.json();

        if (!message) {
            return Response.json({ error: 'Message is required' }, { status: 400 });
        }

        // Buscar dados do workshop se solicitado
        let workshopContext = "";
        if (includeWorkshopData) {
            try {
                const workshops = await base44.entities.Workshop.filter({ owner_id: user.id });
                const workshop = workshops?.[0];

                if (workshop) {
                    // Buscar dados complementares
                    const [diagnostics, monthlyGoals, dreRecords, employees, feedbacks] = await Promise.all([
                        base44.entities.Diagnostic.filter({ workshop_id: workshop.id }).catch(() => []),
                        base44.entities.MonthlyGoalHistory.filter({ workshop_id: workshop.id }).catch(() => []),
                        base44.entities.DREMonthly.filter({ workshop_id: workshop.id }).catch(() => []),
                        base44.entities.Employee.filter({ workshop_id: workshop.id }).catch(() => []),
                        base44.entities.EmployeeFeedback.filter({ workshop_id: workshop.id }).catch(() => [])
                    ]);

                    // Montar contexto rico
                    workshopContext = `\n\n=== DADOS DA OFICINA ===
Nome: ${workshop.name}
Segmento: ${workshop.segment || workshop.segment_auto || 'Não definido'}
Cidade/Estado: ${workshop.city}, ${workshop.state}
Faturamento Mensal: ${workshop.monthly_revenue || 'Não informado'}
Funcionários: ${workshop.employees_count || employees.length || 0}
Anos de Operação: ${workshop.years_in_business || 'Não informado'}

=== METAS ATUAIS ===
${workshop.monthly_goals ? `
Faturamento Projetado: R$ ${workshop.monthly_goals.projected_revenue?.toFixed(2) || 0}
Faturamento Realizado: R$ ${workshop.monthly_goals.actual_revenue_achieved?.toFixed(2) || 0}
Meta de Lucro: ${workshop.monthly_goals.profit_percentage || 0}%
Ticket Médio Meta: R$ ${workshop.monthly_goals.average_ticket?.toFixed(2) || 0}
` : 'Não definidas'}

=== MELHOR MÊS HISTÓRICO ===
${workshop.best_month_history ? `
Data: ${workshop.best_month_history.date || 'N/A'}
Faturamento: R$ ${workshop.best_month_history.revenue_total?.toFixed(2) || 0}
Clientes: ${workshop.best_month_history.customer_volume || 0}
Ticket Médio: R$ ${workshop.best_month_history.average_ticket?.toFixed(2) || 0}
` : 'Não registrado'}

=== DRE & TCMP² (Último Registro) ===
${dreRecords.length > 0 ? `
Mês: ${dreRecords[0].mes_referencia}
TCMP²: R$ ${dreRecords[0].tcmp2?.toFixed(2) || 0}
Valor Hora Ideal: R$ ${dreRecords[0].valor_hora_ideal?.toFixed(2) || 0}
Margem Bruta: ${dreRecords[0].margem_bruta_percentual?.toFixed(1) || 0}%
` : 'Sem registros'}

=== DIAGNÓSTICOS ===
Total de Diagnósticos: ${diagnostics.length}
Fase Atual: ${diagnostics[0]?.phase || 'Não definida'}
${diagnostics.length > 0 ? `Último diagnóstico em: ${new Date(diagnostics[0].created_date).toLocaleDateString('pt-BR')}` : ''}

=== EQUIPE ===
Total de Colaboradores: ${employees.length}
Feedbacks Registrados: ${feedbacks.length}

=== OBSERVAÇÕES ===
${workshop.observacoes_gerais || 'Nenhuma observação registrada'}
`;
                }
            } catch (error) {
                console.error('Erro ao buscar dados do workshop:', error);
            }
        }

        const systemPrompt = context || "Você é um consultor especializado em gestão de oficinas automotivas. Analise os dados fornecidos e dê recomendações práticas, diretas e acionáveis.";

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: systemPrompt + workshopContext
                },
                {
                    role: "user",
                    content: message
                }
            ],
            temperature: 0.7,
            max_tokens: 2000
        });

        return Response.json({ 
            success: true,
            response: response.choices[0].message.content,
            usage: {
                prompt_tokens: response.usage.prompt_tokens,
                completion_tokens: response.usage.completion_tokens,
                total_tokens: response.usage.total_tokens
            }
        });

    } catch (error) {
        console.error('Error in chatWithAI:', error);
        return Response.json({ 
            error: 'Erro ao processar chat',
            details: error.message 
        }, { status: 500 });
    }
});