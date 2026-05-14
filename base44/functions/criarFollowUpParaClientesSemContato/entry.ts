import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Follow-up Guarda-Chuva Semanal
 * 
 * Executa toda segunda-feira 09:00
 * Varre TODOS workshops ativos
 * Cria FollowUpReminder se:
 * - Plano elegível (BRONZE, PRATA, GOLD, IOM, MILLIONS)
 * - Sem FU pendente em 7 dias
 * - Sem atendimento EM QUALQUER período (30 dias)
 * - Sem sprint ativa
 * 
 * @param {boolean} dry_run - Se true, só simula sem criar
 * @param {number} lookback_days - Dias para verificar atendimentos (default: 30)
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
      com_fu_recente: 0,
      com_atendimento_recente: 0,
      com_sprint_ativa: 0,
      plano_nao_elegivel: 0,
      followups_criados: 0,
      falhas: 0
    };

    const workshops_processados = [];
    const erros = [];

    // Data de corte para lookback
    const dataCorte = new Date();
    dataCorte.setDate(dataCorte.getDate() - lookback_days);

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

        // Critério 2: Verificar se tem FU pendente nos últimos 7 dias
        const dataCorteFU = new Date();
        dataCorteFU.setDate(dataCorteFU.getDate() - 7);
        
        const fuPendentes = await base44.entities.FollowUpReminder.filter({
          workshop_id: workshop.id,
          is_completed: false,
          created_date: { $gte: dataCorteFU.toISOString() }
        });

        if (fuPendentes && fuPendentes.length > 0) {
          console.log(`[GUARDA-CHUVA] ❌ ${workshop.name}: Já tem ${fuPendentes.length} FU(s) pendente(s)`);
          metrics.com_fu_recente++;
          continue;
        }

        // Critério 3: Verificar se teve atendimento nos últimos 30 dias
        const atendamentosRecentes = await base44.entities.ConsultoriaAtendimento.filter({
          workshop_id: workshop.id,
          status: ['realizado', 'concluido'],
          data_realizada: { $gte: dataCorte.toISOString() }
        });

        if (atendamentosRecentes && atendamentosRecentes.length > 0) {
          console.log(`[GUARDA-CHUVA] ❌ ${workshop.name}: Tem ${atendamentosRecentes.length} atendimento(s) recente(s)`);
          metrics.com_atendimento_recente++;
          continue;
        }

        // Critério 4: Verificar se tem sprint ativa
        const sprintsAtivas = await base44.entities.ConsultoriaSprint.filter({
          workshop_id: workshop.id,
          status: ['in_progress', 'pending']
        });

        if (sprintsAtivas && sprintsAtivas.length > 0) {
          console.log(`[GUARDA-CHUVA] ❌ ${workshop.name}: Tem ${sprintsAtivas.length} sprint(s) ativa(s)`);
          metrics.com_sprint_ativa++;
          continue;
        }

        // Critério 5: Verificar se tem contrato ativo
        const contratosAtivos = await base44.entities.Contract.filter({
          workshop_id: workshop.id,
          status: ['ativo', 'assinado']
        });

        if (!contratosAtivos || contratosAtivos.length === 0) {
          console.log(`[GUARDA-CHUVA] ❌ ${workshop.name}: Sem contrato ativo`);
          continue;
        }

        // Workshop é ELEGÍVEL!
        console.log(`[GUARDA-CHUVA] ✅ ${workshop.name}: ELEGÍVEL`);
        metrics.elegiveis++;

        // Identificar consultor responsável
        let consultor_id = null;
        let consultor_nome = null;

        // Tentar pegar do último contrato
        if (contratosAtivos.length > 0 && contratosAtivos[0].consultor_id) {
          consultor_id = contratosAtivos[0].consultor_id;
          consultor_nome = contratosAtivos[0].consultor_nome;
        }

        // Fallback: pegar último atendimento
        if (!consultor_id) {
          const ultimosAtendimentos = await base44.entities.ConsultoriaAtendimento.filter(
            { workshop_id: workshop.id },
            '-data_realizada',
            1
          );
          if (ultimosAtendimentos && ultimosAtendimentos.length > 0) {
            consultor_id = ultimosAtendimentos[0].consultor_id;
            consultor_nome = ultimosAtendimentos[0].consultor_nome;
          }
        }

        // Fallback final: usar admin que está executando
        if (!consultor_id) {
          console.log(`[GUARDA-CHUVA] ⚠️ ${workshop.name}: Sem consultor definido, usando admin`);
          consultor_id = user.id;
          consultor_nome = user.full_name || 'Admin';
        }

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
            days_since_meeting: lookback_days,
            message: `Cliente ativo sem contato há ${lookback_days} dias - follow-up preventivo`,
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
                lookback_days
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