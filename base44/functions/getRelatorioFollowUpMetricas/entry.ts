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

    if (!refDate || isNaN(new Date(refDate))) {
      return Response.json({ error: 'Data inválida' }, { status: 400 });
    }

    const isAdmin = user.role === 'admin';
    const filtroConsultor = consultor_id || (!isAdmin ? user.id : null);

    // Calcular intervalo de datas
    let startDate = refDate;
    let endDate = refDate;

    if (tipo === 'diario') {
      startDate = refDate;
      endDate = refDate;
    } else if (tipo === 'semanal') {
      const [y, m, d] = refDate.split('-').map(Number);
      const ref = new Date(y, m - 1, d);
      const dow = ref.getDay();
      const weekStart = new Date(ref);
      weekStart.setDate(ref.getDate() - dow);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      startDate = weekStart.toISOString().split('T')[0];
      endDate = weekEnd.toISOString().split('T')[0];
    } else if (periodo === 'mensal') {
      const [year, month] = refDate.split('-').map(Number);
      startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      endDate = new Date(year, month, 0).toISOString().split('T')[0];
    } else if (periodo === 'trimestral') {
      const [year, month] = refDate.split('-').map(Number);
      const trimestre = Math.floor((month - 1) / 3);
      const triStart = trimestre * 3 + 1;
      startDate = `${year}-${String(triStart).padStart(2, '0')}-01`;
      endDate = new Date(year, triStart + 2, 0).toISOString().split('T')[0];
    } else if (periodo === 'semestral') {
      const [year, month] = refDate.split('-').map(Number);
      const semestre = month <= 6 ? 0 : 1;
      const semiStart = semestre * 6 + 1;
      startDate = `${year}-${String(semiStart).padStart(2, '0')}-01`;
      endDate = new Date(year, semiStart + 5, 0).toISOString().split('T')[0];
    } else if (periodo === 'anual') {
      const [year] = refDate.split('-');
      startDate = `${year}-01-01`;
      endDate = `${year}-12-31`;
    }

    const entityClient = isAdmin ? base44.asServiceRole.entities : base44.entities;

    const reminderFilter = { reminder_date: { '$gte': startDate, '$lte': endDate } };
    if (filtroConsultor) reminderFilter.consultor_id = filtroConsultor;

    const [allReminders, allConcluidos] = await Promise.all([
      entityClient.FollowUpReminder.filter(reminderFilter, '-reminder_date', 2000),
      entityClient.FollowUpConcluido.filter(
        filtroConsultor ? { consultor_id: filtroConsultor } : {},
        '-completedAt',
        5000
      ).then(items => items.filter(c => {
        const cDate = (c.completedAt || c.dataContato || '').substring(0, 10);
        return cDate >= startDate && cDate <= endDate;
      }))
    ]);

    const realizados = allConcluidos.length;
    const pendentes = allReminders.filter(r => r.is_completed !== true).length;
    const total = realizados + pendentes;
    const taxaRealizacao = total > 0 ? Math.round((realizados / total) * 100) : 0;

    // Buscar workshop names em bulk (para realizados e pendentes)
    const workshopIdsConcluidos = allConcluidos.map(c => c.workshop_id).filter(Boolean);
    const workshopIdsReminders = allReminders.map(r => r.workshop_id).filter(Boolean);
    const workshopIds = [...new Set([...workshopIdsConcluidos, ...workshopIdsReminders])];
    const workshopsMap = {};

    if (workshopIds.length > 0) {
      try {
        const workshops = await Promise.all(
          workshopIds.map(id => base44.asServiceRole.entities.Workshop.filter({ id }).then(ws => ws[0]))
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
      completedAt: c.completedAt,
      dataContato: c.dataContato,
      reminder_date: null,
      workshop_id: c.workshop_id,
      workshop_name: workshopsMap[c.workshop_id] || c.workshop_name || 'Desconhecido',
      consultor_nome: c.consultor_nome,
      canal: c.canal,
      resultado: c.resultado,
      humor: c.humor || 'neutro',
      engajamento: c.engajamento || 'Médio',
      suporte: c.atendimento_tipo === 'cs' ? 'CS' : 'Consultor',
      tipo: 'Follow-up',
      observacoes: c.observacoes,
      duracao: c.duracao || c.tempo_atendimento_minutos
    }));

    // Mapear pendentes (FollowUpReminder não concluídos)
    const followupsPendentes = allReminders
      .filter(r => r.is_completed !== true)
      .map((r) => ({
        id: r.id,
        status: 'pendente',
        completedAt: null,
        dataContato: null,
        reminder_date: r.reminder_date,
        workshop_id: r.workshop_id,
        workshop_name: workshopsMap[r.workshop_id] || r.workshop_name || 'Desconhecido',
        consultor_nome: r.consultor_nome,
        canal: null,
        resultado: null,
        humor: null,
        engajamento: null,
        suporte: 'Consultor',
        tipo: 'Follow-up',
        observacoes: r.message || null,
        duracao: null,
        sequence_number: r.sequence_number,
        days_since_meeting: r.days_since_meeting
      }));

    // Combinar e ordenar por data desc
    const todosFollowups = [...followupsRealizados, ...followupsPendentes].sort((a, b) => {
      const dateA = a.completedAt || a.reminder_date || '';
      const dateB = b.completedAt || b.reminder_date || '';
      return dateB.localeCompare(dateA);
    });

    return Response.json({
      metricas: { realizados, pendentes, total, taxaRealizacao },
      followups: todosFollowups,
      tipo,
      periodo,
      data: refDate,
      startDate,
      endDate
    });
  } catch (error) {
    console.error('Erro ao calcular métricas:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});