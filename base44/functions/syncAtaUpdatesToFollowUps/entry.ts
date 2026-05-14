import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { ata_id, ata_data, workshop_id } = await req.json();

    if (!ata_id || !workshop_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Extrair próximos passos (prioriza lista estruturada, fallback para texto)
    const proximosPassosList = ata_data?.proximos_passos_list || [];
    const proximosPassosTexto = ata_data?.proximos_passos || '';
    
    // Gerar resumo para mensagem do FU (máx 200 chars)
    let resumoMensagem = '';
    if (proximosPassosList.length > 0) {
      resumoMensagem = proximosPassosList
        .slice(0, 3)
        .map(p => `• ${p.descricao}`)
        .join('\n');
    } else if (proximosPassosTexto) {
      resumoMensagem = proximosPassosTexto.substring(0, 200);
    }

    if (!resumoMensagem) {
      return Response.json({ 
        success: true, 
        message: 'Sem próximos passos para atualizar',
        updatedCount: 0
      });
    }

    // Buscar todos FollowUpReminder vinculados a esta ATA
    const followUps = await base44.asServiceRole.entities.FollowUpReminder.filter({
      workshop_id,
      ata_id,
      is_completed: false
    });

    if (followUps.length === 0) {
      return Response.json({ 
        success: true, 
        message: 'Nenhum follow-up pendente vinculado a esta ATA',
        updatedCount: 0
      });
    }

    // Atualizar mensagem de cada FU
    const updatedPromises = followUps.map(fu => 
      base44.asServiceRole.entities.FollowUpReminder.update(fu.id, {
        message: resumoMensagem,
        notes: `Atualizado automaticamente em ${new Date().toLocaleString('pt-BR')}`
      })
    );

    await Promise.all(updatedPromises);

    console.log(`✅ Atualizados ${followUps.length} follow-up(s) da ATA ${ata_id}`);

    return Response.json({
      success: true,
      message: `${followUps.length} follow-up(s) atualizado(s) com próximos passos`,
      updatedCount: followUps.length,
      followUpIds: followUps.map(f => f.id)
    });

  } catch (error) {
    console.error('Erro ao sincronizar ATA com follow-ups:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});