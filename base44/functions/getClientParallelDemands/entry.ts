import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workshop_id, follow_up_type } = await req.json();

    if (!workshop_id) {
      return Response.json({ error: 'workshop_id required' }, { status: 400 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // [1] Busca Sprints abertas
    const sprints = await base44.entities.ConsultoriaSprint.filter({
      workshop_id,
      status: { '$ne': 'completed' }
    }, '-created_date', 50);

    // [2] Busca Pedidos Internos
    const pedidosInternos = await base44.entities.PedidoInterno.filter({
      cliente_id: workshop_id,
      status: { '$ne': 'concluido' }
    }, '-created_date', 50);

    // [3] Busca Backlog Tarefas
    const backlogTarefas = await base44.entities.TarefaBacklog.filter({
      cliente_id: workshop_id,
      status: { '$in': ['aberta', 'bloqueada'] }
    }, '-created_date', 50);

    // [4] Busca Cronograma Itens
    const cronogramaItems = await base44.entities.CronogramaImplementacao.filter({
      workshop_id,
      status: { '$ne': 'concluido' }
    }, '-created_date', 50);

    // Helper para calcular dias até/desde data
    const calculateDaysDiff = (dateStr) => {
      if (!dateStr) return null;
      const targetDate = new Date(dateStr);
      targetDate.setHours(0, 0, 0, 0);
      const diffTime = targetDate - today;
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    // [5] Enriquecer dados com severity
    const enrichedSprints = sprints.map(s => {
      const daysDiff = s.end_date ? calculateDaysDiff(s.end_date) : null;
      return {
        id: s.id,
        title: s.title,
        status: s.status,
        due_date: s.end_date,
        phase_completion: s.progress_percentage || 0,
        dias_para_vencer: daysDiff,
        severity: calculateSprintSeverity(s.end_date, s.progress_percentage)
      };
    });

    const enrichedPedidos = pedidosInternos.map(p => ({
      id: p.id,
      titulo: p.titulo,
      status: p.status,
      prazo: p.prazo,
      vencido: calculateDaysDiff(p.prazo) < 0,
      dias_para_vencer: calculateDaysDiff(p.prazo),
      severity: calculatePedidoSeverity(p.prazo)
    }));

    const enrichedBacklog = backlogTarefas.map(t => ({
      id: t.id,
      titulo: t.titulo,
      status: t.status,
      prazo_final: t.prazo,
      dias_vencido: Math.max(0, calculateDaysDiff(t.prazo) * -1),
      severity: calculateTarefaSeverity(t.prazo)
    }));

    const enrichedCronograma = cronogramaItems.map(c => {
      const daysDiff = calculateDaysDiff(c.data_termino_previsto) || 0;
      return {
        id: c.id,
        item_nome: c.item_nome,
        status: c.status,
        prazo_previsto: c.data_termino_previsto,
        dias_atraso: daysDiff < 0 ? Math.abs(daysDiff) : 0,
        severity: calculateCronogramaSeverity(c.data_termino_previsto)
      };
    });

    // Validar dados antes de retornar
    const allCritical = [
      ...enrichedSprints.filter(s => s.severity === 'RED'),
      ...enrichedPedidos.filter(p => p.severity === 'RED'),
      ...enrichedBacklog.filter(t => t.severity === 'RED'),
      ...enrichedCronograma.filter(c => c.severity === 'RED')
    ];

    return Response.json({
      sprints: enrichedSprints || [],
      pedidosInternos: enrichedPedidos || [],
      backlogTarefas: enrichedBacklog || [],
      cronogramaItems: enrichedCronograma || [],
      summary: {
        totalDemands: enrichedSprints.length + enrichedPedidos.length + enrichedBacklog.length + enrichedCronograma.length,
        criticalCount: allCritical.length
      }
    });
  } catch (error) {
    console.error('Error in getClientParallelDemands:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// Helpers para calcular severity
function calculateSprintSeverity(endDate, progressPercentage) {
  if (!endDate) return 'GRAY';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(endDate);
  targetDate.setHours(0, 0, 0, 0);
  const daysDiff = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));

  if (daysDiff < 0) return 'RED'; // Vencida
  if (daysDiff === 0) return 'RED'; // Vence hoje
  if (daysDiff <= 2) return 'YELLOW';
  return 'GRAY';
}

function calculatePedidoSeverity(prazo) {
  if (!prazo) return 'GRAY';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const prazoDt = new Date(prazo);
  prazoDt.setHours(0, 0, 0, 0);
  const daysDiff = Math.ceil((prazoDt - today) / (1000 * 60 * 60 * 24));

  if (daysDiff < 0) return 'RED'; // Vencido
  if (daysDiff === 0) return 'RED'; // Vence hoje
  if (daysDiff <= 2) return 'YELLOW';
  return 'GRAY';
}

function calculateTarefaSeverity(prazo) {
  if (!prazo) return 'GRAY';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const prazoDt = new Date(prazo);
  prazoDt.setHours(0, 0, 0, 0);
  const daysDiff = Math.ceil((prazoDt - today) / (1000 * 60 * 60 * 24));

  if (daysDiff < 0) return 'RED'; // Vencido
  if (daysDiff === 0) return 'RED';
  if (daysDiff <= 2) return 'YELLOW';
  return 'GRAY';
}

function calculateCronogramaSeverity(prazo) {
  if (!prazo) return 'GRAY';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const prazoDt = new Date(prazo);
  prazoDt.setHours(0, 0, 0, 0);
  const daysDiff = Math.ceil((prazoDt - today) / (1000 * 60 * 60 * 24));

  if (daysDiff < 0 && Math.abs(daysDiff) > 3) return 'RED'; // Mais de 3 dias atrasado
  if (daysDiff < 0) return 'RED';
  if (daysDiff === 0) return 'RED';
  if (daysDiff <= 2) return 'YELLOW';
  return 'GRAY';
}