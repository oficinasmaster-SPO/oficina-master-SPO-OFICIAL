import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { workshop_id } = body;

    const isGlobal = !workshop_id;

    const hoje = new Date();
    const hojeDate = hoje.toISOString().split('T')[0];
    const dois_dias_atras = new Date(hoje.getTime() - 2 * 24 * 60 * 60 * 1000);
    const dois_dias_atrasDate = dois_dias_atras.toISOString().split('T')[0];

    console.log(`[getRiscosOportunidadesAnalise] Modo: ${isGlobal ? 'GLOBAL' : 'workshop=' + workshop_id}`);

    // 1. FollowUps Atrasados
    const followupsFilter = isGlobal
      ? { is_completed: false, reminder_date: { '$lt': hojeDate } }
      : { workshop_id, is_completed: false, reminder_date: { '$lt': hojeDate } };

    const followupsAtrasados = await base44.asServiceRole.entities.FollowUpReminder.filter(
      followupsFilter, '-reminder_date', 500
    );

    // 2. Contratos recém ativados sem ATA
    const contratosFilter = isGlobal
      ? { activated_at: { '$gte': dois_dias_atrasDate } }
      : { workshop_id, activated_at: { '$gte': dois_dias_atrasDate } };

    const contratos_recentes = await base44.asServiceRole.entities.Contract.filter(
      contratosFilter, '-activated_at', 200
    );

    const atasFilter = isGlobal ? {} : { workshop_id };
    const atas_por_workshop = await base44.asServiceRole.entities.MeetingMinutes.filter(
      atasFilter, '-meeting_date', 1000
    );

    const contratos_sem_ata = contratos_recentes.filter(c => {
      const atas_do_contrato = atas_por_workshop.filter(a =>
        a.workshop_id === c.workshop_id &&
        new Date(a.meeting_date) >= new Date(c.activated_at)
      );
      return atas_do_contrato.length === 0;
    });

    // 3. Atendimentos Atrasados
    const atendimentosFilter = isGlobal
      ? { status: { '$in': ['atrasado', 'faltou'] } }
      : { workshop_id, status: { '$in': ['atrasado', 'faltou'] } };

    const atendimentos_atrasados = await base44.asServiceRole.entities.ConsultoriaAtendimento.filter(
      atendimentosFilter, '-data_realizada', 200
    );

    // 4. Próximos Passos Atrasados — calcula por data real (prazo < hoje e não finalizado/cancelado)
    let proximos_atrasados = [];
    try {
      const proximosFilter = isGlobal
        ? { status: { '$nin': ['finalizado', 'cancelado'] }, prazo: { '$lt': hojeDate } }
        : { workshop_id, status: { '$nin': ['finalizado', 'cancelado'] }, prazo: { '$lt': hojeDate } };

      proximos_atrasados = await base44.asServiceRole.entities.ConsultoriaProximoPasso.filter(
        proximosFilter, '-prazo', 500
      );
    } catch (error) {
      console.warn('[getRiscosOportunidadesAnalise] ConsultoriaProximoPasso:', error.message);
    }

    // 5. Cronograma Atrasado
    const cronogramaFilter = isGlobal
      ? { status: { '$ne': 'concluido' }, data_termino_previsto: { '$lt': hojeDate } }
      : { workshop_id, status: { '$ne': 'concluido' }, data_termino_previsto: { '$lt': hojeDate } };

    const cronograma_atrasado = await base44.asServiceRole.entities.CronogramaImplementacao.filter(
      cronogramaFilter, '-data_termino_previsto', 200
    );

    // 6. Cronograma não iniciado
    const cronogramaNaoIniciadoFilter = isGlobal
      ? { status: 'a_fazer', data_termino_previsto: { '$lt': hojeDate } }
      : { workshop_id, status: 'a_fazer', data_termino_previsto: { '$lt': hojeDate } };

    const cronograma_nao_iniciado = await base44.asServiceRole.entities.CronogramaImplementacao.filter(
      cronogramaNaoIniciadoFilter, '-data_termino_previsto', 200
    );

    // 7. Sprints em Atraso — combina: status=overdue OU (end_date vencido e não completed)
    // Busca em duas passagens para cobrir ambos os casos
    const sprintsOverdueFilter = isGlobal
      ? { status: 'overdue' }
      : { workshop_id, status: 'overdue' };

    const sprintsByDateFilter = isGlobal
      ? { status: { '$nin': ['completed', 'overdue'] }, end_date: { '$lt': hojeDate } }
      : { workshop_id, status: { '$nin': ['completed', 'overdue'] }, end_date: { '$lt': hojeDate } };

    const [sprintsOverdue, sprintsByDate] = await Promise.all([
      base44.asServiceRole.entities.ConsultoriaSprint.filter(sprintsOverdueFilter, '-end_date', 500),
      base44.asServiceRole.entities.ConsultoriaSprint.filter(sprintsByDateFilter, '-end_date', 500).catch(() => [])
    ]);

    // Deduplicar por ID
    const sprintsMap = new Map();
    [...sprintsOverdue, ...sprintsByDate].forEach(s => sprintsMap.set(s.id, s));
    const sprints_atrasadas = Array.from(sprintsMap.values());

    // ── DEDUPLICAR follow-ups por cliente (1 entrada por workshop) ──
    const followupPorCliente = {};
    for (const f of followupsAtrasados) {
      const wsId = f.workshop_id;
      if (!wsId) continue;
      const dias = Math.floor((hoje - new Date(f.reminder_date)) / (1000 * 60 * 60 * 24));
      if (!followupPorCliente[wsId]) {
        followupPorCliente[wsId] = {
          id: wsId,
          workshop_name: f.workshop_name || wsId,
          qtd_followups: 0,
          pior_atraso: 0,
          consultor_nome: f.consultor_nome || ''
        };
      }
      followupPorCliente[wsId].qtd_followups += 1;
      if (dias > followupPorCliente[wsId].pior_atraso) {
        followupPorCliente[wsId].pior_atraso = dias;
        if (f.consultor_nome) followupPorCliente[wsId].consultor_nome = f.consultor_nome;
      }
    }
    const followupClientesUnicos = Object.values(followupPorCliente)
      .sort((a, b) => b.pior_atraso - a.pior_atraso);

    // ── LOOKUP de workshops ──
    const workshopsMap = {};

    // 1. Pré-popular com nomes dos follow-ups (que já têm workshop_name em cache)
    for (const [wsId, data] of Object.entries(followupPorCliente)) {
      if (data.workshop_name && data.workshop_name !== wsId) {
        workshopsMap[wsId] = data.workshop_name;
      }
    }

    // 2. Coletar IDs que ainda não têm nome
    const wsIdsParaBuscar = [...new Set([
      ...contratos_sem_ata.map(c => c.workshop_id),
      ...atendimentos_atrasados.map(a => a.workshop_id),
      ...proximos_atrasados.map(p => p.workshop_id),
      ...cronograma_atrasado.map(c => c.workshop_id),
      ...cronograma_nao_iniciado.map(c => c.workshop_id),
      ...sprints_atrasadas.map(s => s.workshop_id),
      ...(workshop_id ? [workshop_id] : [])
    ].filter(Boolean))].filter(id => !workshopsMap[id]);

    // 3. Buscar todos os workshops de uma vez (até 500) e mapear por ID
    if (wsIdsParaBuscar.length > 0) {
      try {
        const todosWorkshops = await base44.asServiceRole.entities.Workshop.list('name', 500);
        todosWorkshops.forEach(w => {
          if (w.id && w.name) workshopsMap[w.id] = w.name;
        });
      } catch (e) {
        console.warn('Workshop lookup error:', e.message);
      }

      // 4. Para IDs que ainda não foram resolvidos, buscar individualmente
      for (const wsId of wsIdsParaBuscar) {
        if (!workshopsMap[wsId]) {
          try {
            const ws = await base44.asServiceRole.entities.Workshop.get(wsId);
            if (ws?.name) workshopsMap[wsId] = ws.name;
          } catch (e) {
            // mantém o ID como fallback
          }
        }
      }
    }

    const getName = (wsId) => workshopsMap[wsId] || wsId || 'Workshop';

    console.log(`[getRiscosOportunidadesAnalise] Workshops no cache: ${Object.keys(workshopsMap).length}`);

    const riscos = [
      {
        id: 'followup_atrasado',
        categoria: 'followup_atrasado',
        titulo: 'FUP Atrasados',
        descricao: 'Clientes com follow-ups vencidos na fila CRM',
        severidade: 'critico',
        total: followupClientesUnicos.length,
        clientes: followupClientesUnicos.map(c => ({
          id: c.id,
          name: c.workshop_name,
          consultor_nome: c.consultor_nome,
          dias_followup_atrasado: c.pior_atraso,
          detalhes: `${c.qtd_followups} FUP(s) em atraso`
        }))
      },
      {
        id: 'onboarding_risco',
        categoria: 'onboarding_risco',
        titulo: 'Recém Cadastrados sem Reunião',
        descricao: 'Contratos ativados recentemente sem ATA',
        severidade: 'critico',
        total: contratos_sem_ata.length,
        clientes: contratos_sem_ata.map(c => ({
          id: c.workshop_id,
          name: getName(c.workshop_id),
          dias_restantes: 2 - Math.floor((hoje - new Date(c.activated_at)) / (1000 * 60 * 60 * 24)),
          contrato_id: c.id
        }))
      },
      {
        id: 'atendimentos_atrasados',
        categoria: 'atendimentos_atrasados',
        titulo: 'Atendimentos Atrasados',
        descricao: 'Atendimentos não realizados no prazo',
        severidade: 'alto',
        total: atendimentos_atrasados.length,
        clientes: atendimentos_atrasados.map(a => ({
          id: a.workshop_id,
          name: getName(a.workshop_id),
          tipo: a.tipo_atendimento,
          status: a.status,
          data_agendada: a.data_agendada
        }))
      },
      {
        id: 'proximos_passos_atrasados',
        categoria: 'proximos_passos_atrasados',
        titulo: 'Próximos Passos Atrasados',
        descricao: 'Tarefas de ação com prazo vencido — responsabilidade do cliente',
        severidade: 'alto',
        total: proximos_atrasados.length,
        clientes: proximos_atrasados.map(p => ({
          id: p.workshop_id,
          name: getName(p.workshop_id),
          titulo: p.titulo,
          prazo: p.prazo,
          responsavel: p.responsavel_nome,
          dias_atrasado: p.prazo ? Math.floor((hoje - new Date(p.prazo)) / (1000 * 60 * 60 * 24)) : 0
        })),
        engajamento_cliente: true
      },
      {
        id: 'cronograma_atrasado',
        categoria: 'cronograma_atrasado',
        titulo: 'Cronograma Atrasado',
        descricao: 'Itens do cronograma com prazo vencido',
        severidade: 'alto',
        total: cronograma_atrasado.length,
        clientes: cronograma_atrasado.map(c => ({
          id: c.workshop_id,
          name: getName(c.workshop_id),
          item: c.item_nome,
          dias_atrasado: Math.floor((hoje - new Date(c.data_termino_previsto)) / (1000 * 60 * 60 * 24)),
          status: c.status
        }))
      },
      {
        id: 'cronograma_nao_iniciado',
        categoria: 'cronograma_nao_iniciado',
        titulo: 'Cronograma não Iniciado',
        descricao: 'Itens que não foram iniciados e estão atrasados',
        severidade: 'alto',
        total: cronograma_nao_iniciado.length,
        clientes: cronograma_nao_iniciado.map(c => ({
          id: c.workshop_id,
          name: getName(c.workshop_id),
          item: c.item_nome,
          dias_atrasado: Math.floor((hoje - new Date(c.data_termino_previsto)) / (1000 * 60 * 60 * 24)),
          tipo: c.item_tipo
        }))
      },
      {
        id: 'sprints_atrasadas',
        categoria: 'sprints_atrasadas',
        titulo: 'Sprints em Atraso',
        descricao: 'Sprints de consultoria com data de fim vencida — responsabilidade do cliente',
        severidade: 'critico',
        total: sprints_atrasadas.length,
        clientes: sprints_atrasadas.map(s => ({
          id: s.workshop_id,
          name: getName(s.workshop_id),
          sprint_title: s.title,
          dias_atrasado: Math.floor((hoje - new Date(s.end_date)) / (1000 * 60 * 60 * 24)),
          mission: s.mission_id,
          sprint_number: s.sprint_number
        })),
        engajamento_cliente: true
      }
    ].filter(r => r.total > 0);

    // Oportunidades: apenas no modo individual
    const oportunidades = [];
    if (!isGlobal) {
      try {
        const employees = await base44.asServiceRole.entities.Employee.filter(
          { workshop_id }, '-created_date', 1000
        );
        const ws = workshopsMap[workshop_id];
        const colaboradoresNaoSocios = employees.filter(emp => emp.user_id);
        if (colaboradoresNaoSocios.length === 0) {
          oportunidades.push({
            id: 'sem_colaboradores',
            categoria: 'sem_colaboradores',
            titulo: 'Cadastro de Colaboradores',
            descricao: `Workshop com plano ativo mas sem colaboradores não-sócios.`,
            total: 1,
            acao: 'Convidar colaboradores para potencializar o time'
          });
        }
      } catch (e) {
        console.warn('Oportunidades check error:', e.message);
      }
    }

    // ── Consolidar clientes ÚNICOS em risco (deduplicado por workshop_id) ──
    const clientesMap = {};
    for (const risco of riscos) {
      for (const cliente of (risco.clientes || [])) {
        const key = cliente.id;
        if (!key) continue;
        if (!clientesMap[key]) {
          clientesMap[key] = { id: key, name: cliente.name, riscos: [] };
        }
        clientesMap[key].riscos.push({
          tipo: risco.categoria,
          titulo: risco.titulo,
          detalhe: cliente.detalhes || cliente.dias_atrasado || cliente.dias_restantes
        });
      }
    }

    const clientesEmRiscoUnicos = Object.keys(clientesMap).length;

    // ── TAXA PRÓXIMOS PASSOS ──
    // Base: clientes que têm PELO MENOS 1 próximo passo (atrasado ou não)
    // Métrica: % de clientes com PP atrasado / total de clientes com PP
    let taxaProximosPassos = 0;
    let totalClientesComPP = 0;
    let clientesComPPAtrasado = 0;
    try {
      const todosPPFilter = isGlobal
        ? { status: { '$nin': ['finalizado', 'cancelado'] } }
        : { workshop_id, status: { '$nin': ['finalizado', 'cancelado'] } };

      const todosPP = await base44.asServiceRole.entities.ConsultoriaProximoPasso.filter(
        todosPPFilter, '', 1000
      );

      // Clientes únicos que TÊM pelo menos 1 PP ativo
      const clientesComPPSet = new Set(todosPP.map(p => p.workshop_id).filter(Boolean));
      totalClientesComPP = clientesComPPSet.size;

      // Clientes únicos que têm PP atrasado
      const clientesPPAtrasadoSet = new Set(proximos_atrasados.map(p => p.workshop_id).filter(Boolean));
      clientesComPPAtrasado = clientesPPAtrasadoSet.size;

      if (totalClientesComPP > 0) {
        taxaProximosPassos = Math.min(100, Math.round((clientesComPPAtrasado / totalClientesComPP) * 100));
      }
      console.log(`[PP] Total com PP: ${totalClientesComPP}, Atrasados: ${clientesComPPAtrasado}, Taxa: ${taxaProximosPassos}%`);
    } catch (e) {
      console.warn('Taxa PP error:', e.message);
    }

    // ── TAXA SPRINTS ENGAJAMENTO ──
    // Base: clientes que têm sprint ativa (não completed)
    // Desengajado = sem last_activity_date OU last_activity_date há mais de 7 dias
    // Métrica: % de clientes desengajados / total de clientes com sprint ativa
    let taxaSprintsDesengajamento = 0;
    let totalClientesComSprint = 0;
    let clientesSprintDesengajados = 0;
    try {
      const seteDiasAtras = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);

      const sprintsAtivasFilter = isGlobal
        ? { status: { '$nin': ['completed'] } }
        : { workshop_id, status: { '$nin': ['completed'] } };

      const sprintsAtivas = await base44.asServiceRole.entities.ConsultoriaSprint.filter(
        sprintsAtivasFilter, '', 1000
      );

      // Uma sprint ativa por workshop — pegar a mais recente por workshop
      const sprintPorWorkshop = {};
      for (const s of sprintsAtivas) {
        if (!s.workshop_id) continue;
        if (!sprintPorWorkshop[s.workshop_id]) {
          sprintPorWorkshop[s.workshop_id] = s;
        } else {
          // Manter a sprint com last_activity_date mais recente (ou a mais nova)
          const existente = sprintPorWorkshop[s.workshop_id];
          const dataExistente = existente.last_activity_date ? new Date(existente.last_activity_date) : new Date(0);
          const dataAtual = s.last_activity_date ? new Date(s.last_activity_date) : new Date(0);
          if (dataAtual > dataExistente) {
            sprintPorWorkshop[s.workshop_id] = s;
          }
        }
      }

      totalClientesComSprint = Object.keys(sprintPorWorkshop).length;

      // Desengajado: sem atividade nos últimos 7 dias
      for (const [wsId, sprint] of Object.entries(sprintPorWorkshop)) {
        const ultimaAtividade = sprint.last_activity_date ? new Date(sprint.last_activity_date) : null;
        if (!ultimaAtividade || ultimaAtividade < seteDiasAtras) {
          clientesSprintDesengajados++;
        }
      }

      if (totalClientesComSprint > 0) {
        taxaSprintsDesengajamento = Math.min(100, Math.round((clientesSprintDesengajados / totalClientesComSprint) * 100));
      }
      console.log(`[Sprints] Total com sprint ativa: ${totalClientesComSprint}, Desengajados (+7d): ${clientesSprintDesengajados}, Taxa: ${taxaSprintsDesengajamento}%`);
    } catch (e) {
      console.warn('Taxa sprints error:', e.message);
    }

    // ── TAXA DE RISCO GERAL ──
    // Base: workshops ativos com plano que contempla atendimento (tem PlanAttendanceRule)
    let taxaRisco = 0;
    let totalClientesAtivos = 0;
    try {
      // Buscar planos que têm pelo menos 1 regra de atendimento
      const planRules = await base44.asServiceRole.entities.PlanAttendanceRule.filter(
        { is_active: true }, '', 500
      );
      const planosComAtendimento = [...new Set(planRules.map(r => r.plan_id).filter(Boolean))];

      // Workshops ativos cujo plano está na lista
      const workshopsAtivosArr = await base44.asServiceRole.entities.Workshop.filter(
        isGlobal
          ? { status: 'ativo', planStatus: { '$in': ['active', 'trial'] } }
          : { id: workshop_id },
        '', 1000
      );

      // Filtrar apenas os que têm plano com atendimento
      const clientesComPlano = workshopsAtivosArr.filter(w =>
        planosComAtendimento.includes(w.planoAtual)
      );

      totalClientesAtivos = clientesComPlano.length;
      if (totalClientesAtivos > 0) {
        taxaRisco = Math.min(100, Math.round((clientesEmRiscoUnicos / totalClientesAtivos) * 100));
      }
      console.log(`[Taxa Risco] Planos com atendimento: ${planosComAtendimento.join(',')}, Clientes ativos: ${totalClientesAtivos}, Em risco: ${clientesEmRiscoUnicos}, Taxa: ${taxaRisco}%`);
    } catch (e) {
      console.warn('Taxa risco error:', e.message);
    }

    // Severidade por taxa
    const getSeveridade = (taxa) => {
      if (taxa <= 15) return { label: 'Saudável', nivel: 'saudavel' };
      if (taxa <= 40) return { label: 'Alerta', nivel: 'alerta' };
      return { label: 'Crítico', nivel: 'critico' };
    };

    console.log(`[getRiscosOportunidadesAnalise] FINAL: ${riscos.length} categorias, ${clientesEmRiscoUnicos} clientes únicos em risco, taxa geral ${taxaRisco}%`);

    return Response.json({
      riscos,
      oportunidades,
      estatisticas: {
        clientes_em_risco: clientesEmRiscoUnicos,
        total_oportunidades: oportunidades.length,
        taxa_risco_percentual: taxaRisco,
        total_clientes_ativos: totalClientesAtivos,
        modo: isGlobal ? 'global' : 'individual',
        // Métricas separadas por card
        proximos_passos: {
          taxa_atraso: taxaProximosPassos,
          total_com_pp: totalClientesComPP,
          clientes_atrasados: clientesComPPAtrasado,
          severidade: getSeveridade(taxaProximosPassos)
        },
        sprints: {
          taxa_desengajamento: taxaSprintsDesengajamento,
          total_com_sprint: totalClientesComSprint,
          clientes_desengajados: clientesSprintDesengajados,
          severidade: getSeveridade(taxaSprintsDesengajamento)
        }
      },
      consolidacao: clientesMap
    });

  } catch (error) {
    console.error('[getRiscosOportunidadesAnalise] Erro fatal:', error);
    return Response.json({
      error: error.message,
      riscos: [],
      oportunidades: [],
      estatisticas: { clientes_em_risco: 0, total_oportunidades: 0, taxa_risco_percentual: 0 },
      consolidacao: {}
    }, { status: 500 });
  }
});