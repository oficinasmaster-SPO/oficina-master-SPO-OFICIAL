import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { ata_id, delete_follow_up } = await req.json();

    if (!ata_id) {
      return Response.json({ error: 'ata_id é obrigatório' }, { status: 400 });
    }

    // 1. Buscar a ATA para confirmar existência
    let ata;
    try {
      ata = await base44.entities.MeetingMinutes.get(ata_id);
    } catch (e) {
      if (e.status === 404) {
        return Response.json({ success: true, message: 'ATA já foi excluída anteriormente' });
      }
      throw e;
    }
    if (!ata) {
      return Response.json({ success: true, message: 'ATA já foi excluída anteriormente' });
    }

    console.log(`🗑️ Excluindo ATA ${ata_id}...`);

    // 2. Buscar o atendimento vinculado para limpar a referência e pegar o google_event_id
    const atendimento_id = ata.atendimento_id;
    let atendimento = null;
    if (atendimento_id) {
        atendimento = await base44.entities.ConsultoriaAtendimento.get(atendimento_id);
    }

    // 3. Excluir evento do Google Calendar se solicitado
    const eventId = atendimento?.google_event_id || ata.google_event_id;
    if (delete_follow_up && eventId) {
      try {
        const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlecalendar");
        const deleteResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        });

        if (!deleteResponse.ok && deleteResponse.status !== 404) {
          const errorText = await deleteResponse.text();
          console.error(`Erro ao excluir evento do calendário: ${errorText}`);
        }
      } catch (e) {
        console.error("Erro ao tentar conexão com Google Calendar:", e);
      }
    }

    // 4. Atualizar o atendimento para remover vínculos com a ATA
    if (atendimento_id) {
        console.log(`🔗 Atualizando atendimento ${atendimento_id}...`);
        await base44.entities.ConsultoriaAtendimento.update(atendimento_id, {
            ata_id: null,
            ata_gerada: false,
            ata_ia: null,
            ata_gerada_em: null,
            ...(delete_follow_up ? { google_event_id: null, google_calendar_link: null, google_meet_link: null } : {})
        });
    }

    // 3. Excluir a ATA
    try {
      await base44.entities.MeetingMinutes.delete(ata_id);
    } catch (e) {
      if (e.status === 404) {
        console.log('ATA já havia sido excluída');
      } else {
        throw e;
      }
    }

    return Response.json({ 
      success: true, 
      message: 'ATA excluída com sucesso' 
    });

  } catch (error) {
    console.error('❌ Erro ao excluir ATA:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});