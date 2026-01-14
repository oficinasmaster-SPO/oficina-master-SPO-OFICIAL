import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { force = false } = await req.json();

    // Verificar se sincronização está habilitada
    const settings = await base44.asServiceRole.entities.SystemSetting.filter({ 
      key: 'google_calendar_sync' 
    });
    
    const config = settings[0]?.value || {};
    if (!config.enabled && !force) {
      return Response.json({ error: 'Sincronização desabilitada' }, { status: 400 });
    }

    // Obter token do Google Calendar
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    // Buscar atendimentos dos últimos 30 dias sem google_event_id
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const atendimentos = await base44.asServiceRole.entities.ConsultoriaAtendimento.filter({
      data_agendada: { $gte: thirtyDaysAgo.toISOString() }
    });

    const toSync = atendimentos.filter(a => !a.google_event_id);
    let syncedCount = 0;

    // Criar eventos no Google Calendar
    for (const atendimento of toSync) {
      try {
        const startDateTime = new Date(atendimento.data_agendada);
        const endDateTime = new Date(startDateTime.getTime() + (atendimento.duracao_minutos || 60) * 60000);

        const attendees = (atendimento.participantes || [])
          .map(p => p.email)
          .filter(e => e && e.includes('@'))
          .map(email => ({ email }));

        const event = {
          summary: `${atendimento.tipo_atendimento?.replace(/_/g, ' ')} - Oficinas Master`,
          description: atendimento.objetivos?.join('\n') || '',
          start: {
            dateTime: startDateTime.toISOString(),
            timeZone: 'America/Sao_Paulo',
          },
          end: {
            dateTime: endDateTime.toISOString(),
            timeZone: 'America/Sao_Paulo',
          },
          attendees,
          conferenceData: config.auto_create_meet ? {
            createRequest: {
              requestId: `meet-${atendimento.id}`,
              conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
          } : undefined,
        };

        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(event),
          }
        );

        if (!response.ok) {
          const errorData = await response.text();
          console.error(`Erro ao criar evento: ${errorData}`);
          continue;
        }

        const createdEvent = await response.json();

        // Atualizar atendimento com IDs do Google
        await base44.asServiceRole.entities.ConsultoriaAtendimento.update(atendimento.id, {
          google_event_id: createdEvent.id,
          google_calendar_link: createdEvent.htmlLink,
          google_meet_link: createdEvent.hangoutLink || atendimento.google_meet_link,
        });

        syncedCount++;
      } catch (error) {
        console.error(`Erro ao sincronizar atendimento ${atendimento.id}:`, error);
      }
    }

    // Sincronização bidirecional (importar do Calendar)
    let importedCount = 0;
    let updatedCount = 0;
    if (config.sync_bidirectional) {
      try {
        // Importar eventos dos últimos 7 dias e próximos 90 dias
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 7);
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 90);

        const calendarResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
          `timeMin=${pastDate.toISOString()}&timeMax=${futureDate.toISOString()}&` +
          `maxResults=500&singleEvents=true&orderBy=startTime`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );

        if (calendarResponse.ok) {
          const calendarData = await calendarResponse.json();
          const calendarEvents = calendarData.items || [];

          // Buscar todos atendimentos com google_event_id
          const allAtendimentos = await base44.asServiceRole.entities.ConsultoriaAtendimento.list();
          const atendimentosMap = new Map(
            allAtendimentos
              .filter(a => a.google_event_id)
              .map(a => [a.google_event_id, a])
          );

          for (const event of calendarEvents) {
            if (!event.start?.dateTime) continue;
            if (event.status === 'cancelled') continue;

            const startDate = new Date(event.start.dateTime);
            const endDate = new Date(event.end?.dateTime || startDate);
            const duracao = Math.round((endDate - startDate) / 60000);

            const existingAtendimento = atendimentosMap.get(event.id);

            if (existingAtendimento) {
              // Atualizar evento existente se houver mudanças
              const needsUpdate = 
                new Date(existingAtendimento.data_agendada).getTime() !== startDate.getTime() ||
                existingAtendimento.duracao_minutos !== duracao;

              if (needsUpdate) {
                await base44.asServiceRole.entities.ConsultoriaAtendimento.update(
                  existingAtendimento.id,
                  {
                    data_agendada: startDate.toISOString(),
                    duracao_minutos: duracao,
                    google_calendar_link: event.htmlLink,
                    google_meet_link: event.hangoutLink || existingAtendimento.google_meet_link,
                  }
                );
                updatedCount++;
              }
            } else {
              // Criar novo atendimento
              const attendees = (event.attendees || [])
                .filter(a => a.email)
                .map(a => ({
                  nome: a.displayName || a.email.split('@')[0],
                  email: a.email,
                  cargo: ''
                }));

              await base44.asServiceRole.entities.ConsultoriaAtendimento.create({
                workshop_id: 'IMPORTADO_CALENDAR',
                consultor_id: user.id,
                consultor_nome: user.full_name,
                tipo_atendimento: 'importado_calendar',
                data_agendada: startDate.toISOString(),
                duracao_minutos: duracao,
                status: 'agendado',
                google_event_id: event.id,
                google_calendar_link: event.htmlLink,
                google_meet_link: event.hangoutLink || '',
                participantes: attendees,
                objetivos: event.description ? [event.description] : [],
                observacoes_consultor: `📅 Importado: ${event.summary || 'Sem título'}`,
              });

              importedCount++;
            }
          }
        }
      } catch (error) {
        console.error('Erro na sincronização bidirecional:', error);
      }
    }

    return Response.json({
      success: true,
      synced_count: syncedCount,
      imported_count: importedCount,
      updated_count: updatedCount,
      message: `${syncedCount} enviados, ${importedCount} importados, ${updatedCount} atualizados`
    });

  } catch (error) {
    console.error('Erro na sincronização:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});