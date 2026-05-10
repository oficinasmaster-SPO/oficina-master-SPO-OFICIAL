import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tipo = 'diario', data, periodo, consultor_id } = await req.json();
    const today = new Date().toISOString().split('T')[0];
    const refDate = data || today;

    if (!refDate || isNaN(new Date(refDate).getTime())) {
      return Response.json({ error: 'Data inválida' }, { status: 400 });
    }

    const isAdmin = user.role === 'admin';
    const filtroConsultor = consultor_id || (!isAdmin ? user.id : null);

    // -------------------------------------------------------
    // Calcular startDate / endDate
    // Prioridade: tipo ('diario' | 'semanal') > periodo (mensal, trimestral, semestral, anual)
    // -------------------------------------------------------
    let startDate = refDate;
    let endDate = refDate;

    const resolveRange = () => {
      if (tipo === 'diario') {
        // Apenas o dia de referência
        startDate = refDate;
        endDate = refDate;
      } else if (tipo === 'semanal') {
        // Semana (dom → sáb) que contém refDate
        const [y, m, d] = refDate.split('-').map(Number);
        const ref = new Date(y, m - 1, d);
        const dow = ref.getDay(); // 0=dom
        const weekStart = new Date(ref);
        weekStart.setDate(ref.getDate() - dow);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        startDate = weekStart.toISOString().split('T')[0];
        endDate = weekEnd.toISOString().split('T')[0];
      } else {
        // Para relatórios de período (mensal, trimestral, semestral, anual)
        // usa o campo `periodo`; se não vier, assume mensal
        const p = periodo || 'mensal';
        const [year, month] = refDate.split('-').map(Number);

        if (p === 'mensal') {
          startDate = `${year}-${String(month).padStart(2, '0')}-01`;
          endDate = new Date(year, month, 0).toISOString().split('T')[0];
        } else if (p === 'trimestral') {
          const tri = Math.floor((month - 1) / 3);
          const triStart = tri * 3 + 1;
          startDate = `${year}-${String(triStart).padStart(2, '0')}-01`;
          endDate = new Date(year, triStart + 2, 0).toISOString().split('T')[0];
        } else if (p === 'semestral') {
          const semiStart = month <= 6 ? 1 : 7;
          startDate = `${year}-${String(semiStart).padStart(2, '0')}-01`;
          endDate = new Date(year, semiStart + 5, 0).toISOString().split('T')[0];
        } else if (p === 'anual') {
          startDate = `${year}-01-01`;
          endDate = `${year}-12-31`;
        } else {
          // fallback: mensal
          startDate = `${year}-${String(month).padStart(2, '0')}-01`;
          endDate = new Date(year, month, 0).toISOString().split('T')[0];
        }
      }
    };

    resolveRange();

    const entityClient = isAdmin ? base44.asServiceRole.entities : base44.entities;

    // Bug #3 fix: filtrar FollowUpConcluido por data no banco, não em memória
    const concluidosFilter = {
      completedAt: { '$gte': `${startDate}T00:00:00.000Z`, '$lte': `${endDate}T23:59:59.999Z` }
    };
    // fallback: também checar dataContato se completedAt não existir
    const concluidosFilterAlt = {
      dataContato: { '$gte': startDate, '$lte': endDate }
    };
    if (filtroConsultor) {
      concluidosFilter.consultor_id = filtroConsultor;
      concluidosFilterAlt.consultor_id = filtroConsultor;
    }

    const reminderFilter = { reminder_date: { '$gte': startDate, '$lte': endDate } };
    if (filtroConsultor) reminderFilter.consultor_id = filtroConsultor;

    // Buscar dados em paralelo — FollowUpConcluido com dois filtros para cobrir ambos os campos de data
    const [allReminders, concluidosByCompletedAt, concluidosByDataContato] = await Promise.all([
      entityClient.FollowUpReminder.filter(reminderFilter, '-reminder_date', 2000),
      entityClient.FollowUpConcluido.filter(concluidosFilter, '-completedAt', 2000),
      entityClient.FollowUpConcluido.filter(concluidosFilterAlt, '-dataContato', 2000)
    ]);

    // Deduplicar os concluídos (union por id)
    const concluidosMap = new Map();
    [...concluidosByCompletedAt, ...concluidosByDataContato].forEach(c => {
      if (c.id) concluidosMap.set(c.id, c);
    });
    const allConcluidos = Array.from(concluidosMap.values());

    // Métricas
    // "today" para separar itens já vencidos dos ainda no prazo
    const todayStr = new Date().toISOString().split('T')[0];

    const realizados = allConcluidos.length;
    const allPendentesItems = allReminders.filter(r => r.is_completed !== true);

    // Pendentes atrasados = prazo já passou (reminder_date < hoje)
    const pendentesAtrasados = allPendentesItems.filter(r => (r.reminder_date || '') < todayStr);
    // Pendentes no prazo = prazo ainda não chegou (reminder_date >= hoje)
    const pendentesNoPrazo  = allPendentesItems.filter(r => (r.reminder_date || '') >= todayStr);

    // "pendentes" para KPI = apenas os atrasados (é o que indica problema real)
    const pendentesItems = pendentesAtrasados;
    const pendentes = pendentesAtrasados.length;
    const total = realizados + allPendentesItems.length; // total real do período
    const taxaRealizacao = total > 0 ? Math.round((realizados / total) * 100) : 0;

    // Taxa de atraso correta: só conta vencidos sobre total do período
    const taxaAtraso = total > 0 ? Math.round((pendentes / total) * 100) : 0;

    // Resolver nomes de workshops em bulk (uma query por ID único)
    const workshopIds = [...new Set([
      ...allConcluidos.map(c => c.workshop_id),
      ...allReminders.map(r => r.workshop_id)
    ].filter(Boolean))];

    const workshopsMap = {};
    if (workshopIds.length > 0) {
      try {
        // Usar entityClient (respeita escopo do usuário)
        const workshops = await Promise.all(
          workshopIds.map(id =>
            entityClient.Workshop.filter({ id }, null, 1)
              .then(ws => ws[0] || null)
              .catch(() => null)
          )
        );
        workshops.forEach((ws, idx) => {
          if (ws) workshopsMap[workshopIds[idx]] = ws.name;
        });
      } catch (err) {
        console.warn('Erro ao buscar workshops:', err);
      }
    }

    // Mapear realizados
    const followupsRealizados = allConcluidos.map((c) => ({
      id: c.id,
      status: 'realizado',
      completedAt: c.completedAt || null,
      dataContato: c.dataContato || null,
      reminder_date: null,
      workshop_id: c.workshop_id,
      workshop_name: workshopsMap[c.workshop_id] || c.workshop_name || 'Desconhecido',
      consultor_nome: c.consultor_nome || null,
      canal: c.canal || null,
      resultado: c.resultado || null,
      humor: c.humor || null,
      engajamento: c.engajamento || null,
      suporte: 'Consultor',
      tipo: 'Follow-up',
      observacoes: c.observacoes || null,
      duracao: c.duracao || null,
      sequence_number: null,
      days_since_meeting: null
    }));

    // Mapear pendentes — todos (atrasados + no prazo) para exibição na tabela
    const followupsPendentes = allPendentesItems.map((r) => ({
      atrasado: (r.reminder_date || '') < todayStr,
      id: r.id,
      status: 'pendente',
      completedAt: null,
      dataContato: null,
      reminder_date: r.reminder_date,
      workshop_id: r.workshop_id,
      workshop_name: workshopsMap[r.workshop_id] || r.workshop_name || 'Desconhecido',
      consultor_nome: r.consultor_nome || null,
      canal: null,
      resultado: null,
      humor: null,
      engajamento: null,
      suporte: 'Consultor',
      tipo: 'Follow-up',
      observacoes: r.message || null,
      duracao: null,
      sequence_number: r.sequence_number || null,
      days_since_meeting: r.days_since_meeting || null
    }));

    // Combinar e ordenar por data desc (realizados primeiro dentro do mesmo dia)
    const todosFollowups = [...followupsRealizados, ...followupsPendentes].sort((a, b) => {
      const dateA = a.completedAt || a.dataContato || a.reminder_date || '';
      const dateB = b.completedAt || b.dataContato || b.reminder_date || '';
      if (dateB !== dateA) return dateB.localeCompare(dateA);
      // mesma data: realizados antes de pendentes
      if (a.status === 'realizado' && b.status !== 'realizado') return -1;
      if (b.status === 'realizado' && a.status !== 'realizado') return 1;
      return 0;
    });

    return Response.json({
      metricas: {
        realizados,
        pendentes,           // apenas atrasados (vencidos)
        pendentesNoPrazo: pendentesNoPrazo.length, // no prazo (ainda não venceu)
        total,
        taxaRealizacao,
        taxaAtraso           // % real de atraso (vencidos / total)
      },
      followups: todosFollowups,
      tipo,
      periodo: periodo || null,
      data: refDate,
      startDate,
      endDate
    });
  } catch (error) {
    console.error('Erro ao calcular métricas:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});