import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // 1. Buscar todos os 87 atendimentos atrasados
    const atrasados = await base44.entities.ConsultoriaAtendimento.filter({
      status: 'atrasado'
    }, '-created_date', 500);

    let processados = 0;
    let erros = 0;

    for (const atend of atrasados) {
      try {
        // 2. Criar tarefa no backlog para reagendamento
        const tarefaBacklog = await base44.entities.TarefaBacklog.create({
          tipo: 'reagendamento_atendimento',
          titulo: `Reagendar: ${atend.consultor_nome} - Cliente ${atend.workshop_id}`,
          descricao: `Atendimento atrasado agendado para ${atend.data_agendada}. Necessário contato e reagendamento com cliente.`,
          status: 'a_fazer',
          prioridade: 'alta',
          workshop_id: atend.workshop_id,
          consultor_id: atend.consultor_id,
          consultor_nome: atend.consultor_nome,
          tipo_atendimento: atend.tipo_atendimento,
          atendimento_id: atend.id,
          assigned_to: [atend.consultor_id],
          due_date: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString(), // próxima semana
          metadata: {
            atendimento_original_id: atend.id,
            data_agendada_original: atend.data_agendada,
            reason: 'Moved from atrasado status to bucket for rescheduling'
          }
        });

        // 3. Marcar atendimento como "aguardando_reagendamento" (move para bucket logicamente)
        await base44.entities.ConsultoriaAtendimento.update(atend.id, {
          status: 'aguardando_reagendamento',
          data_agendada: null,
          motivo_reagendamento: 'Agendamento não realizado - Em fila para reagendamento',
          notificacao_enviada: false
        });

        processados++;
      } catch (itemError) {
        console.error(`Erro ao processar atendimento ${atend.id}:`, itemError);
        erros++;
      }
    }

    // 4. Notificar consultores
    const consultoresUnicos = [...new Set(atrasados.map(a => a.consultor_id))];
    
    for (const consultorId of consultoresUnicos) {
      const tarefasDoConsultor = atrasados.filter(a => a.consultor_id === consultorId).length;
      
      await base44.entities.Notification.create({
        user_id: consultorId,
        type: 'bucket_reagendamento',
        title: '⚠️ Bucket de Reagendamentos',
        message: `${tarefasDoConsultor} atendimento(s) atrasado(s) movido(s) para o bucket. Próxima semana: reagendar esses clientes.`,
        is_read: false,
        metadata: {
          bucket_type: 'reagendamento_atendimento',
          count: tarefasDoConsultor
        }
      });
    }

    return Response.json({
      success: true,
      resumo: {
        total_atrasados: atrasados.length,
        processados,
        erros,
        consultores_notificados: consultoresUnicos.length,
        proxima_semana: '19/05/2026 - 25/05/2026'
      }
    });

  } catch (error) {
    console.error('moveAtrasadosToBucket error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});