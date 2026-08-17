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

function extractDateBRT(d) {
  if (!d) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(d);
  const get = (t) => parts.find(p => p.type === t)?.value || '00';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

// S1-01: Recua sábado(6) e domingo(0) para a sexta-feira anterior (BRT)
function shiftToBusinessDay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00.000Z');
  const dow = d.getUTCDay();
  if (dow === 6) d.setUTCDate(d.getUTCDate() - 1); // sáb → sex
  if (dow === 0) d.setUTCDate(d.getUTCDate() - 2); // dom → sex
  return d.toISOString().split('T')[0];
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

    // ── Guard de integridade referencial: NUNCA persistir FollowUpReminder
    //    com workshop_id inexistente/inválido. Previne reminders órfãos que
    //    quebram queries $in downstream (BSONError/InvalidId → 500).
    const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;
    if (!OBJECT_ID_RE.test(String(workshopId))) {
      console.warn(`[createFollowUpReminders] workshop_id com formato inválido: "${workshopId}". Follow-ups não criados.`);
      return Response.json({ skipped: true, reason: 'workshop_id com formato inválido' });
    }
    let workshopName = '';
    let workshop = null;
    try {
      workshop = await base44.asServiceRole.entities.Workshop.get(workshopId);
    } catch (e) {
      console.warn(`[createFollowUpReminders] Erro ao buscar workshop ${workshopId}:`, e.message);
    }
    if (!workshop) {
      console.warn(`[createFollowUpReminders] Workshop ${workshopId} não encontrado. Follow-ups não criados (previne órfão).`);
      return Response.json({ skipped: true, reason: 'Workshop não encontrado' });
    }
    workshopName = workshop.name || '';
    if (workshop.status !== 'ativo') {
      console.log(`[createFollowUpReminders] Oficina ${workshopName} não está ativa. Skip.`);
      return Response.json({ skipped: true, reason: `Workshop não ativo: ${workshop.status}` });
    }

    // S1-01: Guard plano FREE — bloqueia FU automático
    if ((workshop.planoAtual || 'FREE') === 'FREE') {
      console.log(`[createFollowUpReminders] ${workshopName}: plano FREE. FU automático bloqueado.`);
      return Response.json({ skipped: true, reason: 'plano_free' });
    }

    // B4 FIX: normaliza data base corretamente
    const rawMeetingDate = data.meeting_date || atendimento.data_realizada || atendimento.data_agendada;
    const meetingDateUTC = normalizeDateUTC(rawMeetingDate);

    // S1-02: 1 FU único (+7d) em vez de 4. Aplica shiftToBusinessDay.
    const targetDateRaw = new Date(meetingDateUTC.getTime() + 7 * 24 * 60 * 60 * 1000);
    const targetDate = shiftToBusinessDay(extractDateBRT(targetDateRaw));

    // S1-02: Dedup semanal — se já existe FU aberto do mesmo workshop
    // cuja reminder_date caia na mesma semana (seg–sex) do alvo → skip
    const tDate = new Date(targetDate + 'T12:00:00.000Z');
    const tDow = tDate.getUTCDay();
    const tSeg = new Date(tDate); tSeg.setUTCDate(tDate.getUTCDate() - (tDow - 1));
    const tSex = new Date(tSeg);  tSex.setUTCDate(tSeg.getUTCDate() + 4);
    const segStr = tSeg.toISOString().split('T')[0];
    const sexStr = tSex.toISOString().split('T')[0];

    const fusSemana = await base44.asServiceRole.entities.FollowUpReminder.filter({
      workshop_id: workshopId,
      is_completed: false,
    });
    const dedupSemanal = (fusSemana || []).some(fu =>
      fu.reminder_date >= segStr && fu.reminder_date <= sexStr
    );
    if (dedupSemanal) {
      console.log(`[createFollowUpReminders] Dedup semanal: FU já existe para ${workshopName} na semana ${segStr}–${sexStr}. Skip.`);
      return Response.json({ skipped: true, reason: 'dedup_semanal', semana: `${segStr}/${sexStr}` });
    }

    const reminder = {
      workshop_id: workshopId,
      workshop_name: workshopName,
      atendimento_id: atendimento.id,
      ata_id: ataId,
      consultor_id: atendimento.consultor_id,
      consultor_nome: atendimento.consultor_nome || data.consultor_name || '',
      consultor_principal_id: workshop.consultor_principal_id || atendimento.consultor_id || null,
      consultor_principal_nome: workshop.consultor_principal_nome || atendimento.consultor_nome || null,
      reminder_date: targetDate,
      sequence_number: 1,
      days_since_meeting: 7,
      message: `Hoje faz 7 dias desde o último atendimento com ${workshopName}. Seria importante dar um retorno.`,
      is_completed: false,
      origin_type: 'ata',
    };

    await base44.asServiceRole.entities.FollowUpReminder.create(reminder);
    console.log(`✅ [createFollowUpReminders] 1 FU criado para ${workshopName} em ${targetDate}`);
    return Response.json({ created: 1, reminder_date: targetDate });
  } catch (error) {
    console.error('Error creating follow-up reminders:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});