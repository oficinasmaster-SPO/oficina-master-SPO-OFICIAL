import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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

    // Fetch workshop name
    let workshopName = '';
    try {
      const workshop = await base44.asServiceRole.entities.Workshop.get(workshopId);
      workshopName = workshop?.name || '';
    } catch (e) {
      console.warn('Could not fetch workshop:', e.message);
    }

    // Calculate the base date (meeting date)
    const meetingDate = new Date(data.meeting_date || atendimento.data_realizada || atendimento.data_agendada);
    
    const reminders = [];
    for (let i = 1; i <= 4; i++) {
      const reminderDate = new Date(meetingDate);
      reminderDate.setDate(reminderDate.getDate() + (i * 7));
      const daysOffset = i * 7;

      reminders.push({
        workshop_id: workshopId,
        workshop_name: workshopName,
        atendimento_id: atendimento.id,
        ata_id: ataId,
        consultor_id: atendimento.consultor_id,
        consultor_nome: atendimento.consultor_nome || data.consultor_name || '',
        reminder_date: reminderDate.toISOString().split('T')[0],
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