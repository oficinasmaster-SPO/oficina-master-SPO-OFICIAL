import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Tabela de SLA por prioridade (em horas)
const SLA_CONFIG = {
  critica: 2,    // 2 horas
  alta: 4,       // 4 horas
  media: 8,      // 8 horas
  baixa: 24      // 24 horas
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { tarefa_id, prioridade, data_criacao } = await req.json();

    if (!tarefa_id || !prioridade || !data_criacao) {
      return Response.json(
        { error: 'Parâmetros obrigatórios: tarefa_id, prioridade, data_criacao' },
        { status: 400 }
      );
    }

    // Calcula prazo SLA em horas baseado em prioridade
    const slaHoras = SLA_CONFIG[prioridade] || SLA_CONFIG.media;

    // Calcula data/hora limite de SLA
    const dataInicio = new Date(data_criacao);
    const dataLimiteSla = new Date(dataInicio.getTime() + slaHoras * 60 * 60 * 1000);

    // Atualiza tarefa com campos calculados
    await base44.asServiceRole.entities.TarefaBacklog.update(tarefa_id, {
      sla_prazo_horas: slaHoras,
      data_limite_sla: dataLimiteSla.toISOString(),
      sla_alertado: false,
      sla_escalado: false
    });

    return Response.json({
      ok: true,
      sla_prazo_horas: slaHoras,
      data_limite_sla: dataLimiteSla.toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});