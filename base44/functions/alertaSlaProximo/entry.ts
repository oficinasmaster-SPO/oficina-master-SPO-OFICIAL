import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Busca tarefas não concluídas com SLA definido
    const tarefas = await base44.asServiceRole.entities.TarefaBacklog.filter({
      status: { $ne: 'concluida' },
      sla_alertado: false,
      data_limite_sla: { $exists: true }
    }, '-created_date', 100);

    const agora = new Date();
    const proximasMeia = new Date(agora.getTime() + 30 * 60000); // 30 minutos à frente
    const notificacoesCriadas = [];

    for (const tarefa of tarefas) {
      if (!tarefa.data_limite_sla) continue;

      const dataLimite = new Date(tarefa.data_limite_sla);
      
      // Se SLA vence em menos de 30 minutos
      if (dataLimite <= proximasMeia && dataLimite > agora) {
        // Criar notificação
        if (tarefa.atribuido_para_id) {
          await base44.asServiceRole.entities.Notification.create({
            user_id: tarefa.atribuido_para_id,
            workshop_id: tarefa.cliente_id,
            type: 'alerta_sla',
            title: '⚠️ SLA Próximo de Expirar',
            message: `A tarefa "${tarefa.titulo}" vence em menos de 30 minutos!`,
            email_sent: false,
            metadata: {
              tarefa_id: tarefa.id,
              tempo_restante_minutos: Math.round((dataLimite - agora) / 60000)
            }
          });

          // Marcar como alertado
          await base44.asServiceRole.entities.TarefaBacklog.update(tarefa.id, {
            sla_alertado: true
          });

          notificacoesCriadas.push({
            tarefa_id: tarefa.id,
            usuario_id: tarefa.atribuido_para_id,
            minutos_restantes: Math.round((dataLimite - agora) / 60000)
          });
        }
      }
    }

    return Response.json({ 
      alertas_criados: notificacoesCriadas.length,
      detalhes: notificacoesCriadas 
    });
  } catch (error) {
    console.error('Erro em alertaSlaProximo:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});