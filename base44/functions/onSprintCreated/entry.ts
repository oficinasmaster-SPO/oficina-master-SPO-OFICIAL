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
        console.warn('[onSprintCreated] Não foi possível buscar workshop:', e.message);
      }
    }

    // Buscar nome real do consultor pelo consultor_id
    // sprint.consultor_nome chega vazio pois o frontend não popula esse campo no create
    let consultorNome = sprint.consultor_nome || '';
    if (!consultorNome && sprint.consultor_id) {
      try {
        const consultor = await base44.asServiceRole.entities.User.get(sprint.consultor_id);
        consultorNome = consultor?.full_name || consultor?.email || '';
      } catch (e) {
        console.warn('[onSprintCreated] Não foi possível buscar consultor:', e.message);
      }
    }

    // Calcular as 4 datas de follow-up a partir de start_date da sprint
    // Usar 'T00:00:00' para evitar problema de fuso horário (UTC vs local)
    const baseDate = sprint.start_date
      ? new Date(sprint.start_date + 'T00:00:00')
      : new Date();

    // R3-03: usar undefined em vez de '' para campos opcionais — evita poluição do banco
    const reminders = [7, 14, 21, 28].map((diasOffset, idx) => {
      const reminderDate = new Date(baseDate);
      reminderDate.setDate(reminderDate.getDate() + diasOffset);
      return {
        workshop_id: sprint.workshop_id || undefined,
        workshop_name: workshopName || undefined,
        sprint_id: sprint.id,
        origin_type: 'sprint',
        consultor_id: sprint.consultor_id || undefined,
        consultor_nome: consultorNome || undefined,
        consulting_firm_id: sprint.consulting_firm_id || undefined,
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

    console.log(`[onSprintCreated] ${reminders.length} follow-ups criados para sprint ${sprint.id} (${sprint.title}) — consultor: ${consultorNome}`);

    return Response.json({
      success: true,
      sprint_id: sprint.id,
      followups_criados: reminders.length,
      consultor_nome: consultorNome,
      datas: reminders.map(r => r.reminder_date)
    });

  } catch (error) {
    console.error('[onSprintCreated] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});