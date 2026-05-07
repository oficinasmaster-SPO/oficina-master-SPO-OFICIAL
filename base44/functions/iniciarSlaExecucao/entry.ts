import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { event, data } = payload;

    // Apenas processa atualização para status "em_execucao"
    if (event.type !== 'update' || !data || data.status !== 'em_execucao') {
      return Response.json({ ok: true, skipped: true });
    }

    const tarefaId = event.entity_id;
    const agora = new Date();

    // Calcula data limite do SLA
    const dataLimiteSla = new Date(agora);
    const slaHoras = data.sla_prazo_horas || 0;
    dataLimiteSla.setHours(dataLimiteSla.getHours() + slaHoras);

    // Atualiza tarefa
    await base44.asServiceRole.entities.TarefaBacklog.update(tarefaId, {
      data_inicio_execucao: agora.toISOString(),
      data_limite_sla: dataLimiteSla.toISOString()
    });

    // Log no histórico
    await base44.asServiceRole.entities.TarefaBacklogHistorico.create({
      tarefa_id: tarefaId,
      acao: 'MUDANCA_STATUS',
      campo: 'data_inicio_execucao',
      valor_anterior: null,
      valor_novo: agora.toISOString(),
      usuario_id: data.atribuido_para_id || data.consultor_id,
      usuario_nome: data.usuario_nome,
      data_hora: agora.toISOString()
    });

    return Response.json({ ok: true, tarefaId, dataLimiteSla });
  } catch (error) {
    console.error('Erro em iniciarSlaExecucao:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});