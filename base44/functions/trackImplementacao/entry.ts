import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * trackImplementacao — TELEMETRIA PURA
 *
 * NÃO cria cronograma. NÃO inicializa itens.
 * Apenas registra: visualizações, último acesso, progresso parcial.
 *
 * Quem cria o cronograma estrutural: generateFullCronograma()
 * Quem marca conclusão: markCronogramaCompleted()
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workshop_id, item_tipo, item_id, item_nome, progresso_percentual } = await req.json();

    if (!workshop_id || !item_id) {
      return Response.json({
        error: 'Parâmetros obrigatórios: workshop_id, item_id'
      }, { status: 400 });
    }

    // Buscar item existente no cronograma estrutural
    const existingRecords = await base44.entities.CronogramaImplementacao.filter({
      workshop_id,
      item_id,
      ...(item_tipo ? { item_tipo } : {})
    });

    if (!existingRecords || existingRecords.length === 0) {
      // Item não existe no cronograma — apenas registrar telemetria, NÃO criar
      console.log(`[trackImplementacao] Item ${item_id} não encontrado no cronograma. Telemetria ignorada (aguardando generateFullCronograma).`);
      return Response.json({
        success: true,
        tracked: false,
        reason: 'item_nao_encontrado_no_cronograma',
        message: 'Item ainda não gerado pelo generateFullCronograma. Nenhum registro criado.'
      });
    }

    const record = existingRecords[0];

    // Atualizar apenas campos de telemetria — nunca alterar status nem prazo
    const updateData = {
      total_visualizacoes: (record.total_visualizacoes || 0) + 1,
      data_ultimo_acesso: new Date().toISOString(),
      ...(progresso_percentual !== undefined && progresso_percentual > (record.progresso_percentual || 0)
        ? { progresso_percentual }
        : {})
    };

    await base44.entities.CronogramaImplementacao.update(record.id, updateData);

    return Response.json({
      success: true,
      tracked: true,
      record_id: record.id,
      total_visualizacoes: updateData.total_visualizacoes,
      status_atual: record.status,
      engine_version: record.engine_version || 'legacy_v1'
    });

  } catch (error) {
    console.error('❌ [trackImplementacao] Erro:', error);
    return Response.json({
      error: 'Erro ao registrar telemetria',
      details: error.message
    }, { status: 500 });
  }
});