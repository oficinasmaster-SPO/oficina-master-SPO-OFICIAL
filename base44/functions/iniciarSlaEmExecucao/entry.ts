import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    // Verifica se status mudou para em_execucao e data_inicio_execucao está vazio
    if (data.status !== 'em_execucao' || data.data_inicio_execucao) {
      return Response.json({ skipped: true });
    }

    const agora = new Date();
    
    // Calcula data limite (agora + sla_prazo_horas)
    const slaHoras = data.sla_prazo_horas || 8;
    const dataLimiteSla = new Date(agora.getTime() + slaHoras * 60 * 60 * 1000);

    // Atualiza tarefa
    await base44.asServiceRole.entities.TarefaBacklog.update(data.id, {
      data_inicio_execucao: agora.toISOString(),
      data_limite_sla: dataLimiteSla.toISOString(),
      sla_alertado: false
    });

    return Response.json({ 
      ok: true,
      tarefa_id: data.id,
      data_inicio: agora.toISOString(),
      data_limite: dataLimiteSla.toISOString(),
      sla_horas: slaHoras
    });
  } catch (error) {
    console.error('Erro em iniciarSlaEmExecucao:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});