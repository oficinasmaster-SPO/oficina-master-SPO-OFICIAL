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

    if (!ata_id || !workshop_id) {
      return Response.json({ error: 'Missing ata_id or workshop_id' }, { status: 400 });
    }

    // Chamar funcao de sincronizacao
    await base44.functions.invoke('syncProximosPassosToTasks', {
      ata_id,
      ata_data,
      workshop_id
    });

    return Response.json({
      success: true,
      message: 'Próximos passos sincronizados com sucesso'
    });
  } catch (error) {
    console.error('Erro ao processar atualização de ATA:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});