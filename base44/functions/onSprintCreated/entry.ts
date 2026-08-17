import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// S1-01: Recua sábado(6) e domingo(0) para a sexta-feira anterior (BRT)
function shiftToBusinessDay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00.000Z');
  const dow = d.getUTCDay();
  if (dow === 6) d.setUTCDate(d.getUTCDate() - 1); // sáb → sex
  if (dow === 0) d.setUTCDate(d.getUTCDate() - 2); // dom → sex
  return d.toISOString().split('T')[0];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { data } = await req.json();

    if (!data?.id) {
      return Response.json({ error: 'Missing sprint data' }, { status: 400 });
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    const sprint = await base44.asServiceRole.entities.ConsultoriaSprint.get(data.id);
    if (!sprint) {
      return Response.json({ error: 'Sprint não encontrada' }, { status: 404 });
    }

    // Auto-transição pending → in_progress
    if (sprint.status === 'pending') {
      await base44.asServiceRole.entities.ConsultoriaSprint.update(sprint.id, {
        status: 'in_progress',
        last_activity_date: new Date().toISOString(),
      });
    }

    // Guard: workshop obrigatório
    if (!sprint.workshop_id) {
      return Response.json({ skipped: true, reason: 'sprint sem workshop_id' });
    }

    let workshop = null;
    try {
      workshop = await base44.asServiceRole.entities.Workshop.get(sprint.workshop_id);
    } catch (e) {
      console.warn('[onSprintCreated] Erro ao buscar workshop:', e.message);
    }

    if (!workshop) {
      return Response.json({ skipped: true, reason: 'workshop não encontrado' });
    }

    // S2-01: Guard workshop inativo
    if (workshop.status !== 'ativo') {
      console.log(`[onSprintCreated] ${workshop.name}: status=${workshop.status}. Skip.`);
      return Response.json({ skipped: true, reason: `workshop_inativo: ${workshop.status}` });
    }

    // S1-01: Guard plano FREE
    if ((workshop.planoAtual || 'FREE') === 'FREE') {
      console.log(`[onSprintCreated] ${workshop.name}: plano FREE. FU automático bloqueado.`);
      return Response.json({ skipped: true, reason: 'plano_free' });
    }

    const workshopName = workshop.name || '';

    // Buscar nome do consultor
    let consultorNome = sprint.consultor_nome || '';
    if (!consultorNome && sprint.consultor_id) {
      try {
        const consultor = await base44.asServiceRole.entities.User.get(sprint.consultor_id);
        consultorNome = consultor?.full_name || consultor?.email || '';
      } catch (e) {
        console.warn('[onSprintCreated] Erro ao buscar consultor:', e.message);
      }
    }

    // S1-02: Idempotência por sprint_id — evita duplicata se automation disparar 2x
    const existentes = await base44.asServiceRole.entities.FollowUpReminder.filter({
      sprint_id: sprint.id,
      is_completed: false,
    });
    if (existentes && existentes.length > 0) {
      console.log(`[onSprintCreated] FU já existe para sprint ${sprint.id}. Skip.`);
      return Response.json({ skipped: true, reason: 'dedup_sprint_id', existentes: existentes.length });
    }

    // S1-02: 1 FU único (+7d a partir do start_date) em vez de 4
    const baseDate = sprint.start_date
      ? new Date(sprint.start_date + 'T12:00:00.000Z')
      : new Date();
    const rawTarget = new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    const targetDate = shiftToBusinessDay(rawTarget.toISOString().split('T')[0]);

    // S1-02: Dedup semanal — não criar se já existe FU aberto do workshop na mesma semana
    const tDate = new Date(targetDate + 'T12:00:00.000Z');
    const tDow = tDate.getUTCDay();
    const tSeg = new Date(tDate); tSeg.setUTCDate(tDate.getUTCDate() - (tDow - 1));
    const tSex = new Date(tSeg);  tSex.setUTCDate(tSeg.getUTCDate() + 4);
    const segStr = tSeg.toISOString().split('T')[0];
    const sexStr = tSex.toISOString().split('T')[0];

    const fusSemana = await base44.asServiceRole.entities.FollowUpReminder.filter({
      workshop_id: sprint.workshop_id,
      is_completed: false,
    });
    const dedupSemanal = (fusSemana || []).some(fu =>
      fu.reminder_date >= segStr && fu.reminder_date <= sexStr
    );
    if (dedupSemanal) {
      console.log(`[onSprintCreated] Dedup semanal: FU já existe para ${workshopName} na semana ${segStr}–${sexStr}. Skip.`);
      return Response.json({ skipped: true, reason: 'dedup_semanal', semana: `${segStr}/${sexStr}` });
    }

    const reminder = {
      workshop_id: sprint.workshop_id,
      workshop_name: workshopName,
      sprint_id: sprint.id,
      origin_type: 'sprint',
      consultor_id: sprint.consultor_id || undefined,
      consultor_nome: consultorNome || undefined,
      consultor_principal_id: workshop.consultor_principal_id || sprint.consultor_id || null,
      consultor_principal_nome: workshop.consultor_principal_nome || consultorNome || null,
      consulting_firm_id: sprint.consulting_firm_id || undefined,
      sequence_number: 1,
      days_since_meeting: 7,
      reminder_date: targetDate,
      is_completed: false,
      message: `Hoje faz 7 dias desde o início da sprint "${sprint.title}" de ${workshopName}. Verifique a evolução do cliente.`,
      notes: `Follow-up automático da sprint: ${sprint.title}`,
    };

    await base44.asServiceRole.entities.FollowUpReminder.create(reminder);
    console.log(`✅ [onSprintCreated] 1 FU criado para ${workshopName} em ${targetDate}`);

    return Response.json({
      created: 1,
      sprint_id: sprint.id,
      reminder_date: targetDate,
      consultor_nome: consultorNome,
    });

  } catch (error) {
    console.error('[onSprintCreated] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
