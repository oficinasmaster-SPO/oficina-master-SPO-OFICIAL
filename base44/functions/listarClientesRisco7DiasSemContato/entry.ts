import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hoje = new Date();
    const seteUmasDiasAtras = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    console.log('[listarClientesRisco7DiasSemContato] Iniciando busca');
    console.log('[listarClientesRisco7DiasSemContato] Data base (7 dias atrás):', seteUmasDiasAtras.toISOString());

    // Buscar contratos ativos elegíveis
    const contratosAtivos = await base44.asServiceRole.entities.Contract.filter({
      status: { '$in': ['ativo', 'efetivado'] },
      plan_type: { '$in': ['START', 'BRONZE', 'PRATA', 'GOLD', 'IOM', 'MILLIONS'] }
    }, '-created_date', 500);

    console.log('[listarClientesRisco7DiasSemContato] Contratos ativos encontrados:', contratosAtivos.length);

    const clientesEmRisco = [];

    for (const contrato of contratosAtivos) {
      try {
        const workshopId = contrato.workshop_id;

        // Buscar última reunião (MeetingMinutes)
        const atas = await base44.asServiceRole.entities.MeetingMinutes.filter({
          workshop_id: workshopId
        }, '-meeting_date', 1);

        const dataUltimaReuniaoDate = atas.length > 0 ? new Date(atas[0].meeting_date) : null;

        // Buscar último follow-up completado
        const followups = await base44.asServiceRole.entities.FollowUpConcluido.filter({
          workshop_id: workshopId
        }, '-completedAt', 1);

        const dataUltimoFollowupDate = followups.length > 0 ? new Date(followups[0].completedAt) : null;

        // Buscar última sprint
        const sprints = await base44.asServiceRole.entities.ConsultoriaSprint.filter({
          workshop_id: workshopId
        }, '-created_date', 1);

        const dataUltimaSprintDate = sprints.length > 0 ? new Date(sprints[0].created_date) : null;

        // Buscar último próximo passo (ConsultoriaProximoPasso)
        const proximosPassos = await base44.asServiceRole.entities.ConsultoriaProximoPasso.filter({
          workshop_id: workshopId
        }, '-created_date', 1);

        const dataUltimoProximoPassoDate = proximosPassos.length > 0 ? new Date(proximosPassos[0].created_date) : null;

        // Buscar último atendimento (ConsultoriaAtendimento)
        const atendimentos = await base44.asServiceRole.entities.ConsultoriaAtendimento.filter({
          workshop_id: workshopId
        }, '-data_realizada', 1);

        const dataUltimoAtendimentoDate = atendimentos.length > 0 ? new Date(atendimentos[0].data_realizada) : null;

        // Pegar a data mais recente de QUALQUER atividade
        const datas = [
          dataUltimaReuniaoDate,
          dataUltimoFollowupDate,
          dataUltimaSprintDate,
          dataUltimoProximoPassoDate,
          dataUltimoAtendimentoDate,
          new Date(contrato.created_date) // Data de criação do contrato como fallback
        ].filter(Boolean);

        const dataUltimaAtividadeDate = datas.length > 0 ? new Date(Math.max(...datas.map(d => d.getTime()))) : null;

        // Verificar se está em risco (>7 dias)
        if (dataUltimaAtividadeDate && dataUltimaAtividadeDate < seteUmasDiasAtras) {
          const diasSemAtividade = Math.floor((hoje - dataUltimaAtividadeDate) / (1000 * 60 * 60 * 24));
          
          clientesEmRisco.push({
            nome_cliente: contrato.workshop_name,
            plano: contrato.plan_type,
            data_ultima_atividade: dataUltimaAtividadeDate.toISOString().split('T')[0],
            dias_sem_atividade: diasSemAtividade,
            ultima_reuniao: dataUltimaReuniaoDate ? dataUltimaReuniaoDate.toISOString().split('T')[0] : '—',
            ultimo_followup: dataUltimoFollowupDate ? dataUltimoFollowupDate.toISOString().split('T')[0] : '—',
            ultimo_atendimento: dataUltimoAtendimentoDate ? dataUltimoAtendimentoDate.toISOString().split('T')[0] : '—',
            ultima_sprint: dataUltimaSprintDate ? dataUltimaSprintDate.toISOString().split('T')[0] : '—',
            ultimo_prox_passo: dataUltimoProximoPassoDate ? dataUltimoProximoPassoDate.toISOString().split('T')[0] : '—',
            data_criacao_contrato: new Date(contrato.created_date).toISOString().split('T')[0]
          });
        }

      } catch (error) {
        console.warn(`[listarClientesRisco7DiasSemContato] Erro ao processar contrato ${contrato.id}:`, error.message);
      }
    }

    // Ordenar por dias sem atividade (descendente)
    clientesEmRisco.sort((a, b) => b.dias_sem_atividade - a.dias_sem_atividade);

    console.log('[listarClientesRisco7DiasSemContato] Total de clientes em risco (7+ dias):', clientesEmRisco.length);

    return Response.json({
      clientes: clientesEmRisco,
      estatisticas: {
        total_contratos_ativos: contratosAtivos.length,
        total_clientes_em_risco: clientesEmRisco.length,
        percentual_risco: contratosAtivos.length > 0 ? ((clientesEmRisco.length / contratosAtivos.length) * 100).toFixed(2) : 0,
        data_filtro: seteUmasDiasAtras.toISOString().split('T')[0],
        criterio: 'Mais de 7 dias sem nenhuma atividade (reunião, atendimento, follow-up, sprint ou próximo passo)'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[listarClientesRisco7DiasSemContato] Erro:', error);
    return Response.json({ 
      error: error.message,
      clientes: [],
      estatisticas: {
        total_contratos_ativos: 0,
        total_clientes_em_risco: 0,
        percentual_risco: 0
      }
    }, { status: 500 });
  }
});