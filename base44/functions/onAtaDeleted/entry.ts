import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Automação: disparada quando uma MeetingMinutes é deletada
// Garante que todos os FollowUpReminders vinculados sejam removidos (sem órfãos)
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const payload = await req.json();
  const ata_id = payload?.event?.entity_id || payload?.data?.id;

  if (!ata_id) {
    return Response.json({ error: 'ata_id não identificado no payload' }, { status: 400 });
  }

  console.log(`🔍 onAtaDeleted: limpando follow-ups da ATA ${ata_id}...`);

  const followUps = await base44.asServiceRole.entities.FollowUpReminder.filter({ ata_id });

  let deleted = 0;
  for (const fu of followUps) {
    await base44.asServiceRole.entities.FollowUpReminder.delete(fu.id);
    deleted++;
  }

  console.log(`✅ ${deleted} follow-up(s) removidos para ATA ${ata_id}`);

  return Response.json({ success: true, deleted });
});