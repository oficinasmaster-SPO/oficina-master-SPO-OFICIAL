import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hoje = new Date();
    const tresUmasDiasAtras = new Date(hoje.getTime() - 3 * 24 * 60 * 60 * 1000);
    
    console.log('[gerarRelatorioFollowUpsAtrasadosUrgentes] Iniciando busca');

    // Buscar apenas follow-ups atrasados (3+ dias) OU urgentes
    const followupsAtrasados = await base44.asServiceRole.entities.FollowUpReminder.filter({
      is_completed: false,
      reminder_date: { '$lte': tresUmasDiasAtras.toISOString().split('T')[0] }
    }, '-reminder_date', 500);

    console.log('[gerarRelatorioFollowUpsAtrasadosUrgentes] Follow-ups atrasados encontrados:', followupsAtrasados.length);

    // Buscar workshops e usuários em batch
    const workshopIds = [...new Set(followupsAtrasados.map(f => f.workshop_id))];
    const consultorIds = [...new Set(followupsAtrasados.map(f => f.consultor_id).filter(Boolean))];

    const workshops = workshopIds.length > 0 
      ? await base44.asServiceRole.entities.Workshop.filter(
          { id: { '$in': workshopIds } },
          '-created_date',
          500
        )
      : [];

    const consultores = consultorIds.length > 0
      ? await base44.asServiceRole.entities.User.filter(
          { id: { '$in': consultorIds } },
          '-created_date',
          500
        )
      : [];

    // Mapear para rápido acesso
    const workshopMap = Object.fromEntries(workshops.map(w => [w.id, w]));
    const consultorMap = Object.fromEntries(consultores.map(c => [c.id, c]));

    const relatorio = [];

    for (const followup of followupsAtrasados) {
      try {
        const reminderDate = new Date(followup.reminder_date);
        const diasAtraso = Math.floor((hoje - reminderDate) / (1000 * 60 * 60 * 24));

        const workshopData = workshopMap[followup.workshop_id];
        if (!workshopData) continue;

        const consultorData = consultorMap[followup.consultor_id];
        const consultorNome = consultorData?.full_name || followup.consultor_nome || '—';

        relatorio.push({
          cliente: workshopData.name || 'N/A',
          empresa: workshopData.company_id ? workshopData.name : 'N/A',
          consultor: consultorNome,
          ultimo_followup: '—',
          proximo_followup: new Date(followup.reminder_date).toLocaleDateString('pt-BR'),
          dias_atraso: diasAtraso,
          prioridade: followup.sequence_number <= 2 ? 'urgente' : 'alta',
          status_crm: 'pendente',
          mensagem: followup.message || '—',
          sequence: followup.sequence_number || 0
        });

      } catch (error) {
        console.warn(`[gerarRelatorioFollowUpsAtrasadosUrgentes] Erro ao processar follow-up:`, error.message);
      }
    }

    // Ordenar por dias de atraso (descendente)
    relatorio.sort((a, b) => b.dias_atraso - a.dias_atraso);

    console.log('[gerarRelatorioFollowUpsAtrasadosUrgentes] Total de follow-ups atrasados/urgentes:', relatorio.length);

    return Response.json({
      followups: relatorio,
      estatisticas: {
        total_atrasados_urgentes: relatorio.length,
        total_workshops: workshopIds.length,
        total_consultores: consultorIds.length,
        data_relatorio: hoje.toISOString().split('T')[0],
        criterios: ['Follow-ups vencidos há 3+ dias', 'Status não completado']
      }
    });

  } catch (error) {
    console.error('[gerarRelatorioFollowUpsAtrasadosUrgentes] Erro:', error);
    return Response.json({ 
      error: error.message,
      followups: [],
      estatisticas: { total_atrasados_urgentes: 0 }
    }, { status: 500 });
  }
});