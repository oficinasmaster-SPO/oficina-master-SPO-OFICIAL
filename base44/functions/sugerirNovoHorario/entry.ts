import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const {
      atendimento_id,
      data_sugerida,
      hora_sugerida,
      mensagem_cliente,
      workshop_id,
      modo_reagendamento
    } = await req.json();

    if (!atendimento_id || !data_sugerida || !hora_sugerida) {
      return Response.json({
        error: 'atendimento_id, data_sugerida e hora_sugerida são obrigatórios'
      }, { status: 400 });
    }

    // ── Validação: Data sugerida deve ser no futuro ──
    const dataSugerida = new Date(`${data_sugerida}T${hora_sugerida}:00`);
    if (dataSugerida <= new Date()) {
      return Response.json({
        error: 'A data e hora sugeridas devem ser no futuro'
      }, { status: 400 });
    }

    // ── Buscar atendimento original ──
    const atendimento = await base44.entities.ConsultoriaAtendimento.get(atendimento_id);
    if (!atendimento) {
      return Response.json({ error: 'Atendimento não encontrado' }, { status: 404 });
    }

    // ── Validação de segurança ──
    if (atendimento.workshop_id !== user.data?.workshop_id && user.role !== 'admin') {
      return Response.json({
        error: 'Você não tem permissão para sugerir horários para este atendimento'
      }, { status: 403 });
    }

    // ── Buscar workshop ──
    const workshop = await base44.entities.Workshop.get(atendimento.workshop_id);
    if (!workshop) {
      return Response.json({ error: 'Oficina não encontrada' }, { status: 404 });
    }

    // ── VALIDAÇÃO 1: Consultor tem disponibilidade na data sugerida? ──
    const atendimentosConsultor = await base44.entities.ConsultoriaAtendimento.filter({
      consultor_id: atendimento.consultor_id,
      status: { $in: ['agendado', 'confirmado', 'participando'] }
    });

    const slotOcupado = atendimentosConsultor.some(a => {
      const dataHoraA = new Date(a.data_agendada);
      return (
        dataHoraA.toISOString().split('T')[0] === data_sugerida &&
        dataHoraA.toTimeString().slice(0, 5) === hora_sugerida
      );
    });

    let alternativas = [];
    if (slotOcupado) {
      // ── BUSCAR ALTERNATIVAS DE OUTROS CONSULTORES ──
      try {
        const respAlternativas = await base44.functions.invoke('buscarAlternativasConsultores', {
          tipo_atendimento_id: atendimento.tipo_atendimento,
          data_preferida: data_sugerida,
          consultor_id_excluir: atendimento.consultor_id,
          consulting_firm_id: workshop.consulting_firm_id,
          data_fim_limite: new Date(dataSugerida.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        });

        if (respAlternativas.data?.alternativas) {
          alternativas = respAlternativas.data.alternativas;
        }
      } catch (e) {
        console.warn('Erro ao buscar alternativas:', e.message);
      }
    }

    // ── Detectar modo reagendamento: data já passou ou falta < 8h ──
    const agora = new Date();
    const dataAtendimento = new Date(atendimento.data_agendada);
    const diffMs = dataAtendimento - agora;
    const isModoReagendamento = modo_reagendamento || diffMs < 8 * 60 * 60 * 1000;

    // ── Atualizar atendimento com sugestão ──
    // Em modo reagendamento: mantém status atual (aguarda consultor abrir modal de reagendamento)
    // Em modo sugestão normal: marca como reagendado
    await base44.entities.ConsultoriaAtendimento.update(
      atendimento_id,
      {
        data_sugerida_cliente: data_sugerida,
        hora_sugerida_cliente: hora_sugerida,
        mensagem_cliente: mensagem_cliente || '',
        modo_reagendamento_cliente: isModoReagendamento,
        status: isModoReagendamento ? atendimento.status : 'reagendado'
      }
    );

    // ── Notificar admin sobre sugestão ──
    try {
      await base44.functions.invoke('notificarAdminSugestaoHorario', {
        atendimento_id,
        workshop_id,
        data_sugerida,
        hora_sugerida,
        mensagem_cliente,
        consultor_nome: atendimento.consultor_nome,
        slot_disponivel: !slotOcupado,
        alternativas
      });
    } catch (e) {
      console.warn('Erro ao notificar admin:', e.message);
    }

    return Response.json({
      success: true,
      message: slotOcupado
        ? 'Sua sugestão foi enviada. Confira as alternativas abaixo.'
        : 'Sua sugestão foi confirmada! Você receberá uma notificação de confirmação.',
      atendimento_id: atendimento.id,
      data_sugerida,
      hora_sugerida,
      slot_disponivel: !slotOcupado,
      alternativas: slotOcupado ? alternativas : undefined
    });

  } catch (error) {
    console.error('Erro em sugerirNovoHorario:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});