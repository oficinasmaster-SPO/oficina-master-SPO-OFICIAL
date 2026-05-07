import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { tarefa_id } = await req.json();

    if (!tarefa_id) {
      return Response.json({ error: 'tarefa_id required' }, { status: 400 });
    }

    const tarefa = await base44.asServiceRole.entities.TarefaBacklog.get(tarefa_id);
    if (!tarefa) {
      return Response.json({ error: 'Tarefa não encontrada' }, { status: 404 });
    }

    const now = new Date();
    const dataLimiteSla = new Date(tarefa.data_limite_sla);

    // Se não está atrasado, não faz nada
    if (now <= dataLimiteSla) {
      return Response.json({ escalado: false, motivo: 'SLA dentro do prazo' });
    }

    // 1º NÍVEL: Notificar líder (se ainda não foi)
    if (!tarefa.sla_escalado_lider) {
      if (tarefa.lider_id) {
        const notification = {
          user_id: tarefa.lider_id,
          workshop_id: tarefa.cliente_id,
          type: 'sla_escalado_lider',
          title: '🔴 SLA ESTOURADO - Escalação para Liderança',
          message: `Tarefa "${tarefa.titulo}" (${tarefa.prioridade}) estourou SLA. Responsável: ${tarefa.atribuido_para_id || 'N/A'}. Horas de atraso: ${Math.round((now - dataLimiteSla) / 3600000)}h`,
          email_sent: false,
          metadata: {
            tarefa_id,
            horas_atraso: Math.round((now - dataLimiteSla) / 3600000),
            nivel: 'lider'
          }
        };

        await base44.asServiceRole.entities.Notification.create(notification);
        
        // Marcar como escalado para líder
        await base44.asServiceRole.entities.TarefaBacklog.update(tarefa_id, {
          sla_escalado_lider: true,
          data_escalacao_lider: new Date().toISOString()
        });

        return Response.json({ 
          escalado: true, 
          nivel: 'lider',
          horas_atraso: Math.round((now - dataLimiteSla) / 3600000)
        });
      }
    }

    // 2º NÍVEL: Escalar para admin (se atrasado há mais de 2h após 1º escalação)
    if (tarefa.sla_escalado_lider && !tarefa.sla_escalado_admin) {
      const dataEscalacaoLider = new Date(tarefa.data_escalacao_lider);
      const minutosDesdePrimeiroEscalonamento = (now - dataEscalacaoLider) / 60000;

      if (minutosDesdePrimeiroEscalonamento >= 120) { // 2 horas
        // Buscar admins da oficina
        const admins = await base44.asServiceRole.entities.User.filter({
          workshop_id: tarefa.cliente_id,
          role: 'admin'
        });

        if (admins && admins.length > 0) {
          for (const admin of admins) {
            const notification = {
              user_id: admin.id,
              workshop_id: tarefa.cliente_id,
              type: 'sla_escalado_admin',
              title: '🚨 EMERGÊNCIA - SLA CRÍTICO',
              message: `ESCALAÇÃO CRÍTICA: "${tarefa.titulo}" está ${Math.round((now - dataLimiteSla) / 3600000)}h atrasado! Líder foi notificado sem resolução.`,
              email_sent: false,
              metadata: {
                tarefa_id,
                horas_atraso: Math.round((now - dataLimiteSla) / 3600000),
                nivel: 'admin'
              }
            };

            await base44.asServiceRole.entities.Notification.create(notification);
          }

          await base44.asServiceRole.entities.TarefaBacklog.update(tarefa_id, {
            sla_escalado_admin: true,
            data_escalacao_admin: new Date().toISOString()
          });

          return Response.json({ 
            escalado: true, 
            nivel: 'admin',
            horas_atraso: Math.round((now - dataLimiteSla) / 3600000),
            admins_notificados: admins.length
          });
        }
      }
    }

    return Response.json({ escalado: false, motivo: 'Aguardando 2h para próximo nível' });
  } catch (error) {
    console.error('Erro ao escalonar SLA:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});