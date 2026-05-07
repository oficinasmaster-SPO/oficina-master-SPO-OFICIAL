import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Busca todas as tarefas abertas e em execução com SLA
    const tarefas = await base44.asServiceRole.entities.TarefaBacklog.filter(
      {
        status: { $in: ['aberta', 'em_execucao'] },
        data_limite_sla: { $ne: null }
      }
    );

    const agora = new Date();
    const alertas = [];
    const escalacoes = [];

    for (const tarefa of tarefas) {
      const dataLimiteSla = new Date(tarefa.data_limite_sla);
      const diffMs = dataLimiteSla - agora;
      const diffHoras = diffMs / (1000 * 60 * 60);

      // ALERTA: SLA vence em menos de 1 hora e ainda não foi alertado
      if (diffHoras < 1 && diffHoras > 0 && !tarefa.sla_alertado) {
        alertas.push(tarefa.id);
        
        // Criar notificação
        await base44.asServiceRole.entities.Notification.create({
          user_id: tarefa.atribuido_para_id || tarefa.consultor_id,
          type: 'sla_warning',
          title: `⚠️ SLA em risco: ${tarefa.titulo}`,
          message: `A tarefa "${tarefa.titulo}" vence seu SLA em menos de 1 hora. Prioridade: ${tarefa.prioridade}`,
          is_read: false
        });

        // Marcar como alertado
        await base44.asServiceRole.entities.TarefaBacklog.update(tarefa.id, {
          sla_alertado: true
        });
      }

      // ESCALAÇÃO: SLA já venceu e ainda não foi escalado
      if (diffHoras <= 0 && !tarefa.sla_escalado) {
        escalacoes.push(tarefa.id);

        // Atualizar tarefa: marcar como escalada e notificar líder
        await base44.asServiceRole.entities.TarefaBacklog.update(tarefa.id, {
          sla_escalado: true,
          status: 'bloqueada',
          motivo_bloqueio: `SLA violado: prazo venceu em ${Math.abs(Math.floor(diffHoras))}h`
        });

        // Notificar líder ou consultor
        const notificadoId = tarefa.lider_id || tarefa.consultor_id;
        if (notificadoId) {
          await base44.asServiceRole.entities.Notification.create({
            user_id: notificadoId,
            type: 'sla_breach',
            title: `🚨 SLA VIOLADO: ${tarefa.titulo}`,
            message: `A tarefa "${tarefa.titulo}" violou o SLA! Status: ${tarefa.status}. Necessário escalonamento.`,
            is_read: false
          });
        }

        // Log de auditoria
        await base44.asServiceRole.entities.TarefaBacklogHistorico.create({
          tarefa_id: tarefa.id,
          usuario_id: null,
          usuario_nome: 'SISTEMA',
          acao: 'BLOQUEIO',
          campo: 'sla',
          valor_anterior: 'SLA OK',
          valor_novo: 'SLA VIOLADO',
          data_hora: new Date().toISOString()
        });
      }
    }

    return Response.json({
      ok: true,
      alertas: alertas.length,
      escalacoes: escalacoes.length,
      tarefas_monitoradas: tarefas.length
    });
  } catch (error) {
    console.error('Erro em checkSlaBreach:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});