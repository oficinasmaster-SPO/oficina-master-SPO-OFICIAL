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

    // Validar data
    if (!data || isNaN(new Date(data))) {
      return Response.json({ error: 'Data inválida' }, { status: 400 });
    }

    // Calcular datas baseado no período (corrigindo parsing com UTC)
    if (periodo) {
      const [year, month, day] = (data || today).split('-').map(Number);
      const refMonth = month - 1; // JS months são 0-indexed

      if (periodo === 'mensal') {
        startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        endDate = new Date(year, refMonth + 1, 0).toISOString().split('T')[0];
      } else if (periodo === 'trimestral') {
        const trimestre = Math.floor(refMonth / 3);
        const triStart = trimestre * 3;
        startDate = `${year}-${String(triStart + 1).padStart(2, '0')}-01`;
        endDate = new Date(year, triStart + 3, 0).toISOString().split('T')[0];
      } else if (periodo === 'semestral') {
        const semestre = refMonth < 6 ? 0 : 1;
        const semiStart = semestre * 6;
        startDate = `${year}-${String(semiStart + 1).padStart(2, '0')}-01`;
        endDate = new Date(year, semiStart + 6, 0).toISOString().split('T')[0];
      } else if (periodo === 'anual') {
        startDate = `${year}-01-01`;
        endDate = `${year}-12-31`;
      }
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

    // Calcular métricas (validar booleano is_completed corretamente)
     const realizados = concludidos.length;
     const pendentes = reminders.filter(r => r.is_completed !== true).length;
     const total = realizados + pendentes;
     const taxaRealizacao = total > 0 ? Math.round((realizados / total) * 100) : 0;

     // Validação de sanidade
     if (realizados < 0 || pendentes < 0) {
       return Response.json({ error: 'Cálculo de métricas inválido' }, { status: 500 });
     }

     // Buscar workshop_names em bulk para performance
     const workshopIds = [...new Set(concludidos.map(c => c.workshop_id).filter(Boolean))];
     const workshopsMap = {};

     if (workshopIds.length > 0) {
       try {
         const workshops = await Promise.all(
           workshopIds.map(id => base44.entities.Workshop.filter({ id }).then(ws => ws[0]))
         );
         workshops.forEach((ws, idx) => {
           if (ws) workshopsMap[workshopIds[idx]] = ws.name;
         });
       } catch (err) {
         console.warn('Erro ao buscar workshops:', err);
       }
     }

     // Mapear follow-ups com nomes de cliente
     const followupsProntos = concludidos.map((c) => ({
       id: c.id,
       completedAt: c.completedAt,
       dataContato: c.dataContato,
       workshop_name: workshopsMap[c.workshop_id] || c.workshop_name || 'Desconhecido',
       consultor_nome: c.consultor_nome,
       canal: c.canal,
       resultado: c.resultado,
       humor: c.humor || 'neutro',
       engajamento: c.engajamento || 'Médio',
       suporte: c.atendimento_tipo === 'cs' ? 'CS' : 'Consultor',
       tipo: c.tipo === 'followup' ? 'Follow-up' : (c.tipo || 'Follow-up'),
       observacoes: c.observacoes,
       duracao: c.duracao || c.tempo_atendimento_minutos
     }));

     // Retornar dados calculados + lista detalhada
     return Response.json({
       metricas: {
         realizados,
         pendentes,
         total,
         taxaRealizacao
       },
       followups: followupsProntos,
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