import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Verifica se existe conflito de horário para um consultor
 * Retorna atendimentos conflitantes no mesmo horário
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { consultor_id, data_agendada, duracao_minutos = 60, atendimento_id_editando } = await req.json();

    if (!consultor_id || !data_agendada) {
      return Response.json({
        erro: 'consultor_id e data_agendada são obrigatórios'
      }, { status: 400 });
    }

    const dataInicio = new Date(data_agendada);
    const dataFim = new Date(dataInicio.getTime() + (duracao_minutos * 60000));

    const startOfDay = new Date(dataInicio);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dataInicio);
    endOfDay.setHours(23, 59, 59, 999);

    // Buscar atendimentos no mesmo dia para o mesmo consultor
    const atendimentos = await base44.asServiceRole.entities.ConsultoriaAtendimento.filter({
      consultor_id,
      data_agendada: { $gte: startOfDay.toISOString(), $lte: endOfDay.toISOString() },
      status: { $in: ['agendado', 'confirmado', 'participando', 'realizado', 'atrasado'] }
    });

    // Se está editando, remover o próprio atendimento da lista
    const conflitos = atendimentos.filter(a => {
      if (a.id === atendimento_id_editando) return false;
      
      const existingStart = new Date(a.data_agendada);
      const existingEnd = new Date(existingStart.getTime() + (a.duracao_minutos || 60) * 60000);

      // Conflito: novo início é antes do fim existente E novo fim é depois do início existente
      return dataInicio < existingEnd && dataFim > existingStart;
    });

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