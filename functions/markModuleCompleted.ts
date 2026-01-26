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
      item_id: module_code
    });

    if (!items || items.length === 0) {
      return Response.json({ 
        success: false, 
        message: 'Item não encontrado no cronograma' 
      });
    }

    const item = items[0];

    // Se já está concluído, não fazer nada
    if (item.status === 'concluido') {
      return Response.json({ 
        success: true, 
        message: 'Item já estava concluído' 
      });
    }

    // Atualizar para concluído
    const historicoAtualizado = [...(item.historico_alteracoes || []), {
      data_alteracao: new Date().toISOString(),
      campo_alterado: 'status',
      valor_anterior: item.status,
      valor_novo: 'concluido',
      usuario_id: user.id,
      usuario_nome: user.full_name,
      descricao: action_description || 'Ação concluída automaticamente'
    }];

    const updated = await base44.asServiceRole.entities.CronogramaImplementacao.update(item.id, {
      status: 'concluido',
      data_termino_real: new Date().toISOString().split('T')[0],
      progresso_percentual: 100,
      historico_alteracoes: historicoAtualizado
    });

    // Sincronizar com CronogramaProgresso
    try {
      await base44.functions.invoke('syncCronogramaProgress', {
        workshop_id,
        item_id: module_code,
        item_nome: item.item_nome,
        status: 'concluido',
        data_termino_real: new Date().toISOString(),
        progresso_percentual: 100
      });
    } catch (syncError) {
      console.error('Erro ao sincronizar com CronogramaProgresso:', syncError);
    }

    return Response.json({ 
      success: true,
      action: 'completed',
      item: updated
    });

  } catch (error) {
    console.error('Erro ao marcar módulo como concluído:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});