import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data, old_data: oldData } = body;

    if (event?.type !== 'update' || data?.status !== 'inativo' || oldData?.status === 'inativo') {
      return Response.json({ skipped: true, reason: 'Não é uma nova inativação de oficina' });
    }

    const workshopId = data?.id || event?.entity_id;
    if (!workshopId) {
      return Response.json({ error: 'Oficina sem identificador' }, { status: 400 });
    }

    const inactivationDate = new Date().toISOString().split('T')[0];
    const existingReminders = await base44.asServiceRole.entities.FollowUpReminder.filter(
      { workshop_id: workshopId },
      '-created_date',
      5000
    );

    let lastConsultant = existingReminders.find((item) => item.consultor_id);
    if (!lastConsultant) {
      const attendances = await base44.asServiceRole.entities.ConsultoriaAtendimento.filter(
        { workshop_id: workshopId },
        '-data_agendada',
        1
      );
      lastConsultant = attendances?.[0] || null;
    }

    const pendingDeletion = await base44.asServiceRole.entities.FollowUpReminder.deleteMany({
      workshop_id: workshopId,
      is_completed: false,
    });
    const futureDeletion = await base44.asServiceRole.entities.FollowUpReminder.deleteMany({
      workshop_id: workshopId,
      reminder_date: { $gte: inactivationDate },
    });

    if (!lastConsultant?.consultor_id) {
      return Response.json({
        cleaned: true,
        created: false,
        warning: 'Follow-ups removidos, mas não há último consultor para atribuir o encerramento',
        deleted: { pending: pendingDeletion, future: futureDeletion },
      });
    }

    const finalDate = new Date(`${inactivationDate}T12:00:00.000Z`);
    finalDate.setUTCDate(finalDate.getUTCDate() + 7);
    const reminderDate = finalDate.toISOString().split('T')[0];
    const completedHistoryCount = existingReminders.filter((item) => item.is_completed === true).length;
    const finalMessage = 'Confirmar o encerramento do contrato, registrar a tentativa de reversão e dar o veredito final.';

    const finalFollowUp = await base44.asServiceRole.entities.FollowUpReminder.create({
      workshop_id: workshopId,
      workshop_name: data.name || existingReminders[0]?.workshop_name || 'Empresa inativada',
      consultor_id: lastConsultant.consultor_id,
      consultor_nome: lastConsultant.consultor_nome || null,
      reminder_date: reminderDate,
      sequence_number: completedHistoryCount + 1,
      days_since_meeting: 7,
      message: finalMessage,
      notes: `Encerramento de contrato: ${finalMessage}`,
      canal_origem: 'preventivo',
      origin_type: 'manual',
      is_completed: false,
      consulting_firm_id: data.consulting_firm_id || lastConsultant.consulting_firm_id || null,
    });

    return Response.json({
      cleaned: true,
      created: true,
      reminder_date: reminderDate,
      consultant_id: lastConsultant.consultor_id,
      follow_up_id: finalFollowUp.id,
      deleted: { pending: pendingDeletion, future: futureDeletion },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});