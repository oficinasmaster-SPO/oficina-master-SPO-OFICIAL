import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Verifica se existe conflito de horário para um consultor
 * Retorna atendimentos conflitantes no mesmo horário
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { consultor_id, data_agendada, atendimento_id_editando } = await req.json();

    if (!consultor_id || !data_agendada) {
      return Response.json({
        erro: 'consultor_id e data_agendada são obrigatórios'
      }, { status: 400 });
    }

    // Buscar atendimentos no mesmo horário para o mesmo consultor
    const atendimentos = await base44.asServiceRole.entities.ConsultoriaAtendimento.filter({
      consultor_id,
      data_agendada,
      status: { $in: ['agendado', 'confirmado', 'participando', 'realizado'] }
    });

    // Se está editando, remover o próprio atendimento da lista
    const conflitos = atendimentos.filter(a => a.id !== atendimento_id_editando);

    if (conflitos.length === 0) {
      return Response.json({
        conflito: false,
        mensagem: 'Horário disponível'
      });
    }

    // Buscar detalhes das oficinas conflitantes
    const detalhesConflitos = await Promise.all(
      conflitos.map(async (atendimento) => {
        try {
          const workshop = await base44.asServiceRole.entities.Workshop.get(atendimento.workshop_id);
          return {
            id: atendimento.id,
            data_agendada: atendimento.data_agendada,
            status: atendimento.status,
            tipo_atendimento: atendimento.tipo_atendimento || 'Não especificado',
            duracao_minutos: atendimento.duracao_minutos || 60,
            workshop: {
              id: workshop.id,
              name: workshop.name,
              city: workshop.city,
              state: workshop.state
            },
            observacoes: atendimento.observacoes
          };
        } catch (err) {
          console.error('Erro ao buscar workshop:', err);
          return {
            id: atendimento.id,
            data_agendada: atendimento.data_agendada,
            status: atendimento.status,
            tipo_atendimento: atendimento.tipo_atendimento || 'Não especificado',
            duracao_minutos: atendimento.duracao_minutos || 60,
            workshop: {
              id: atendimento.workshop_id,
              name: 'Oficina não encontrada'
            }
          };
        }
      })
    );

    return Response.json({
      conflito: true,
      quantidade: conflitos.length,
      atendimentos: detalhesConflitos,
      mensagem: `Já existe${conflitos.length > 1 ? 'm' : ''} ${conflitos.length} atendimento${conflitos.length > 1 ? 's' : ''} agendado${conflitos.length > 1 ? 's' : ''} para este horário`
    });

  } catch (error) {
    console.error('Erro ao verificar conflito:', error);
    return Response.json({
      erro: error.message
    }, { status: 500 });
  }
});