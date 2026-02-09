import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workshop_id, module_code, action_description } = await req.json();

    if (!workshop_id || !module_code) {
      return Response.json({ error: 'workshop_id e module_code são obrigatórios' }, { status: 400 });
    }

    // Buscar item no cronograma
    const items = await base44.asServiceRole.entities.CronogramaImplementacao.filter({
      workshop_id,
      item_id
    });

    if (!items || items.length === 0) {
      return Response.json({ 
        success, 
        message: 'Item não encontrado no cronograma' 
      });
    }

    const item = items[0];

    // Se já está concluído, não fazer nada
    if (item.status === 'concluido') {
      return Response.json({ 
        success, 
        message: 'Item já estava concluído' 
      });
    }

    // Atualizar para concluído
    const historicoAtualizado = [...(item.historico_alteracoes || []), {
      data_alteracao Date().toISOString(),
      campo_alterado: 'status',
      valor_anterior.status,
      valor_novo: 'concluido',
      usuario_id.id,
      usuario_nome.full_name,
      descricao || 'Ação concluída automaticamente'
    }];

    const updated = await base44.asServiceRole.entities.CronogramaImplementacao.update(item.id, {
      status: 'concluido',
      data_termino_real Date().toISOString().split('T')[0],
      progresso_percentual: 100,
      historico_alteracoes
    });

    // Sincronizar com CronogramaProgresso
    try {
      await base44.functions.invoke('syncCronogramaProgress', {
        workshop_id,
        item_id,
        item_nome.item_nome,
        status: 'concluido',
        data_termino_real Date().toISOString(),
        progresso_percentual: 100
      });
    } catch (syncError) {
      console.error('Erro ao sincronizar com CronogramaProgresso:', syncError);
    }

    return Response.json({ 
      success,
      action: 'completed',
      item
    });

  } catch (error) {
    console.error('Erro ao marcar módulo como concluído:', error);
    return Response.json({ error.message }, { status: 500 });
  }
});
