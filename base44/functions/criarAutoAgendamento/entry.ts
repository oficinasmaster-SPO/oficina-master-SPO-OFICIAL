import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { workshop_id, tipo_atendimento_id } = await req.json();

    if (!workshop_id || !tipo_atendimento_id) {
      return Response.json({ 
        error: 'workshop_id e tipo_atendimento_id são obrigatórios' 
      }, { status: 400 });
    }

    // ── Validar que o cliente está tentando agendar para sua própria oficina ──
    const workshop = await base44.entities.Workshop.get(workshop_id);
    if (!workshop) {
      return Response.json({ error: 'Oficina não encontrada' }, { status: 404 });
    }

    if (workshop.id !== user.data?.workshop_id && user.role !== 'admin') {
      return Response.json({ 
        error: 'Você não tem permissão para agendar para esta oficina' 
      }, { status: 403 });
    }

    // ── Buscar regra de agendamento para o plano da oficina ──
    const regraAgendamento = await base44.entities.RegraAgendamento.filter({
      $or: [
        { plan_id: workshop.planoAtual },
        { plan_id: null } // Regra genérica
      ],
      ativo: true
    });

    if (!regraAgendamento || regraAgendamento.length === 0) {
      return Response.json({ 
        error: 'Nenhuma regra de agendamento configurada para este plano' 
      }, { status: 400 });
    }

    const regra = regraAgendamento[0]; // Tomar a primeira regra disponível

    // ── Validar se o tipo_atendimento_id está na sequência ──
    const itemSequencia = regra.sequencia?.find(s => s.tipo_atendimento_id === tipo_atendimento_id);
    if (!itemSequencia) {
      return Response.json({ 
        error: 'Este tipo de atendimento não está permitido para o seu plano' 
      }, { status: 400 });
    }

    // ── Buscar atendimentos já realizados da mesma sequência ──
    const atendimentosRealizados = await base44.entities.ConsultoriaAtendimento.filter({
      workshop_id,
      tipo_atendimento: itemSequencia.nome,
      status: { $in: ['realizado', 'concluido'] }
    });

    const ordemAtendimentos = atendimentosRealizados.length + 1;

    // ── Validar intervalo mínimo de dias (se aplicável) ──
    if (itemSequencia.intervalo_minimo_dias > 0 && atendimentosRealizados.length > 0) {
      const ultimoAtendimento = atendimentosRealizados[atendimentosRealizados.length - 1];
      const diasDesdeUltimo = Math.floor(
        (new Date() - new Date(ultimoAtendimento.data_realizada || ultimoAtendimento.data_agendada)) / 
        (1000 * 60 * 60 * 24)
      );

      if (diasDesdeUltimo < itemSequencia.intervalo_minimo_dias) {
        return Response.json({
          error: `Você precisa aguardar ${itemSequencia.intervalo_minimo_dias - diasDesdeUltimo} dias antes de agendar novamente`,
          bloqueado: true,
          dias_restantes: itemSequencia.intervalo_minimo_dias - diasDesdeUltimo
        }, { status: 409 });
      }
    }

    // ── FASE 2: Atribuir consultor automaticamente ──
    // Buscar o melhor consultor com base em tipo + disponibilidade + prioridade
    let slotEncontrado = null;

    try {
      const atribuicaoResponse = await base44.functions.invoke('atribuirConsultorAutomatico', {
        tipo_atendimento_id,
        workshop_id,
        data_preferida: null, // Cliente não especificou preferência
        data_fim_limite: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });

      if (atribuicaoResponse.data?.success && atribuicaoResponse.data.consultor_id) {
        slotEncontrado = {
          consultor_id: atribuicaoResponse.data.consultor_id,
          consultor_nome: atribuicaoResponse.data.consultor_nome,
          data: atribuicaoResponse.data.data,
          hora: atribuicaoResponse.data.hora,
          prioridade: atribuicaoResponse.data.prioridade
        };
      }
    } catch (e) {
      console.warn('Aviso em atribuirConsultorAutomatico:', e.message);
    }

    if (!slotEncontrado) {
      // ── Nenhum horário disponível — criar solicitação na fila ──
      const solicitacao = await base44.entities.AgendamentoSolicitacao.create({
        workshop_id,
        workshop_nome: workshop.name,
        tipo_atendimento_id,
        tipo_atendimento_nome: itemSequencia.nome,
        status: 'aguardando_vaga',
        data_sugerida_cliente: null,
        hora_sugerida_cliente: null,
        mensagem_cliente: null,
        notificado_vaga_disponivel: false
      });

      return Response.json({
        success: true,
        agendado: false,
        motivo: 'Nenhum horário disponível no período solicitado',
        solicitacao_id: solicitacao.id,
        message: 'Sua solicitação foi adicionada à fila de espera. Você será notificado quando um horário ficar disponível.'
      });
    }

    // ── Criar atendimento com o slot encontrado ──
    const dataAgendada = new Date(`${slotEncontrado.data}T${slotEncontrado.hora}:00`);

    const atendimento = await base44.entities.ConsultoriaAtendimento.create({
      workshop_id,
      consultor_id: slotEncontrado.consultor_id,
      consultor_nome: slotEncontrado.consultor_nome,
      tipo_atendimento: itemSequencia.nome,
      data_agendada: dataAgendada.toISOString(),
      status: 'agendado',
      duracao_minutos: 60,
      fase_oficina: workshop.maturity_level || 1,
      plano_cliente: workshop.planoAtual,
      registro_meta: {
        criado_por_id: user.id,
        criado_por_nome: user.full_name,
        criado_por_cargo: 'cliente',
        criado_para_id: slotEncontrado.consultor_id,
        criado_para_nome: slotEncontrado.consultor_nome,
        origem_tela: 'auto_agendamento',
        criado_em: new Date().toISOString(),
        criado_por_terceiro: false
      }
    });

    return Response.json({
      success: true,
      agendado: true,
      atendimento_id: atendimento.id,
      data_agendada: dataAgendada.toISOString(),
      consultor: slotEncontrado.consultor_nome,
      tipo_atendimento: itemSequencia.nome,
      message: `Atendimento agendado com sucesso para ${slotEncontrado.data} às ${slotEncontrado.hora}`
    });
  } catch (error) {
    console.error('Erro em criarAutoAgendamento:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});