import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { event, data, old_data } = payload;
    const eventType = event?.type; // 'create' or 'update'
    const tarefaId = data?.id || event?.entity_id;
    const now = new Date().toISOString();

    // Determina usuario_id: quem fez a ação (usa created_by como proxy)
    const usuarioId = data?.created_by || null;
    const usuarioNome = null; // sem lookup extra

    const historicos = [];

    if (eventType === 'create') {
      // Registro de criação
      historicos.push({
        tarefa_id: tarefaId,
        usuario_id: usuarioId,
        usuario_nome: usuarioNome,
        acao: 'CRIACAO',
        campo: 'tarefa',
        valor_anterior: null,
        valor_novo: data?.titulo || 'Tarefa criada',
        data_hora: now
      });
    }

    if (eventType === 'update' && old_data) {
      // Mudança de status
      if (old_data.status !== data?.status) {
        historicos.push({
          tarefa_id: tarefaId,
          usuario_id: usuarioId,
          usuario_nome: usuarioNome,
          acao: data?.status === 'concluida' ? 'CONCLUSAO' : data?.status === 'bloqueada' ? 'BLOQUEIO' : 'MUDANCA_STATUS',
          campo: 'status',
          valor_anterior: old_data.status || null,
          valor_novo: data?.status || null,
          data_hora: now
        });
      }

      // Mudança de atribuição
      if (old_data.assigned_to_id !== data?.assigned_to_id) {
        historicos.push({
          tarefa_id: tarefaId,
          usuario_id: usuarioId,
          usuario_nome: usuarioNome,
          acao: 'ATRIBUICAO',
          campo: 'responsavel',
          valor_anterior: old_data.assigned_to_id || null,
          valor_novo: data?.assigned_to_id || null,
          data_hora: now
        });
      }

      // Mudança de consultor
      if (old_data.assignee_id !== data?.assignee_id) {
        historicos.push({
          tarefa_id: tarefaId,
          usuario_id: usuarioId,
          usuario_nome: usuarioNome,
          acao: 'ATRIBUICAO',
          campo: 'consultor',
          valor_anterior: old_data.assignee_name || old_data.assignee_id || null,
          valor_novo: data?.assignee_name || data?.assignee_id || null,
          data_hora: now
        });
      }

      // Mudança de prioridade
      if (old_data.prioridade !== data?.prioridade) {
        historicos.push({
          tarefa_id: tarefaId,
          usuario_id: usuarioId,
          usuario_nome: usuarioNome,
          acao: 'EDICAO',
          campo: 'prioridade',
          valor_anterior: old_data.prioridade || null,
          valor_novo: data?.prioridade || null,
          data_hora: now
        });
      }

      // Mudança de prazo
      if (old_data.prazo !== data?.prazo) {
        historicos.push({
          tarefa_id: tarefaId,
          usuario_id: usuarioId,
          usuario_nome: usuarioNome,
          acao: 'EDICAO',
          campo: 'prazo',
          valor_anterior: old_data.prazo || null,
          valor_novo: data?.prazo || null,
          data_hora: now
        });
      }

      // Mudança de título
      if (old_data.titulo !== data?.titulo) {
        historicos.push({
          tarefa_id: tarefaId,
          usuario_id: usuarioId,
          usuario_nome: usuarioNome,
          acao: 'EDICAO',
          campo: 'titulo',
          valor_anterior: old_data.titulo || null,
          valor_novo: data?.titulo || null,
          data_hora: now
        });
      }

      // Mudança de descrição
      if (old_data.descricao !== data?.descricao) {
        historicos.push({
          tarefa_id: tarefaId,
          usuario_id: usuarioId,
          usuario_nome: usuarioNome,
          acao: 'EDICAO',
          campo: 'descricao',
          valor_anterior: old_data.descricao ? old_data.descricao.substring(0, 200) : null,
          valor_novo: data?.descricao ? data.descricao.substring(0, 200) : null,
          data_hora: now
        });
      }

      // Mudança de impacto
      if (old_data.impacto !== data?.impacto) {
        historicos.push({
          tarefa_id: tarefaId,
          usuario_id: usuarioId,
          usuario_nome: usuarioNome,
          acao: 'EDICAO',
          campo: 'impacto',
          valor_anterior: old_data.impacto || null,
          valor_novo: data?.impacto || null,
          data_hora: now
        });
      }

      // Mudança de tempo estimado
      if (old_data.tempo_estimado_horas !== data?.tempo_estimado_horas) {
        historicos.push({
          tarefa_id: tarefaId,
          usuario_id: usuarioId,
          usuario_nome: usuarioNome,
          acao: 'EDICAO',
          campo: 'tempo_estimado_horas',
          valor_anterior: old_data.tempo_estimado_horas != null ? String(old_data.tempo_estimado_horas) : null,
          valor_novo: data?.tempo_estimado_horas != null ? String(data.tempo_estimado_horas) : null,
          data_hora: now
        });
      }

      // Mudança de motivo de bloqueio
      if (old_data.motivo_bloqueio !== data?.motivo_bloqueio) {
        historicos.push({
          tarefa_id: tarefaId,
          usuario_id: usuarioId,
          usuario_nome: usuarioNome,
          acao: 'EDICAO',
          campo: 'motivo_bloqueio',
          valor_anterior: old_data.motivo_bloqueio || null,
          valor_novo: data?.motivo_bloqueio || null,
          data_hora: now
        });
      }
    }

    // Persiste todos os registros de histórico
    for (const h of historicos) {
      await base44.asServiceRole.entities.TarefaBacklogHistorico.create(h);
    }

    return Response.json({ ok: true, registros: historicos.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});