import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { event, data, old_data } = payload;
    const entityId = event?.entity_id;
    const eventType = event?.type; // 'create' | 'update'

    if (!entityId || !data) {
      return Response.json({ error: 'Payload inválido' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const registros = [];

    if (eventType === 'create') {
      // Log de criação
      registros.push({
        tarefa_id: entityId,
        usuario_id: data.created_by_id || null,
        usuario_nome: data.assignee_name || null,
        acao: 'CRIACAO',
        campo: 'tarefa',
        valor_anterior: null,
        valor_novo: data.titulo || 'Tarefa criada',
        data_hora: now
      });

      // Log de atribuição (se já veio com consultor)
      if (data.assignee_id) {
        registros.push({
          tarefa_id: entityId,
          usuario_id: data.created_by_id || null,
          usuario_nome: data.assignee_name || null,
          acao: 'ATRIBUICAO',
          campo: 'assignee_id',
          valor_anterior: null,
          valor_novo: data.assignee_name || data.assignee_id,
          data_hora: now
        });
      }
    } else if (eventType === 'update' && old_data) {
      // Detectar mudança de status
      if (old_data.status !== data.status) {
        const acao = data.status === 'concluida' ? 'CONCLUSAO'
                   : data.status === 'bloqueada' ? 'BLOQUEIO'
                   : 'MUDANCA_STATUS';

        registros.push({
          tarefa_id: entityId,
          usuario_id: null,
          usuario_nome: null,
          acao,
          campo: 'status',
          valor_anterior: old_data.status,
          valor_novo: data.status,
          data_hora: now
        });
      }

      // Detectar mudança de atribuição (assignee_id)
      if (old_data.assignee_id !== data.assignee_id) {
        registros.push({
          tarefa_id: entityId,
          usuario_id: null,
          usuario_nome: null,
          acao: 'ATRIBUICAO',
          campo: 'assignee_id',
          valor_anterior: old_data.assignee_name || old_data.assignee_id,
          valor_novo: data.assignee_name || data.assignee_id,
          data_hora: now
        });
      }

      // Detectar outras edições relevantes
      const camposMonitorados = ['titulo', 'prazo', 'prioridade', 'impacto', 'descricao'];
      for (const campo of camposMonitorados) {
        if (old_data[campo] !== data[campo] && data[campo] !== undefined) {
          registros.push({
            tarefa_id: entityId,
            usuario_id: null,
            usuario_nome: null,
            acao: 'EDICAO',
            campo,
            valor_anterior: String(old_data[campo] ?? ''),
            valor_novo: String(data[campo] ?? ''),
            data_hora: now
          });
        }
      }
    }

    // Salvar todos os registros
    for (const registro of registros) {
      await base44.asServiceRole.entities.TarefaBacklogHistorico.create(registro);
    }

    return Response.json({ ok: true, registros: registros.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});