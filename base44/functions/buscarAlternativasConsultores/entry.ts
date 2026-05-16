import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Busca alternativas de consultores com disponibilidade
 * Usada quando o consultor original não tem slot disponível
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const {
      tipo_atendimento_id,
      data_preferida,
      consultor_id_excluir,
      consulting_firm_id,
      data_fim_limite
    } = await req.json();

    if (!tipo_atendimento_id || !data_preferida || !consulting_firm_id) {
      return Response.json({
        error: 'tipo_atendimento_id, data_preferida e consulting_firm_id são obrigatórios'
      }, { status: 400 });
    }

    // ── Buscar todas as grades de horários da consultoria ──
    const todasAsGrades = await base44.entities.HorarioDisponivel.filter({
      consulting_firm_id,
      ativo: true
    });

    if (!todasAsGrades || todasAsGrades.length === 0) {
      return Response.json({
        success: true,
        alternativas: []
      });
    }

    // ── Filtrar consultores que fazem este tipo de atendimento (excluindo o original) ──
    const consultoresValidos = todasAsGrades.filter(grade => {
      if (grade.consultor_id === consultor_id_excluir) return false;

      return grade.horarios?.some(h =>
        !h.tipo_atendimento_ids || h.tipo_atendimento_ids.length === 0 ||
        h.tipo_atendimento_ids.includes(tipo_atendimento_id)
      );
    });

    if (consultoresValidos.length === 0) {
      return Response.json({
        success: true,
        alternativas: [],
        motivo: 'Nenhum outro consultor disponível para este tipo'
      });
    }

    // ── Para cada consultor, buscar slots disponíveis na data sugerida ──
    const alternativas = [];
    const dataInicio = new Date(data_preferida);
    const dataFim = data_fim_limite ? new Date(data_fim_limite) : new Date(dataInicio.getTime() + 30 * 24 * 60 * 60 * 1000);

    for (const grade of consultoresValidos) {
      // Buscar atendimentos agendados para este consultor
      const atendimentosAgendados = await base44.entities.ConsultoriaAtendimento.filter({
        consultor_id: grade.consultor_id,
        status: { $in: ['agendado', 'confirmado', 'participando', 'realizado'] }
      });

      const horariosOcupados = new Set(
        atendimentosAgendados.map(a => {
          const [data, hora] = a.data_agendada.split('T');
          return `${data}T${hora.slice(0, 5)}`;
        })
      );

      // Procurar slots disponíveis próximos à data sugerida
      const dataAtual = new Date(dataInicio);
      while (dataAtual <= dataFim) {
        const diaSemana = dataAtual.getDay();
        const dataStr = dataAtual.toISOString().split('T')[0];

        const horariosNoDia = grade.horarios?.filter(h => h.ativo) || [];
        const horariosOrdenados = [...horariosNoDia].sort((a, b) =>
          (a.prioridade || 999) - (b.prioridade || 999)
        );

        for (const horario of horariosOrdenados) {
          // Validar tipo de atendimento
          if (horario.tipo_atendimento_ids && horario.tipo_atendimento_ids.length > 0) {
            if (!horario.tipo_atendimento_ids.includes(tipo_atendimento_id)) continue;
          }

          // Validar disponibilidade
          const dataHora = `${dataStr}T${horario.hora}`;
          if (horariosOcupados.has(dataHora)) continue;

          // Slot encontrado!
          alternativas.push({
            consultor_id: grade.consultor_id,
            consultor_nome: grade.consultor_nome,
            data: dataStr,
            hora: horario.hora,
            prioridade: horario.prioridade || 999,
            distancia_dias: Math.floor((new Date(dataStr) - new Date(dataInicio)) / (24 * 60 * 60 * 1000))
          });

          // Sair do loop de horários (pegar apenas o primeiro disponível deste dia)
          break;
        }

        // Se encontrou um slot para este consultor, não procurar em mais dias
        if (alternativas.some(a => a.consultor_id === grade.consultor_id)) {
          dataAtual.setDate(dataFim.getDate() + 1); // Força saída do while
          break;
        }

        dataAtual.setDate(dataAtual.getDate() + 1);
      }

      // Limitar alternativas a 5 por performance
      if (alternativas.length >= 5) break;
    }

    // ── Ordenar por: proximidade da data > prioridade ──
    const alternativasOrdenadas = alternativas.sort((a, b) => {
      if (a.distancia_dias !== b.distancia_dias) {
        return a.distancia_dias - b.distancia_dias; // Mais próximo primeiro
      }
      return a.prioridade - b.prioridade; // Melhor prioridade depois
    });

    return Response.json({
      success: true,
      alternativas: alternativasOrdenadas.slice(0, 5),
      total_encontradas: alternativasOrdenadas.length
    });

  } catch (error) {
    console.error('Erro em buscarAlternativasConsultores:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});