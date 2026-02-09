import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import OpenAI from 'npm@4.28.0';

const openai = new OpenAI({
    apiKey.env.get("OPENAI_API_KEY_SECONDARY"),
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
                const workshops = await base44.entities.Workshop.filter({ owner_id.id });
                let workshop = workshops?.[0];

                if (!workshop && user.workshop_id) {
                    workshop = await base44.entities.Workshop.get(user.workshop_id);
                }

                if (workshop) {
                    // Buscar dados complementares com mais detalhes
                    const [
                        diagnostics,
                        entrepreneurDiag,
                        dreRecords,
                        employees,
                        feedbacks,
                        goalHistory,
                        debtAnalysis
                    ] = await Promise.all([
                        base44.entities.Diagnostic.filter({ workshop_id.id }).catch(() => []),
                        base44.entities.EntrepreneurDiagnostic.filter({ workshop_id.id }).catch(() => []),
                        base44.entities.DREMonthly.filter({ workshop_id.id }).catch(() => []),
                        base44.entities.Employee.filter({ workshop_id.id }).catch(() => []),
                        base44.entities.EmployeeFeedback.filter({ workshop_id.id }).catch(() => []),
                        base44.entities.GoalHistory.filter({ workshop_id.id }).catch(() => []),
                        base44.entities.DebtAnalysis.filter({ workshop_id.id }).catch(() => [])
                    ]);

                    // Calcular R70/I30
                    const lastDRE = dreRecords[0];
                    const r70 = lastDRE?.r70_percentual || 70;
                    const i30 = lastDRE?.i30_percentual || 30;

                    // Contar funções dos colaboradores
                    const roleCount = employees.reduce((acc, emp) => {
                        const role = emp.job_role || 'outros';
                        acc[role] = (acc[role] || 0) + 1;
                        return acc;
                    }, {});

                    const roleNames = {
                        socio: 'Sócio',
                        diretor: 'Diretor',
                        supervisor_loja: 'Supervisor',
                        gerente: 'Gerente',
                        lider_tecnico: 'Líder Técnico',
                        tecnico: 'Técnico',
                        funilaria_pintura: 'Funilaria/Pintura',
                        comercial: 'Comercial',
                        consultor_vendas: 'Consultor de Vendas',
                        financeiro: 'Financeiro',
                        marketing: 'Marketing',
                        estoque: 'Estoque',
                        administrativo: 'Administrativo',
                        motoboy: 'Motoboy',
                        lavador: 'Lavador',
                        acelerador: 'Acelerador',
                        outros: 'Outros'
                    };

                    // Verificar diagnósticos realizados vs pendentes
                    const allDiagnosticTypes = [
                        { name: 'Diagnóstico de Fase Empresarial', entity, label: 'Fase' },
                        { name: 'Diagnóstico do Empresário', entity, label: 'Perfil Empresário' },
                        { name: 'Diagnóstico de Maturidade', entity base44.entities.CollaboratorMaturityDiagnostic.filter({ workshop_id.id }).catch(() => []), label: 'Maturidade Colaborador' },
                        { name: 'Diagnóstico DISC', entity base44.entities.DISCDiagnostic.filter({ workshop_id.id }).catch(() => []), label: 'DISC' },
                        { name: 'Diagnóstico de Produtividade', entity base44.entities.ProductivityDiagnostic.filter({ workshop_id.id }).catch(() => []), label: 'Produtividade' },
                        { name: 'Diagnóstico de Desempenho', entity base44.entities.PerformanceMatrixDiagnostic.filter({ workshop_id.id }).catch(() => []), label: 'Desempenho' },
                        { name: 'Análise de OS', entity base44.entities.ServiceOrderDiagnostic.filter({ workshop_id.id }).catch(() => []), label: 'Ordem de Serviço' }
                    ];

                    const diagnosticsSummary = allDiagnosticTypes.map(d => ({
                        name.label,
                        done.entity.length > 0,
                        count.entity.length
                    }));

                    const pendingDiagnostics = diagnosticsSummary.filter(d => !d.done).map(d => d.name);
                    const completedDiagnostics = diagnosticsSummary.filter(d => d.done);

                    // Montar contexto rico
                    workshopContext = `

=== IDENTIFICAÇÃO DO USUÁRIO ===
👤 Nome: ${user.full_name}
📧 Email: ${user.email}
🏢 Cargo: ${user.role === 'admin' ? 'Administrador' : 'Sócio-Administrador'}

=== APRESENTAÇÃO DA OFICINA ===
🏭 Oficina: ${workshop.name}
📍 Localização: ${workshop.city}, ${workshop.state}
🔧 Segmento: ${workshop.segment || workshop.segment_auto || 'Não definido'}
💰 Faturamento Mensal: ${workshop.monthly_revenue || 'Não informado'}
📅 Anos de Operação: ${workshop.years_in_business || 'Não informado'}

=== EQUIPE COMPLETA ===
👥 Total de Colaboradores: ${employees.length}
${Object.keys(roleCount).length > 0 ? Object.entries(roleCount).map(([role, count]) =>
                        `   • ${count} ${roleNames[role] || role}`
                    ).join('\n') : '   (Nenhum colaborador cadastrado)'}
💬 Feedbacks Registrados: ${feedbacks.length}

=== METAS ATUAIS ===
${workshop.monthly_goals ? `
💵 Faturamento Projetado$ ${workshop.monthly_goals.projected_revenue?.toFixed(2) || 0}
✅ Faturamento Realizado$ ${workshop.monthly_goals.actual_revenue_achieved?.toFixed(2) || 0}
📊 Meta de Lucro: ${workshop.monthly_goals.profit_percentage || 0}%
🎯 Ticket Médio Meta$ ${workshop.monthly_goals.average_ticket?.toFixed(2) || 0}
` : '⚠️ IMPORTANTE mensais não definidas. Seria interessante configurá-las para eu poder te ajudar melhor!'}

=== DRE & INDICADORES TÉCNICOS ===
${lastDRE ? `
📆 Mês de Referência: ${lastDRE.mes_referencia}
💎 TCMP² (Valor Hora Ideal)$ ${lastDRE.tcmp2?.toFixed(2) || 0}
⚙️ Valor Hora Praticado$ ${lastDRE.valor_hora_ideal?.toFixed(2) || 0}
📈 R70 (Receita): ${r70.toFixed(1)}% | I30 (Investimento): ${i30.toFixed(1)}%
💹 Margem Bruta: ${lastDRE.margem_bruta_percentual?.toFixed(1) || 0}%
${lastDRE.kit_master ? `🎁 Kit Master$ ${lastDRE.kit_master.toFixed(2)}` : ''}
${lastDRE.pave ? `📦 PAVE$ ${lastDRE.pave.toFixed(2)}` : ''}
` : '⚠️ IMPORTANTE de DRE/TCMP² não registrados. Isso é fundamental para análises precisas!'}

=== MELHOR DESEMPENHO HISTÓRICO ===
${workshop.best_month_history ? `
🏆 Melhor Mês: ${workshop.best_month_history.date || 'N/A'}
💰 Faturamento$ ${workshop.best_month_history.revenue_total?.toFixed(2) || 0}
👥 Clientes Atendidos: ${workshop.best_month_history.customer_volume || 0}
🎯 Ticket Médio$ ${workshop.best_month_history.average_ticket?.toFixed(2) || 0}
` : '⚠️ Seria importante registrar o seu melhor mês histórico para dimensionamento de metas!'}

=== DIAGNÓSTICOS REALIZADOS ===
✅ Diagnósticos Completos:
${completedDiagnostics.length > 0 ? completedDiagnostics.map(d => `   • ${d.name} (${d.count} registro${d.count > 1 ? 's' : ''})`).join('\n') : '   Nenhum diagnóstico realizado ainda'}

${diagnostics.length > 0 ? `
🎯 Fase Atual da Empresa ${diagnostics[0]?.phase || 'Não definida'}
📅 Último Diagnóstico: ${new Date(diagnostics[0].created_date).toLocaleDateString('pt-BR')}
` : ''}

${entrepreneurDiag.length > 0 ? `
👔 Perfil do Empresário: ${entrepreneurDiag[0].dominant_profile || 'Não definido'}
` : ''}

⚠️ DIAGNÓSTICOS PENDENTES (importantes para análises completas):
${pendingDiagnostics.length > 0 ? pendingDiagnostics.map(d => `   • ${d}`).join('\n') : '   Todos os diagnósticos principais foram realizados!'}

=== GESTÃO DE ENDIVIDAMENTO ===
${debtAnalysis.length > 0 ? `
📊 Curva de Endividamento: ${debtAnalysis[0].debt_level || 'Analisada'}
💳 Análise realizada em: ${new Date(debtAnalysis[0].created_date).toLocaleDateString('pt-BR')}
` : '⚠️ Análise de endividamento não realizada - seria importante para planejamento financeiro!'}

=== HISTÓRICO DE METAS ===
${goalHistory.length > 0 ? `
📈 Registros de Meta: ${goalHistory.length}
` : '⚠️ Histórico de metas vazio - comece a registrar suas metas!'}

---

💡 IMPORTANTE de responder sua pergunta, vou analisar esses dados...
`;
                }
            } catch (error) {
                console.error('Erro ao buscar dados do workshop:', error);
            }
        }

        const systemPrompt = `Você é um consultor sênior especializado em gestão de oficinas automotivas com foco em RESULTADOS PRÁTICOS E QUANTITATIVOS.

INSTRUÇÕES CRÍTICAS - SIGA RIGOROSAMENTE:

1. APRESENTAÇÃO INICIAL (SEMPRE):
   - Cumprimente o usuário PELO NOME
   - Mencione a oficina pelo nome e localização
   - Resuma os dados identificados, funcionários, fase

2. ANÁLISE QUANTITATIVA OBRIGATÓRIA:
   - Se a pergunta envolver metas/crescimento, CALCULE os números:
     * Faturamento atual → Meta → Diferença em R$
     * Faturamento por funcionário atual
     * Quanto cada funcionário precisa aumentar
     * Meta por função (técnicos, comercial, etc)
   - Use os dados reais fornecidos no contexto
   - Apresente em formato de tabela ou lista numerada

3. EXEMPLO PRÁTICO DE RESPOSTA PARA "Como aumentar vendas em 30%":

"Olá, Rafa! 👋

Analisando a Oficina do Tempo, aqui estão os números:

📊 SITUAÇÃO ATUAL:
• Faturamento mensal$ 100.000 (exemplo)
• Equipe: 8 funcionários (4 técnicos, 2 vendas, 1 admin, 1 sócio)
• Faturamento por funcionário$ 12.500/mês

🎯 META DE CRESCIMENTO 30%:
• Novo faturamento$ 130.000/mês
• Aumento necessário$ 30.000/mês
• Por funcionário: +R$ 3.750/mês cada

💡 PLANO DE AÇÃO PRÁTICO:
1. Técnicos (4) produtividade de X para Y horas/mês = +R$ 15.000
2. Comercial (2) ticket médio de R$ A para R$ B = +R$ 10.000
3. Marketing X novos leads/mês = +R$ 5.000

Quer que eu detalhe alguma dessas estratégias?"

4. SEMPRE:
   - Liste diagnósticos feitos E pendentes
   - Se faltar dados (DRE, metas, etc), mencione a importância
   - Seja direto antes de teoria
   - Use emojis para organizar visualmente

${context || ''}`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content + workshopContext
                },
                {
                    role: "user",
                    content
                }
            ],
            temperature: 0.7,
        });

        return Response.json({
            success,
            response.choices[0].message.content,
            usage: {
                prompt_tokens.usage.prompt_tokens,
                completion_tokens.usage.completion_tokens,
                total_tokens.usage.total_tokens
            }
        });

    } catch (error) {
        console.error('Error in chatWithAI:', error);
        return Response.json({
            error: 'Erro ao processar chat',
            details.message
        }, { status: 500 });
    }
});
