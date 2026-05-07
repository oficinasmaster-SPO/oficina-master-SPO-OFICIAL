import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { data } = payload;
    const tarefaId = data?.id;

    if (!tarefaId || !data.prioridade) {
      return Response.json({ error: 'ID e prioridade obrigatórios' }, { status: 400 });
    }

    // Mapeamento de SLA por prioridade (em horas)
    const slaMap = {
      critica: 1,
      alta: 4,
      media: 8,
      baixa: 24
    };

    const prioridadeNormalizada = data.prioridade.toLowerCase();
    const slaHoras = slaMap[prioridadeNormalizada];

    if (!slaHoras) {
      return Response.json({ error: 'Prioridade inválida' }, { status: 400 });
    }

    // Calcula deadline SLA (data de criação + horas)
    const dataCriacao = new Date(data.data_criacao || Date.now());
    const dataDeadlineSla = new Date(dataCriacao);
    dataDeadlineSla.setHours(dataDeadlineSla.getHours() + slaHoras);

    // Atualiza tarefa com SLA
    await base44.asServiceRole.entities.TarefaBacklog.update(tarefaId, {
      sla_prazo_horas: slaHoras,
      sla_deadline: dataDeadlineSla.toISOString(),
      sla_status: 'ativo',
      alerta_sla_emitido: false,
      sla_escalado: false
    });

    return Response.json({
      ok: true,
      tarefaId,
      prioridade: data.prioridade,
      sla_horas: slaHoras,
      sla_deadline: dataDeadlineSla.toISOString()
    });
  } catch (error) {
    console.error('Erro em definirSlaAutomatico:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});