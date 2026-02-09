import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workshop_id, item_tipo, item_id, item_nome, item_categoria } = await req.json();

    if (!workshop_id || !item_tipo || !item_id || !item_nome) {
      return Response.json({ 
        error: 'Parâmetros obrigatórios, item_tipo, item_id, item_nome' 
      }, { status: 400 });
    }

    // Buscar registro existente
    const existingRecords = await base44.entities.CronogramaImplementacao.filter({
      workshop_id,
      item_tipo,
      item_id
    });

    if (existingRecords && existingRecords.length > 0) {
      // Já existe, apenas incrementar visualizações
      const record = existingRecords[0];
      await base44.entities.CronogramaImplementacao.update(record.id, {
        total_visualizacoes: (record.total_visualizacoes || 0) + 1
      });

      return Response.json({ 
        success, 
        message: 'Visualização registrada',
        record_id.id,
        is_new
      });
    }

    // Criar novo registro
    const dataInicio = new Date();
    const dataTerminoPrevisto = new Date(dataInicio);
    dataTerminoPrevisto.setDate(dataTerminoPrevisto.getDate() + 30);

    const newRecord = await base44.entities.CronogramaImplementacao.create({
      workshop_id,
      item_tipo,
      item_id,
      item_nome,
      item_categoria || '',
      data_inicio_real.toISOString(),
      data_termino_previsto.toISOString(),
      status: 'em_andamento',
      total_visualizacoes: 1,
      historico_alteracoes: []
    });

    return Response.json({ 
      success, 
      message: 'Item iniciado no cronograma',
      record_id.id,
      is_new,
      data_inicio.toISOString(),
      data_termino_previsto.toISOString()
    });

  } catch (error) {
    console.error('❌ [trackImplementacao] Erro:', error);
    console.error('❌ [trackImplementacao] Stack:', error.stack);
    return Response.json({ 
      error: 'Erro ao registrar tracking',
      details.message,
      stack.stack 
    }, { status: 500 });
  }
});
