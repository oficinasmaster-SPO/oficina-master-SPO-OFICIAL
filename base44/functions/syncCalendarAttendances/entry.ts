import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Webhook handler — Google Calendar → ConsultoriaAtendimento sync
 * Triggered by connector automation (automation_type="connector", integration_type="googlecalendar")
 * Platform handles authentication — do NOT add custom auth checks.
 */
Deno.serve(async (req) => {
  const body = await req.json();
  const base44 = createClientFromRequest(req);

  // 'sync' is a handshake ping — acknowledge and exit
  const state = body?.data?._provider_meta?.['x-goog-resource-state'];
  if (state === 'sync') {
    return Response.json({ status: 'sync_ack' });
  }

  const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');
  const authHeader = { Authorization: `Bearer ${accessToken}` };

  // Load persisted syncToken (stored in SyncState entity, NOT env vars)
  const syncRecords = await base44.asServiceRole.entities.SyncState.filter({ key: 'googlecalendar_primary' });
  const syncRecord = syncRecords.length > 0 ? syncRecords[0] : null;

  let url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=100';
  if (syncRecord?.sync_token) {
    url += `&syncToken=${encodeURIComponent(syncRecord.sync_token)}`;
  } else {
    // First run — fetch last 30 days
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    url += `&timeMin=${encodeURIComponent(since)}`;
  }

  let res = await fetch(url, { headers: authHeader });

  // syncToken expired — full re-sync from last 30 days
  if (res.status === 410) {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=100&timeMin=${encodeURIComponent(since)}`;
    res = await fetch(url, { headers: authHeader });
  }

  if (!res.ok) {
    const err = await res.text();
    console.error('Google Calendar API error:', res.status, err);
    return Response.json({ status: 'api_error', code: res.status });
  }

  // Drain all pages — nextSyncToken only appears on the last page
  const allItems = [];
  let pageData = await res.json();
  let newSyncToken = null;

  while (true) {
    allItems.push(...(pageData.items || []));
    if (pageData.nextSyncToken) newSyncToken = pageData.nextSyncToken;
    if (!pageData.nextPageToken) break;

    const nextRes = await fetch(
      url + `&pageToken=${pageData.nextPageToken}`,
      { headers: authHeader }
    );
    if (!nextRes.ok) break;
    pageData = await nextRes.json();
  }

  let synced = 0;
  let cancelled = 0;

  for (const event of allItems) {
    if (!event.id) continue;

    // Find existing attendance by google_event_id
    const existing = await base44.asServiceRole.entities.ConsultoriaAtendimento.filter({
      google_event_id: event.id
    });
    const atendimento = existing.length > 0 ? existing[0] : null;

    // Deleted/cancelled event → mark attendance as cancelado
    if (event.status === 'cancelled') {
      if (atendimento && atendimento.status !== 'cancelado') {
        await base44.asServiceRole.entities.ConsultoriaAtendimento.update(atendimento.id, {
          status: 'cancelado'
        });
        cancelled++;
      }
      continue;
    }

    // Parse event dates
    const startRaw = event.start?.dateTime || event.start?.date;
    const endRaw   = event.end?.dateTime   || event.end?.date;
    const startDate = startRaw ? new Date(startRaw) : null;
    const endDate   = endRaw   ? new Date(endRaw)   : null;
    const durationMinutes = (startDate && endDate)
      ? Math.round((endDate - startDate) / 60000)
      : 60;

    const updates = {
      google_event_id:      event.id,
      google_calendar_link: event.htmlLink || null,
      google_meet_link:     event.hangoutLink || (atendimento?.google_meet_link ?? null),
      data_agendada:        startDate ? startDate.toISOString() : undefined,
      duracao_minutos:      durationMinutes,
    };

    // Remove undefined keys
    Object.keys(updates).forEach(k => updates[k] === undefined && delete updates[k]);

    if (atendimento) {
      await base44.asServiceRole.entities.ConsultoriaAtendimento.update(atendimento.id, updates);
      synced++;
    }
    // Note: we only UPDATE existing records — we do not auto-create attendances from calendar events
    // because ConsultoriaAtendimento requires workshop_id + consultor_id which aren't in the Calendar event
  }

  // Persist the new syncToken after successful processing
  if (newSyncToken) {
    const payload = {
      key: 'googlecalendar_primary',
      sync_token: newSyncToken,
      last_synced_at: new Date().toISOString()
    };
    if (syncRecord) {
      await base44.asServiceRole.entities.SyncState.update(syncRecord.id, payload);
    } else {
      await base44.asServiceRole.entities.SyncState.create(payload);
    }
  }

  console.log(`Calendar sync complete — updated: ${synced}, cancelled: ${cancelled}, total events: ${allItems.length}`);
  return Response.json({ status: 'ok', synced, cancelled, total: allItems.length });
});