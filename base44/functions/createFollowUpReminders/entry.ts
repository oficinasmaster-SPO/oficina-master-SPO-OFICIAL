import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Normaliza qualquer string de data para Date UTC.
 * - Com 'Z' ou offset → parse direto (correto)
 * - Legado sem timezone → assume BRT (UTC-3)
 * - Date-only → ancora ao meio-dia BRT (15:00 UTC) para evitar -1 dia
 */
function normalizeDateUTC(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s + 'T15:00:00.000Z');
  if (s.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(s)) return new Date(s);
  return new Date(s + '-03:00');
}

/**
 * Extrai "YYYY-MM-DD" no fuso de Brasília a partir de qualquer Date UTC.
 * Substitui o padrão quebrado: date.toISOString().split('T')[0]
 */
function extractDateBRT(d) {
  if (!d) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(d);
  const get = (t) => parts.find(p => p.type === t)?.value || '00';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/**
 * QA FIX: Cria follow-up reminders APENAS se não existirem para o atendimento/ATA
 * Idempotente: nunca cria duplicatas para o mesmo (atendimento_id, sequence_number)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const data = body.data;
    const event = body.event;

    // Only process if ATA has an atendimento_id
    if (!data || !data.atendimento_id) {
      console.log('No atendimento_id in data, skipping');
      return Response.json({ skipped: true, reason: 'No atendimento_id' });
    }

    const ataId = data.id || event?.entity_id;
    console.log('Processing follow-up for ATA:', ataId, 'atendimento:', data.atendimento_id);

    // Fetch the related atendimento to get consultor info
    const atendimento = await base44.asServiceRole.entities.ConsultoriaAtendimento.get(data.atendimento_id);
    if (!atendimento) {
      return Response.json({ skipped: true, reason: 'Atendimento not found' });
    }

    const workshopId = data.workshop_id || atendimento.workshop_id;
    if (!workshopId) {
      return Response.json({ skipped: true, reason: 'No workshop_id' });
    }

    // ✅ QA FIX: Verificar se já existem reminders para este atendimento/ATA (evita duplicatas)
    const existingReminders = await base44.asServiceRole.entities.FollowUpReminder.filter({
      atendimento_id: atendimento.id,
      is_completed: false
    });

    if (existingReminders && existingReminders.length > 0) {
      console.log(`⚠️ Reminders já existem para atendimento ${atendimento.id}: ${existingReminders.length} encontrados. Pulando criação.`);
      return Response.json({
        skipped: true,
        reason: 'Reminders already exist for this atendimento',
        existing: existingReminders.length
      });
    }

    // Também verificar pela ATA específica
    if (ataId) {
      const ataReminders = await base44.asServiceRole.entities.FollowUpReminder.filter({
        ata_id: ataId,
        is_completed: false
      });
      if (ataReminders && ataReminders.length > 0) {
        console.log(`⚠️ Reminders já existem para ATA ${ataId}: ${ataReminders.length} encontrados. Pulando criação.`);
        return Response.json({
          skipped: true,
          reason: 'Reminders already exist for this ATA',
          existing: ataReminders.length
        });
      }
    }

    // Fetch workshop — verificar se está ativa antes de criar follow-ups
    let workshopName = '';
    try {
      const workshop = await base44.asServiceRole.entities.Workshop.get(workshopId);
      workshopName = workshop?.name || '';
      if (workshop?.status === 'inativo') {
        console.log(`[createFollowUpReminders] Oficina ${workshopName} está inativa. Follow-ups não criados.`);
        return Response.json({ skipped: true, reason: 'Workshop inativo' });
      }
    } catch (e) {
      console.warn('Could not fetch workshop:', e.message);
    }

    // B4 FIX: normaliza data base corretamente (legados sem TZ assumem BRT, date-only âncora ao meio-dia BRT)
    const rawMeetingDate = data.meeting_date || atendimento.data_realizada || atendimento.data_agendada;
    const meetingDateUTC = normalizeDateUTC(rawMeetingDate);

    const reminders = [];
    for (let i = 1; i <= 4; i++) {
      // Adiciona dias via ms — seguro, sem depender de setDate() em contexto TZ errado
      const reminderDateUTC = new Date(meetingDateUTC.getTime() + i * 7 * 24 * 60 * 60 * 1000);
      const daysOffset = i * 7;

      reminders.push({
        workshop_id: workshopId,
        workshop_name: workshopName,
        atendimento_id: atendimento.id,
        ata_id: ataId,
        consultor_id: atendimento.consultor_id,
        consultor_nome: atendimento.consultor_nome || data.consultor_name || '',
        // B4 FIX: extrai data no fuso BRT para que o dia exibido seja correto
        reminder_date: extractDateBRT(reminderDateUTC),
        sequence_number: i,
        days_since_meeting: daysOffset,
        message: `Hoje faz ${daysOffset} dias desde o último atendimento com ${workshopName}. Seria importante dar um retorno hoje ainda para saber sobre a evolução do cliente.`,
        is_completed: false,
        origin_type: 'ata'
      });
    }

    // Bulk create all 4 reminders
    await base44.asServiceRole.entities.FollowUpReminder.bulkCreate(reminders);

    console.log(`✅ Created ${reminders.length} follow-up reminders for atendimento ${atendimento.id}`, reminders.map(r => r.reminder_date));

    return Response.json({ 
      success: true, 
      created: reminders.length,
      dates: reminders.map(r => r.reminder_date)
    });
  } catch (error) {
    console.error('Error creating follow-up reminders:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});