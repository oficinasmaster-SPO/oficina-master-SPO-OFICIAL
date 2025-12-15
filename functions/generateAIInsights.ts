import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { context = 'general', workshop_id } = await req.json();

    // Buscar dados necessários
    const [workshops, atendimentos, planos, diagnostics] = await Promise.all([
      base44.asServiceRole.entities.Workshop.list(),
      base44.asServiceRole.entities.ConsultoriaAtendimento.list('-data_agendada'),
      base44.asServiceRole.entities.MonthlyAccelerationPlan.list('-created_date'),
      base44.asServiceRole.entities.Diagnostic.list('-created_date')
    ]);

    const insights = [];

    // INSIGHT 1: Clientes com baixo engajamento
    const lowEngagementClients = workshops.filter(w => {
      const clientAtendimentos = atendimentos.filter(a => a.workshop_id === w.id);
      const lastAtendimento = clientAtendimentos[0];
      
      if (!lastAtendimento) return false;
      
      const daysSinceLastMeeting = Math.floor(
        (new Date() - new Date(lastAtendimento.data_agendada)) / (1000 * 60 * 60 * 24)
      );
      
      return daysSinceLastMeeting > 45 && w.planoAtual !== 'FREE';
    });

    if (lowEngagementClients.length > 0) {
      insights.push({
        type: 'alert',
        category: 'Engajamento',
        priority: 'high',
        title: `${lowEngagementClients.length} clientes com baixo engajamento`,
        description: `Há ${lowEngagementClients.length} cliente(s) sem atendimento há mais de 45 dias. Risco de churn.`,
        metrics: {
          'Clientes afetados': lowEngagementClients.length
        },
        action: {
          label: 'Ver Clientes',
          type: 'navigate',
          target: 'AdminClientes'
        },
        data: lowEngagementClients.map(w => w.id)
      });
    }

    // INSIGHT 2: Planos em risco de atraso
    const atRiskPlans = planos.filter(p => {
      if (p.status !== 'ativo') return false;
      const completion = p.completion_percentage || 0;
      const targetDate = new Date(p.reference_month + '-28');
      const today = new Date();
      const daysRemaining = Math.floor((targetDate - today) / (1000 * 60 * 60 * 24));
      
      // Se está com menos de 50% de conclusão e faltam menos de 15 dias
      return completion < 50 && daysRemaining < 15 && daysRemaining > 0;
    });

    if (atRiskPlans.length > 0) {
      insights.push({
        type: 'prediction',
        category: 'Risco',
        priority: 'high',
        title: `${atRiskPlans.length} planos em risco de atraso`,
        description: 'Planos com baixa taxa de conclusão próximos ao prazo final.',
        metrics: {
          'Planos em risco': atRiskPlans.length,
          'Média conclusão': Math.round(atRiskPlans.reduce((sum, p) => sum + (p.completion_percentage || 0), 0) / atRiskPlans.length) + '%'
        },
        action: {
          label: 'Ver Planos',
          type: 'navigate'
        }
      });
    }

    // INSIGHT 3: Próximos atendimentos sem confirmação
    const unconfirmedMeetings = atendimentos.filter(a => {
      if (a.status !== 'agendado') return false;
      const meetingDate = new Date(a.data_agendada);
      const today = new Date();
      const daysUntilMeeting = Math.floor((meetingDate - today) / (1000 * 60 * 60 * 24));
      
      return daysUntilMeeting <= 7 && daysUntilMeeting >= 0;
    });

    if (unconfirmedMeetings.length > 0) {
      insights.push({
        type: 'alert',
        category: 'Atendimento',
        priority: 'medium',
        title: `${unconfirmedMeetings.length} reuniões pendentes de confirmação`,
        description: 'Reuniões agendadas nos próximos 7 dias ainda não confirmadas.',
        metrics: {
          'Reuniões': unconfirmedMeetings.length
        },
        action: {
          label: 'Confirmar Agora'
        }
      });
    }

    // INSIGHT 4: Clientes sem diagnóstico recente
    const clientsNeedingDiagnostic = workshops.filter(w => {
      if (w.planoAtual === 'FREE') return false;
      
      const clientDiagnostics = diagnostics.filter(d => d.workshop_id === w.id);
      if (clientDiagnostics.length === 0) return true;
      
      const lastDiagnostic = clientDiagnostics[0];
      const monthsSinceDiagnostic = Math.floor(
        (new Date() - new Date(lastDiagnostic.created_date)) / (1000 * 60 * 60 * 24 * 30)
      );
      
      return monthsSinceDiagnostic > 6;
    });

    if (clientsNeedingDiagnostic.length > 0) {
      insights.push({
        type: 'recommendation',
        category: 'Diagnóstico',
        priority: 'medium',
        title: `${clientsNeedingDiagnostic.length} clientes precisam de novo diagnóstico`,
        description: 'Clientes sem diagnóstico nos últimos 6 meses para avaliar evolução.',
        metrics: {
          'Clientes': clientsNeedingDiagnostic.length
        },
        action: {
          label: 'Agendar Diagnósticos'
        }
      });
    }

    // INSIGHT 5: Taxa de sucesso de atendimentos
    const realizedMeetings = atendimentos.filter(a => a.status === 'realizado');
    const totalScheduled = atendimentos.filter(a => ['agendado', 'confirmado', 'realizado', 'atrasado'].includes(a.status));
    
    if (totalScheduled.length > 0) {
      const successRate = Math.round((realizedMeetings.length / totalScheduled.length) * 100);
      
      if (successRate >= 85) {
        insights.push({
          type: 'opportunity',
          category: 'Performance',
          priority: 'low',
          title: `Excelente taxa de conclusão: ${successRate}%`,
          description: 'Sua equipe está mantendo alta taxa de conclusão de atendimentos!',
          metrics: {
            'Taxa': successRate + '%',
            'Realizados': realizedMeetings.length
          }
        });
      } else if (successRate < 70) {
        insights.push({
          type: 'alert',
          category: 'Performance',
          priority: 'medium',
          title: `Taxa de conclusão abaixo do esperado: ${successRate}%`,
          description: 'Muitos atendimentos não estão sendo concluídos. Revisar processos.',
          metrics: {
            'Taxa': successRate + '%',
            'Realizados': realizedMeetings.length,
            'Total': totalScheduled.length
          }
        });
      }
    }

    // INSIGHT 6: Padrão de tipos de atendimento mais eficazes
    const meetingsByType = {};
    realizedMeetings.forEach(a => {
      meetingsByType[a.tipo_atendimento] = (meetingsByType[a.tipo_atendimento] || 0) + 1;
    });

    const mostEffectiveType = Object.entries(meetingsByType).sort((a, b) => b[1] - a[1])[0];
    
    if (mostEffectiveType && mostEffectiveType[1] > 5) {
      insights.push({
        type: 'recommendation',
        category: 'Estratégia',
        priority: 'low',
        title: 'Padrão de sucesso identificado',
        description: `${mostEffectiveType[0]} tem a maior taxa de conclusão (${mostEffectiveType[1]} realizados). Considere priorizar este formato.`,
        metrics: {
          'Tipo': mostEffectiveType[0],
          'Realizados': mostEffectiveType[1]
        }
      });
    }

    // Filtrar por contexto se especificado
    let filteredInsights = insights;
    
    if (workshop_id) {
      filteredInsights = insights.filter(insight => 
        !insight.data || insight.data.includes(workshop_id)
      );
    }

    // Ordenar por prioridade
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    filteredInsights.sort((a, b) => 
      priorityOrder[a.priority || 'low'] - priorityOrder[b.priority || 'low']
    );

    return Response.json({
      success: true,
      insights: filteredInsights,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating insights:', error);
    return Response.json({ 
      error: error.message,
      insights: []
    }, { status: 500 });
  }
});