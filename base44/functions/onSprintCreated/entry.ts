import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { data } = await req.json();

    if (!data?.id) {
      return Response.json({ error: 'Missing sprint data' }, { status: 400 });
    }

    // Pequeno delay para garantir que a entidade está persistida antes de atualizar
    await new Promise(resolve => setTimeout(resolve, 500));

    // Re-fetch para pegar o estado mais recente da sprint
    const sprint = await base44.asServiceRole.entities.ConsultoriaSprint.get(data.id);
    if (!sprint) {
      return Response.json({ error: 'Sprint não encontrada' }, { status: 404 });
    }

    // Auto-transição pending → in_progress (comportamento original mantido)
    if (sprint.status === 'pending') {
      await base44.asServiceRole.entities.ConsultoriaSprint.update(sprint.id, {
        status: 'in_progress',
        last_activity_date: new Date().toISOString(),
      });
    }

    // Buscar nome do workshop para cache no FollowUpReminder
    let workshopName = '';
    if (sprint.workshop_id) {
      try {
        const workshop = await base44.asServiceRole.entities.Workshop.get(sprint.workshop_id);
        workshopName = workshop?.name || '';
      } catch (e) {
        console.warn('Não foi possível buscar workshop:', e.message);
      }
    }

    // Calcular as 4 datas de follow-up a partir de start_date da sprint
    // Usar 'T00:00:00' para evitar problema de fuso horário (UTC vs local)
    const baseDate = sprint.start_date
      ? new Date(sprint.start_date + 'T00:00:00')
      : new Date();

    const reminders = [7, 14, 21, 28].map((diasOffset, idx) => {
      const reminderDate = new Date(baseDate);
      reminderDate.setDate(reminderDate.getDate() + diasOffset);
      return {
        workshop_id: sprint.workshop_id || '',
        workshop_name: workshopName,
        sprint_id: sprint.id,
        origin_type: 'sprint',
        consultor_id: sprint.consultor_id || '',
        consultor_nome: sprint.consultor_nome || '',
        consulting_firm_id: sprint.consulting_firm_id || '',
        sequence_number: idx + 1,
        days_since_meeting: diasOffset,
        reminder_date: reminderDate.toISOString().split('T')[0],
        is_completed: false,
        message: `Hoje faz ${diasOffset} dias desde o início da sprint "${sprint.title}" de ${workshopName}. Verifique a evolução do cliente.`,
        notes: `Follow-up automático da sprint: ${sprint.title}`
      };
    });

    // Criar os 4 follow-ups usando asServiceRole para contornar o RLS (create exige role admin)
    await base44.asServiceRole.entities.FollowUpReminder.bulkCreate(reminders);

    console.log(`[onSprintCreated] ${reminders.length} follow-ups criados para sprint ${sprint.id} (${sprint.title})`);

    return Response.json({
      success: true,
      sprint_id: sprint.id,
      followups_criados: reminders.length,
      datas: reminders.map(r => r.reminder_date)
    });

  } catch (error) {
    console.error('[onSprintCreated] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});