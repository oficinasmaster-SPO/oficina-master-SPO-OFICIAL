import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Follow-up Guarda-Chuva Semanal
 * 
 * Executa toda segunda-feira às 09:00
 * Varre TODOS workshops ativos com planos elegíveis
 * Cria FollowUpReminder se:
 * - Plano elegível (BRONZE, PRATA, GOLD, IOM, MILLIONS)
 * - NÃO tem follow-up agendado para os PRÓXIMOS 7 DIAS
 * 
 * REGRA SIMPLES: "Semana que vem este cliente vai ter contato?"
 * → NÃO vai ter → CRIA follow-up automático
 * → JÁ vai ter → Não cria
 * 
 * @param {boolean} dry_run - Se true, só simula sem criar
 * @param {string[]} planos_elegiveis - Lista de planos elegíveis
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Validar autenticação (apenas admin pode executar)
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ 
        error: 'Unauthorized: Apenas administradores podem executar esta função',
        success: false 
      }, { status: 403 });
    }

    // Parse do payload
    const { 
      dry_run = false, 
      lookback_days = 30,
      planos_elegiveis = ['BRONZE', 'PRATA', 'GOLD', 'IOM', 'MILLIONS']
    } = await req.json().catch(() => ({}));

    console.log(`[GUARDA-CHUVA] Iniciando execução - dry_run: ${dry_run}`);
    console.log(`[GUARDA-CHUVA] Lookback: ${lookback_days} dias`);
    console.log(`[GUARDA-CHUVA] Planos elegíveis: ${planos_elegiveis.join(', ')}`);

    // Buscar TODOS workshops
    const todosWorkshops = await base44.entities.Workshop.filter({
      status: 'ativo'
    });

    console.log(`[GUARDA-CHUVA] Total de workshops ativos: ${todosWorkshops.length}`);

    // Métricas
    const metrics = {
      total_workshops: todosWorkshops.length,
      elegiveis: 0,
      com_fu_agendado: 0,
      plano_nao_elegivel: 0,
      followups_criados: 0,
      falhas: 0
    };

    const workshops_processados = [];
    const erros = [];

    // Processar cada workshop
    for (const workshop of todosWorkshops) {
      try {
        console.log(`[GUARDA-CHUVA] Processando: ${workshop.name} (${workshop.id})`);

        // Critério 1: Plano elegível
        if (!planos_elegiveis.includes(workshop.planoAtual)) {
          console.log(`[GUARDA-CHUVA] ❌ ${workshop.name}: Plano ${workshop.planoAtual} não elegível`);
          metrics.plano_nao_elegivel++;
          continue;
        }

        // Critério 2: Verificar se tem FU AGENDADO para os PRÓXIMOS 7 DIAS
        const hoje = new Date();
        const proximos7Dias = new Date();
        proximos7Dias.setDate(hoje.getDate() + 7);
        
        const fuPendentes = await base44.entities.FollowUpReminder.filter({
          workshop_id: workshop.id,
          is_completed: false,
          reminder_date: { 
            $gte: hoje.toISOString().split('T')[0],
            $lte: proximos7Dias.toISOString().split('T')[0]
          }
        });

        if (fuPendentes && fuPendentes.length > 0) {
          console.log(`[GUARDA-CHUVA] ❌ ${workshop.name}: Já tem ${fuPendentes.length} FU(s) agendado(s) para os próximos 7 dias`);
          metrics.com_fu_recente++;
          continue;
        }

        // Workshop é ELEGÍVEL (único critério: sem FU nos próximos 7 dias)

        // Workshop é ELEGÍVEL!
        console.log(`[GUARDA-CHUVA] ✅ ${workshop.name}: ELEGÍVEL - Sem FU nos próximos 7 dias`);
        metrics.elegiveis++;

        // Identificar consultor responsável (usar admin que está executando)
        const consultor_id = user.id;
        const consultor_nome = user.full_name || 'Admin';

        // Criar FollowUpReminder (se não for dry_run)
        if (dry_run) {
          console.log(`[GUARDA-CHUVA] 📝 [DRY_RUN] ${workshop.name}: Criaria FU para ${consultor_nome}`);
          workshops_processados.push({
            workshop_id: workshop.id,
            workshop_name: workshop.name,
            action: 'would_create',
            consultor_id,
            consultor_nome
          });
        } else {
          // Criar de verdade
          const followUpData = {
            workshop_id: workshop.id,
            workshop_name: workshop.name,
            consultor_id,
            consultor_nome,
            reminder_date: new Date().toISOString().split('T')[0], // Hoje
            sequence_number: 1,
            days_since_meeting: 7,
            message: `Follow-up preventivo semanal - cliente sem contato agendado para os próximos 7 dias`,
            canal_origem: 'preventivo',
            origin_type: 'guarda_chuva',
            is_completed: false,
            consulting_firm_id: workshop.consulting_firm_id
          };

          const followUpCriado = await base44.entities.FollowUpReminder.create(followUpData);

          console.log(`[GUARDA-CHUVA] ✅ ${workshop.name}: FU criado com sucesso (ID: ${followUpCriado.id})`);
          
          metrics.followups_criados++;
          
          workshops_processados.push({
            workshop_id: workshop.id,
            workshop_name: workshop.name,
            action: 'created',
            followup_id: followUpCriado.id,
            consultor_id,
            consultor_nome
          });

          // Track analytics
          try {
            await base44.analytics.track({
              eventName: 'guarda_chuva_followup_created',
              properties: {
                workshop_id: workshop.id,
                consultor_id,
                origin_type: 'guarda_chuva',
                reason: 'sem_followup_proximos_7_dias'
              }
            });
          } catch (analyticsError) {
            console.error('[GUARDA-CHUVA] Erro ao trackar analytics:', analyticsError);
          }
        }

      } catch (workshopError) {
        console.error(`[GUARDA-CHUVA] ❌ Erro ao processar workshop:`, workshopError);
        metrics.falhas++;
        erros.push({
          workshop_id: workshop.id,
          workshop_name: workshop.name,
          error: workshopError.message
        });
      }
    }

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      dry_run,
      metrics,
      workshops_processados,
      erros
    };

    console.log('[GUARDA-CHUVA] Execução finalizada:', response);

    return Response.json(response);

  } catch (error) {
    console.error('[GUARDA-CHUVA] Erro crítico:', error);
    return Response.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
});