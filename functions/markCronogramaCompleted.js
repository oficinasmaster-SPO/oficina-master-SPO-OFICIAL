import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Marca um item do CronogramaImplementacao como concluído automaticamente
 * Chamado quando diagnósticos, formulários, testes, treinamentos são finalizados
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workshop_id, item_id, item_nome, item_tipo } = await req.json();

    if (!workshop_id || !item_id) {
      return Response.json({ error: 'workshop_id e item_id obrigatórios' }, { status: 400 });
    }

    // Buscar implementação existente
    let implementacoes = await base44.asServiceRole.entities.CronogramaImplementacao.filter({
      workshop_id,
      item_id
    });

    const implementacao = implementacoes[0];

    if (implementacao && implementacao.status !== 'concluido') {
      // Atualizar como concluído
      const agora = new Date().toISOString();
      
      await base44.asServiceRole.entities.CronogramaImplementacao.update(implementacao.id, {
        status: 'concluido',
        data_termino_real,
        progresso_percentual: 100,
        historico_alteracoes: [
          ...(implementacao.historico_alteracoes || []),
          {
            data_alteracao,
            campo_alterado: 'status',
            valor_anterior.status,
            valor_novo: 'concluido',
            usuario_id.id,
            usuario_nome.full_name,
            motivo: 'Conclusão automática de ' + item_tipo
          }
        ]
      });

      // Sincronizar com CronogramaProgresso
      await base44.functions.invoke('syncCronogramaProgress', {
        workshop_id,
        item_id,
        item_nome || implementacao.item_nome,
        status: 'concluido',
        data_termino_real,
        data_termino_previsto.data_termino_previsto,
        progresso_percentual: 100
      });

      return Response.json({ success, message: 'Item marcado como concluído' });
    }

    return Response.json({ success, message: 'Item já estava concluído' });

  } catch (error) {
    console.error('Erro ao marcar cronograma concluído:', error);
    return Response.json({ error.message }, { status: 500 });
  }
});
