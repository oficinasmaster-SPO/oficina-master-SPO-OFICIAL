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
    const ata = await base44.entities.MeetingMinutes.get(ata_id);
    if (!ata) {
      return Response.json({ error: 'ATA não encontrada' }, { status: 404 });
    }

    console.log(`🗑️ Excluindo ATA ${ata_id}...`);

    if (delete_follow_up && ata.google_event_id) {
      const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlecalendar");
      const deleteResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${ata.google_event_id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (!deleteResponse.ok && deleteResponse.status !== 404) {
        const errorText = await deleteResponse.text();
        throw new Error(`Erro ao excluir follow up do calendário: ${errorText}`);
      }
    }

    // 2. Buscar o atendimento vinculado para limpar a referência
    const atendimento_id = ata.atendimento_id;
    if (atendimento_id) {
        console.log(`🔗 Atualizando atendimento ${atendimento_id}...`);
        await base44.entities.ConsultoriaAtendimento.update(atendimento_id, {
            ata_id: null,
            ata_gerada: false,
            ata_ia: null,
            ata_gerada_em: null,
            ...(delete_follow_up ? { google_event_id: null } : {})
        });
    }

    // 3. Excluir a ATA
    await base44.entities.MeetingMinutes.delete(ata_id);

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