import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    // Validar estrutura do evento
    if (!event || !data) {
      return Response.json({ error: 'Invalid event payload' }, { status: 400 });
    }

    const ata_id = event.entity_id;
    const ata_data = data;
    const workshop_id = ata_data?.workshop_id;
    const consulting_firm_id = ata_data?.consulting_firm_id || null;
    const consultor_id = ata_data?.consultor_id || null;

    if (!ata_id || !workshop_id) {
      return Response.json({ error: 'Missing ata_id or workshop_id' }, { status: 400 });
    }

    // Buscar consulting_firm_id via Workshop se não vier na ATA
    let resolved_consulting_firm_id = consulting_firm_id;
    if (!resolved_consulting_firm_id && workshop_id) {
      try {
        const workshops = await base44.asServiceRole.entities.Workshop.filter({ id: workshop_id });
        resolved_consulting_firm_id = workshops?.[0]?.consulting_firm_id || null;
      } catch (_) {}
    }

    // Chamar funcao de sincronizacao com todos os campos necessários
    const syncResult = await base44.functions.invoke('syncProximosPassosToTasks', {
      ata_id,
      ata_data,
      workshop_id,
      consulting_firm_id: resolved_consulting_firm_id,
      consultor_id
    });

    // Atualizar follow-ups vinculados com novos próximos passos
    const fuResult = await base44.functions.invoke('syncAtaUpdatesToFollowUps', {
      ata_id,
      ata_data,
      workshop_id
    });

    console.log('✅ Sync completo:', {
      tarefas: syncResult?.data?.message || 'ok',
      followUps: fuResult?.data?.message || 'nenhum FU atualizado'
    });

    return Response.json({
      success: true,
      message: `Próximos passos sincronizados: ${syncResult?.data?.message || 'ok'} | ${fuResult?.data?.message || 'nenhum FU atualizado'}`
    });
  } catch (error) {
    console.error('Erro ao processar atualização de ATA:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});