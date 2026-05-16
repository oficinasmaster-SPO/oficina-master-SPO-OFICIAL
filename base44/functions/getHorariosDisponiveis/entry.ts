import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { consultor_id, data_inicio, data_fim, tipo_atendimento_id } = await req.json();

    if (!consultor_id) {
      return Response.json({ error: 'consultor_id é obrigatório' }, { status: 400 });
    }

    // ── Buscar grade de horários do consultor ──
    const horariosBase = await base44.entities.HorarioDisponivel.filter({
      consultor_id,
      ativo: true
    });

    if (!horariosBase || horariosBase.length === 0) {
      return Response.json({ error: 'Nenhum horário configurado para este consultor' }, { status: 404 });
    }

    // ── Gerar slots para o período ──
    const inicio = data_inicio ? new Date(data_inicio) : new Date();
    const fim = data_fim ? new Date(data_fim) : new Date(inicio.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 dias padrão

    const slots = [];

    for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
      const diaSemana = d.getDay(); // 0=domingo, 6=sábado
      const dataStr = d.toISOString().split('T')[0];

      const horariosNoDia = horariosBase.find(h => h.dia_semana === diaSemana);
      if (!horariosNoDia || !horariosNoDia.horarios) continue;

      // Ordenar por prioridade (crescente = menor número = maior prioridade)
      const horariosOrdenados = [...horariosNoDia.horarios].sort((a, b) => a.prioridade - b.prioridade);

      for (const horario of horariosOrdenados) {
        if (!horario.ativo) continue;

        // Filtrar por tipo_atendimento_id se fornecido
        if (tipo_atendimento_id && horario.tipo_atendimento_ids?.length > 0) {
          if (!horario.tipo_atendimento_ids.includes(tipo_atendimento_id)) continue;
        }

        slots.push({
          data: dataStr,
          hora: horario.hora,
          prioridade: horario.prioridade,
          dataHora: `${dataStr}T${horario.hora}:00`,
          tipo_atendimento_ids: horario.tipo_atendimento_ids || []
        });
      }
    }

    // ── Buscar atendimentos já agendados para este consultor ──
    const atendimentosAgendados = await base44.entities.ConsultoriaAtendimento.filter({
      consultor_id,
      status: {
        $in: ['agendado', 'confirmado', 'participando']
      }
    });

    const horariosOcupados = new Set(
      atendimentosAgendados.map(a => a.data_agendada?.split('T')[0] + 'T' + a.data_agendada?.split('T')[1]?.slice(0, 5))
    );

    // ── Filtrar slots disponíveis ──
    const slotsDisponiveis = slots.filter(slot => !horariosOcupados.has(slot.dataHora));

    return Response.json({
      success: true,
      slots: slotsDisponiveis,
      total: slotsDisponiveis.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});