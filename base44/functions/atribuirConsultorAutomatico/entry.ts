import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Função: Atribuir Consultor Automático
 * 
 * Lógica:
 * 1. Buscar GRADE DE HORÁRIOS dos consultores da mesma consultoria
 * 2. Filtrar consultores que fazem o tipo de atendimento solicitado
 * 3. Validar disponibilidade (sem conflitos)
 * 4. Selecionar por PRIORIDADE (slot 1 > slot 2 > slot 3)
 * 5. Retornar: consultor_id, nome, data, hora, prioridade
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const {
      tipo_atendimento_id,
      workshop_id,
      data_preferida,
      data_fim_limite
    } = await req.json();

    if (!tipo_atendimento_id || !workshop_id) {
      return Response.json({
        error: 'tipo_atendimento_id e workshop_id são obrigatórios'
      }, { status: 400 });
    }

    // ── 1. Buscar a oficina (para pegar consulting_firm_id) ──
    const workshop = await base44.entities.Workshop.get(workshop_id);
    if (!workshop) {
      return Response.json({ error: 'Oficina não encontrada' }, { status: 404 });
    }

    // ── 2. Buscar TODAS as grades de horários dos consultores desta consultoria ──
    const todasAsGrades = await base44.entities.HorarioDisponivel.filter({
      consulting_firm_id: workshop.consulting_firm_id,
      ativo: true
    });

    if (!todasAsGrades || todasAsGrades.length === 0) {
      return Response.json({
        success: false,
        motivo: 'Nenhuma grade de horários configurada',
        consultores_disponiveis: []
      });
    }

    // ── 3. Filtrar consultores que fazem este tipo de atendimento ──
    const consultoresValidos = [];
    const consultoresMap = new Map();

    for (const grade of todasAsGrades) {
      // Verificar se algum slot desta grade faz o tipo de atendimento
      const temTipo = grade.horarios?.some(h =>
        !h.tipo_atendimento_ids || h.tipo_atendimento_ids.length === 0 || 
        h.tipo_atendimento_ids.includes(tipo_atendimento_id)
      );

      if (temTipo && !consultoresMap.has(grade.consultor_id)) {
        consultoresMap.set(grade.consultor_id, grade);
        consultoresValidos.push(grade);
      }
    }

    if (consultoresValidos.length === 0) {
      return Response.json({
        success: false,
        motivo: 'Nenhum consultor disponível para este tipo de atendimento',
        consultores_disponiveis: []
      });
    }

    // ── 4. Para cada consultor válido, buscar primeiro slot disponível ──
    const slotsCandidatos = [];

    const dataInicio = data_preferida ? new Date(data_preferida) : new Date();
    const dataFim = data_fim_limite 
      ? new Date(data_fim_limite)
      : new Date(dataInicio.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 dias padrão

    for (const grade of consultoresValidos) {
      // Buscar atendimentos já agendados para este consultor
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

      // Percorrer dias até achar um slot livre
      for (let d = new Date(dataInicio); d <= dataFim; d.setDate(d.getDate() + 1)) {
        const diaSemana = d.getDay();
        const dataStr = d.toISOString().split('T')[0];

        const horariosNoDia = grade.horarios?.filter(h => h.ativo) || [];
        
        // Ordenar por prioridade (crescente = maior prioridade)
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

          // Slot encontrado! Adicionar aos candidatos
          slotsCandidatos.push({
            consultor_id: grade.consultor_id,
            consultor_nome: grade.consultor_nome,
            data: dataStr,
            hora: horario.hora,
            prioridade: horario.prioridade || 999,
            dataHora
          });

          // Sair do loop de horários (pegar apenas o primeiro disponível deste dia)
          break;
        }

        // Se encontrou um slot, não procurar em mais dias
        if (slotsCandidatos.some(s => s.consultor_id === grade.consultor_id)) {
          break;
        }
      }
    }

    if (slotsCandidatos.length === 0) {
      return Response.json({
        success: false,
        motivo: 'Nenhum slot disponível no período',
        consultores_disponiveis: consultoresValidos.map(g => ({
          consultor_id: g.consultor_id,
          consultor_nome: g.consultor_nome
        }))
      });
    }

    // ── 5. SELECIONAR: Ordenar por prioridade (menor = melhor) e depois por consultor ──
    const melhorSlot = slotsCandidatos.sort((a, b) => {
      if (a.prioridade !== b.prioridade) {
        return a.prioridade - b.prioridade; // Prioridade crescente = melhor
      }
      return a.consultor_nome.localeCompare(b.consultor_nome); // Tie-breaker alfabético
    })[0];

    console.log(`✅ Consultor atribuído automaticamente: ${melhorSlot.consultor_nome} em ${melhorSlot.dataHora}`);

    return Response.json({
      success: true,
      consultor_id: melhorSlot.consultor_id,
      consultor_nome: melhorSlot.consultor_nome,
      data: melhorSlot.data,
      hora: melhorSlot.hora,
      prioridade: melhorSlot.prioridade,
      dataHora: melhorSlot.dataHora,
      motivo: `Consultor selecionado automaticamente com base em disponibilidade e prioridade`
    });
  } catch (error) {
    console.error('Erro em atribuirConsultorAutomatico:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});