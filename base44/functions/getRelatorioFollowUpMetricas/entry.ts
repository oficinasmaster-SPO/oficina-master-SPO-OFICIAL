import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tipo = 'diario', data, periodo } = await req.json();
    const today = new Date().toISOString().split('T')[0];
    let startDate = null;
    let endDate = null;

    // Calcular datas baseado no período
    if (periodo) {
      const refDate = new Date(data || today);
      const year = refDate.getFullYear();
      const month = refDate.getMonth();

      if (periodo === 'mensal') {
        startDate = new Date(year, month, 1);
        endDate = new Date(year, month + 1, 0);
      } else if (periodo === 'trimestral') {
        const trimestre = Math.floor(month / 3);
        startDate = new Date(year, trimestre * 3, 1);
        endDate = new Date(year, trimestre * 3 + 3, 0);
      } else if (periodo === 'semestral') {
        const semestre = month < 6 ? 0 : 1;
        startDate = new Date(year, semestre * 6, 1);
        endDate = new Date(year, semestre * 6 + 6, 0);
      } else if (periodo === 'anual') {
        startDate = new Date(year, 0, 1);
        endDate = new Date(year, 11, 31);
      }

      startDate = startDate.toISOString().split('T')[0];
      endDate = endDate.toISOString().split('T')[0];
    }

    let reminders = [];
    let concludidos = [];

    if (tipo === 'diario') {
      reminders = await base44.entities.FollowUpReminder.filter(
        { consultor_id: user.id, reminder_date: data || today },
        '-reminder_date'
      );
      concludidos = await base44.entities.FollowUpConcluido.filter(
        { consultor_id: user.id },
        '-completedAt'
      ).then(items => items.filter(c => c.completedAt?.startsWith(data || today)));
    } else if (tipo === 'semanal') {
      const weekStart = new Date(data || today);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      const startStr = weekStart.toISOString().split('T')[0];
      const endStr = weekEnd.toISOString().split('T')[0];

      reminders = await base44.entities.FollowUpReminder.filter(
        { consultor_id: user.id },
        '-reminder_date'
      ).then(items => items.filter(r => r.reminder_date >= startStr && r.reminder_date <= endStr));
      
      concludidos = await base44.entities.FollowUpConcluido.filter(
        { consultor_id: user.id },
        '-completedAt'
      ).then(items => items.filter(c => {
        const cDate = c.completedAt?.substring(0, 10) || '';
        return cDate >= startStr && cDate <= endStr;
      }));
    } else if (periodo) {
      reminders = await base44.entities.FollowUpReminder.filter(
        { consultor_id: user.id },
        '-reminder_date'
      ).then(items => items.filter(r => r.reminder_date >= startDate && r.reminder_date <= endDate));
      
      concludidos = await base44.entities.FollowUpConcluido.filter(
        { consultor_id: user.id },
        '-completedAt'
      ).then(items => items.filter(c => {
        const cDate = c.completedAt?.substring(0, 10) || '';
        return cDate >= startDate && cDate <= endDate;
      }));
    } else if (tipo === 'riscos') {
      reminders = await base44.entities.FollowUpReminder.filter(
        { consultor_id: user.id, is_completed: false },
        'reminder_date'
      ).then(items => items.filter(r => r.reminder_date < today));
      
      concludidos = await base44.entities.FollowUpConcluido.filter(
        { consultor_id: user.id },
        '-completedAt'
      ).then(items => items.slice(0, 50));
    }

    // Calcular métricas
    const realizados = concludidos.length;
    const pendentes = reminders.filter(r => !r.is_completed).length;
    const total = realizados + pendentes;
    const taxaRealizacao = total > 0 ? Math.round((realizados / total) * 100) : 0;

    // Retornar dados calculados
    return Response.json({
      realizados,
      pendentes,
      total,
      taxaRealizacao,
      tipo,
      periodo,
      data,
      startDate,
      endDate
    });
  } catch (error) {
    console.error('Erro ao calcular métricas:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});