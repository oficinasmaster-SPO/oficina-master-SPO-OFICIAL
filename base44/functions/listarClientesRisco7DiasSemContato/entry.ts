import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hoje = new Date();
    const sete_dias_atras = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);

    console.log('[listarClientesRisco7DiasSemContato] Iniciando busca');

    // 1. Buscar todos os contratos ATIVOS com planos que contemplam atendimentos
    const contratosAtivos = await base44.asServiceRole.entities.Contract.filter({
      status: { '$in': ['ativo', 'efetivado'] },
      plan_type: { '$in': ['START', 'BRONZE', 'PRATA', 'GOLD', 'IOM', 'MILLIONS'] }
    }, '-created_date', 1000);

    console.log('[listarClientesRisco7DiasSemContato] Contratos ativos encontrados:', contratosAtivos.length);

    const workshopIds = contratosAtivos.map(c => c.workshop_id);
    const clientesEmRiscoMap = {};

    // 2. Para cada workshop, buscar follow-ups e atendimentos antigos
    for (const workshop_id of workshopIds) {
      try {
        // Follow-ups não completados com mais de 7 dias
        const followupsSemContato = await base44.asServiceRole.entities.FollowUpReminder.filter({
          workshop_id,
          is_completed: false,
          reminder_date: { '$lte': sete_dias_atras.toISOString().split('T')[0] }
        }, '-reminder_date', 100);

        // Atendimentos realizados há mais de 7 dias
        const atendimentosAntigos = await base44.asServiceRole.entities.ConsultoriaAtendimento.filter({
          workshop_id,
          status: { '$in': ['realizado', 'concluido'] },
          data_realizada: { '$lte': sete_dias_atras.toISOString() }
        }, '-data_realizada', 100);

        // Se tem follow-ups em atraso ou atendimentos antigos, marcar cliente em risco
        if (followupsSemContato.length > 0 || atendimentosAntigos.length > 0) {
          const workshopInfo = contratosAtivos.find(c => c.workshop_id === workshop_id);
          
          if (!clientesEmRiscoMap[workshop_id]) {
            clientesEmRiscoMap[workshop_id] = {
              id: workshop_id,
              name: workshopInfo?.workshop_name || 'Workshop',
              plano: workshopInfo?.plan_type || 'N/A',
              followup_atrasados: followupsSemContato.length,
              dias_sem_contato: Math.floor((hoje - sete_dias_atras) / (1000 * 60 * 60 * 24)),
              ultimo_atendimento: atendimentosAntigos.length > 0 ? atendimentosAntigos[0].data_realizada : 'Sem registros',
              detalhes_followup: followupsSemContato.map(f => ({
                message: f.message,
                reminder_date: f.reminder_date,
                dias_atrasado: Math.floor((hoje - new Date(f.reminder_date)) / (1000 * 60 * 60 * 24))
              }))
            };
          }
        }
      } catch (error) {
        console.warn(`[listarClientesRisco7DiasSemContato] Erro ao processar workshop ${workshop_id}:`, error.message);
      }
    }

    const clientesLista = Object.values(clientesEmRiscoMap).sort((a, b) => 
      b.dias_sem_contato - a.dias_sem_contato
    );

    console.log('[listarClientesRisco7DiasSemContato] Total de clientes em risco (7+ dias):', clientesLista.length);

    return Response.json({
      clientes: clientesLista,
      estatisticas: {
        total_contratos_ativos: contratosAtivos.length,
        total_clientes_em_risco: clientesLista.length,
        percentual_risco: contratosAtivos.length > 0 ? Math.round((clientesLista.length / contratosAtivos.length) * 100) : 0,
        data_filtro: sete_dias_atras.toISOString().split('T')[0],
        criterio: 'Mais de 7 dias sem contato / follow-up'
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