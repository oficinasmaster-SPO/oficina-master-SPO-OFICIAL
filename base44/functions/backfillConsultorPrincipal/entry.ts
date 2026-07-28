import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const svc = base44.asServiceRole;

    // 1) Backfill FollowUpReminder.consultor_principal_id/nome a partir de consultor_id/nome
    //    (registros antigos, criados antes do round-robin, não tinham esses campos)
    const reminders = await svc.entities.FollowUpReminder.filter({}, '-created_date', 500);
    const remindersToFix = reminders.filter((r) => !r.consultor_principal_id && r.consultor_id);
    if (remindersToFix.length > 0) {
      await svc.entities.FollowUpReminder.bulkUpdate(
        remindersToFix.map((r) => ({
          id: r.id,
          consultor_principal_id: r.consultor_id,
          consultor_principal_nome: r.consultor_nome || '',
          atribuicao_automatica: false
        }))
      );
    }

    // 2) Backfill Workshop.consultor_principal_id/nome a partir do FollowUpReminder mais recente daquele workshop
    const workshops = await svc.entities.Workshop.filter({}, '-created_date', 500);
    const workshopsToFix = workshops.filter((w) => !w.consultor_principal_id);

    let workshopsUpdated = 0;
    const workshopUpdates = [];
    for (const w of workshopsToFix) {
      const wsReminders = await svc.entities.FollowUpReminder.filter(
        { workshop_id: w.id },
        '-created_date',
        1
      );
      const latest = wsReminders[0];
      if (latest && latest.consultor_id) {
        workshopUpdates.push({
          id: w.id,
          consultor_principal_id: latest.consultor_id,
          consultor_principal_nome: latest.consultor_nome || ''
        });
      }
    }
    if (workshopUpdates.length > 0) {
      await svc.entities.Workshop.bulkUpdate(workshopUpdates);
      workshopsUpdated = workshopUpdates.length;
    }

    return Response.json({
      success: true,
      followUpRemindersFixed: remindersToFix.length,
      workshopsChecked: workshopsToFix.length,
      workshopsUpdated
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}