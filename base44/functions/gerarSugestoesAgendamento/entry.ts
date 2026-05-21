import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      consultor_id,
      consultor_nome,
      data_inicio,       // "2026-05-26"
      dias_a_frente = 7, // quantos dias de janela gerar
      max_por_dia = 2,   // capacidade máxima por dia
      horarios_disponiveis = ["09:00", "14:00"] // slots padrão
    } = body;

    const resolvedConsultorId = consultor_id || user.id;
    const resolvedConsultorNome = consultor_nome || user.full_name || 'Consultor';

    // Valida que o consultor passado existe na lista real (Employee da Oficinas Master)
    const OFICINAS_MASTER_ID = '695408b3ed74bfeb60d708c0';
    const employeesConsultores = await base44.asServiceRole.entities.Employee.filter(
      { workshop_id: OFICINAS_MASTER_ID, status: 'ativo' }, null, 200
    );
    const consultorValido = employeesConsultores.some(e => e.user_id === resolvedConsultorId);
    if (!consultorValido && resolvedConsultorId !== user.id) {
      return Response.json({ error: 'Consultor inválido — não encontrado na lista de consultores ativos' }, { status: 400 });
    }

    // 🔗 Busca horários da Grade do consultor (ignora horarios_disponiveis do body)
    const gradeConsultor = await base44.asServiceRole.entities.HorarioDisponivel.filter(
      { consultor_id: resolvedConsultorId }
    );
    const horariosGrade = new Set();
    gradeConsultor.forEach(dia => {
      if (!dia.ativo) return;
      (dia.horarios || []).forEach(h => { if (h.ativo) horariosGrade.add(h.hora); });
    });
    // Se sem grade configurada, usa o fallback do body ou padrão
    const horarios_disponiveis_final = horariosGrade.size > 0
      ? Array.from(horariosGrade).sort()
      : (horarios_disponiveis?.length > 0 ? horarios_disponiveis : ["09:00", "14:00"]);

    // === 1. Busca todos os workshops com contrato ativo ===
    const workshops = await base44.asServiceRole.entities.Workshop.filter(
      { status: 'ativo' }, '-created_date', 500
    );

    // === 2. Busca ContractAttendances pendentes ===
    const contractAttendances = await base44.asServiceRole.entities.ContractAttendance.filter(
      { status: { $in: ['pendente', 'agendado'] } }, '-scheduled_date', 2000
    );

    // === 3. Busca ConsultoriaAtendimentos recentes (últimos 90 dias) ===
    const noventa_dias_atras = new Date();
    noventa_dias_atras.setDate(noventa_dias_atras.getDate() - 90);
    const atendimentos = await base44.asServiceRole.entities.ConsultoriaAtendimento.filter(
      { data_agendada: { $gte: noventa_dias_atras.toISOString() } }, '-data_agendada', 2000
    );

    // === 4. Busca tipos de atendimento reais cadastrados ===
    const tiposAtendimento = await base44.asServiceRole.entities.TipoAtendimentoConsultoria.list();
    // A entidade usa o campo "label" (não "nome") — usar label com fallback
    const nomesTipos = tiposAtendimento.map(t => t.label || t.nome).filter(Boolean);

    // Helper: encontra o tipo mais parecido na lista real (case-insensitive)
    const resolverTipo = (nomeDesejado) => {
      if (!nomeDesejado || nomesTipos.length === 0) return nomesTipos[0] || 'Acompanhamento';
      const exato = nomesTipos.find(n => n.toLowerCase() === nomeDesejado.toLowerCase());
      if (exato) return exato;
      const parcial = nomesTipos.find(n =>
        n.toLowerCase().includes(nomeDesejado.toLowerCase()) ||
        nomeDesejado.toLowerCase().includes(n.toLowerCase())
      );
      return parcial || nomesTipos[0] || nomeDesejado;
    };

    // === 5. Busca sugestões pendentes já existentes para evitar duplicatas ===
    const sugestoesExistentes = await base44.asServiceRole.entities.SugestaoAgendamento.filter(
      { status: { $in: ['pendente', 'aprovado'] } }, '-created_date', 500
    );
    const workshopsComSugestaoAtiva = new Set(sugestoesExistentes.map(s => s.workshop_id));

    // === 6. Calcula score de prioridade para cada workshop ===
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const scoredWorkshops = workshops
      .filter(w => !workshopsComSugestaoAtiva.has(w.id))
      .map(w => {
        const wAtendimentos = atendimentos.filter(a => a.workshop_id === w.id);
        const wBuckets = contractAttendances.filter(ca => ca.workshop_id === w.id);

        // Reuniões atrasadas (agendado/confirmado mas data passou)
        const agora = new Date();
        const atrasadas = wAtendimentos.filter(a => {
          if (!['agendado', 'confirmado', 'reagendado'].includes(a.status)) return false;
          if (!a.data_agendada) return false;
          const d = new Date(a.data_agendada);
          d.setMinutes(d.getMinutes() + 30);
          return d < agora;
        });

        // CAs pendentes do plano
        const casPendentes = wBuckets.filter(ca => ca.status === 'pendente');

        // Última reunião realizada
        const realizadas = wAtendimentos
          .filter(a => ['realizado', 'concluido', 'participando'].includes(a.status))
          .sort((a, b) => new Date(b.data_agendada) - new Date(a.data_agendada));
        const ultimaRealizadaDate = realizadas[0]?.data_realizada || realizadas[0]?.data_agendada;
        const diasSemContato = ultimaRealizadaDate
          ? Math.floor((hoje - new Date(ultimaRealizadaDate)) / (1000 * 60 * 60 * 24))
          : 999;

        // Nível de criticidade
        const proxima = wAtendimentos.find(a =>
          ['agendado', 'confirmado'].includes(a.status) &&
          new Date(a.data_agendada) > agora
        );
        let nivel = 'ok';
        if (wAtendimentos.length === 0 && wBuckets.length === 0) nivel = 'sem_dados';
        else if (realizadas.length === 0 && atrasadas.length === 0 && !proxima) nivel = 'nunca';
        else if (atrasadas.length > 0 && !proxima) nivel = 'critico';
        else if (!proxima && realizadas.length > 0) nivel = 'critico';
        else if (atrasadas.length > 0 || diasSemContato > 25) nivel = 'atencao';

        // Score
        let score = 0;
        if (nivel === 'critico') score += 100;
        else if (nivel === 'nunca') score += 50;
        else if (nivel === 'atencao') score += 30;
        score += Math.min(diasSemContato, 90) * 0.5;
        score += atrasadas.length * 10;
        score += casPendentes.length * 20;

        // Tipo sugerido baseado no último atendimento — resolvido contra tipos reais do banco
        const ultimoTipo = realizadas[0]?.tipo_atendimento || null;
        const tipoSugerido = (() => {
          // Prioridade 1: tipo do CA pendente mais antigo (já vem do banco)
          if (casPendentes.length > 0 && casPendentes[0].attendance_type_name) {
            return resolverTipo(casPendentes[0].attendance_type_name);
          }
          // Prioridade 2: progressão baseada no último tipo realizado
          if (realizadas.length === 0) return resolverTipo('Onboarding') || resolverTipo('Diagnóstico') || nomesTipos[0] || 'Acompanhamento';
          if (ultimoTipo) return resolverTipo(ultimoTipo) || nomesTipos[0] || 'Acompanhamento';
          return nomesTipos[0] || 'Acompanhamento';
        })();

        // CA mais antigo pendente
        const caParaConsumir = casPendentes.sort((a, b) =>
          new Date(a.scheduled_date) - new Date(b.scheduled_date)
        )[0];

        // Motivo textual
        const partes = [];
        if (atrasadas.length > 0) partes.push(`${atrasadas.length} reunião(ões) atrasada(s)`);
        if (diasSemContato < 999) partes.push(`${diasSemContato}d sem contato`);
        else partes.push('nunca atendido');
        if (casPendentes.length > 0) partes.push(`${casPendentes.length} reunião(ões) do plano pendente(s)`);
        const motivo = partes.join(' · ');

        return {
          workshop: w,
          score: Math.round(score),
          nivel,
          atrasadas: atrasadas.length,
          casPendentes: casPendentes.length,
          diasSemContato: diasSemContato === 999 ? null : diasSemContato,
          tipoSugerido,
          caParaConsumir,
          motivo,
        };
      })
      .filter(s => s.nivel !== 'ok' && s.nivel !== 'sem_dados') // só quem precisa
      .sort((a, b) => b.score - a.score);

    // === 7. Gera slots de datas disponíveis ===
    const dataBase = data_inicio ? new Date(data_inicio + 'T12:00:00') : new Date();
    const slots = [];
    let diaOffset = 0;
    // 🔗 Usa horários da Grade de Horários (já calculados acima)
    const horariosParaUsar = horarios_disponiveis_final;
    while (slots.length < scoredWorkshops.length * horariosParaUsar.length && diaOffset < 60) {
      const dia = new Date(dataBase);
      dia.setDate(dia.getDate() + diaOffset);
      const diaSemana = dia.getDay();
      // Pula fim de semana
      if (diaSemana !== 0 && diaSemana !== 6) {
        // 🔗 Também verifica se o dia da semana tem grade ativa para esse consultor
        const gradeNesteDia = gradeConsultor.find(g => g.dia_semana === diaSemana && g.ativo);
        const horariosNesteDia = gradeNesteDia
          ? gradeNesteDia.horarios.filter(h => h.ativo).map(h => h.hora).sort()
          : horariosParaUsar;
        horariosNesteDia.forEach(hora => {
          slots.push({
            data: dia.toISOString().split('T')[0],
            hora,
          });
        });
      }
      diaOffset++;
      if (diaOffset > dias_a_frente + 14) break;
    }

    // === 8. Encaixa clientes nos slots (max_por_dia) ===
    const slotsByDia = {};
    slots.forEach(s => {
      if (!slotsByDia[s.data]) slotsByDia[s.data] = [];
      slotsByDia[s.data].push(s.hora);
    });

    // Busca atendimentos já agendados para evitar conflito
    const jaAgendados = await base44.asServiceRole.entities.ConsultoriaAtendimento.filter(
      {
        consultor_id: resolvedConsultorId,
        status: { $in: ['agendado', 'confirmado'] },
        data_agendada: { $gte: dataBase.toISOString() }
      },
      '-data_agendada', 200
    );

    const ocupadosPorDiaHora = new Set(
      jaAgendados.map(a => {
        const d = new Date(a.data_agendada);
        const data = d.toISOString().split('T')[0];
        const hora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        return `${data}_${hora}`;
      })
    );

    const sugestoes = [];
    const contagemPorDia = {};
    let workshopIdx = 0;

    for (const [dia, horas] of Object.entries(slotsByDia).sort()) {
      if (workshopIdx >= scoredWorkshops.length) break;
      contagemPorDia[dia] = 0;

      for (const hora of horas) {
        if (workshopIdx >= scoredWorkshops.length) break;
        if (contagemPorDia[dia] >= max_por_dia) break;

        const chave = `${dia}_${hora}`;
        if (ocupadosPorDiaHora.has(chave)) continue;

        const sw = scoredWorkshops[workshopIdx];
        sugestoes.push({
          consultor_id: resolvedConsultorId,
          consultor_nome: resolvedConsultorNome,
          workshop_id: sw.workshop.id,
          workshop_name: sw.workshop.name,
          workshop_email: sw.workshop.email || null,
          socios_emails: [],
          tipo_atendimento_sugerido: sw.tipoSugerido,
          tipo_atendimento_final: sw.tipoSugerido,
          data_sugerida: dia,
          hora_sugerida: hora,
          data_final: dia,
          hora_final: hora,
          score_prioridade: sw.score,
          nivel_criticidade: sw.nivel,
          motivo_urgencia: sw.motivo,
          reunioes_atrasadas: sw.atrasadas,
          reunioes_pendentes_plano: sw.casPendentes,
          dias_sem_contato: sw.diasSemContato,
          contract_attendance_id: sw.caParaConsumir?.id || null,
          status: 'pendente',
          periodo_geracao: `semana_${dia}`,
          consulting_firm_id: user.data?.consulting_firm_id || null,
        });

        contagemPorDia[dia]++;
        workshopIdx++;
      }
    }

    // === 9. Salva sugestões no banco ===
    const criadas = [];
    for (const s of sugestoes) {
      const criada = await base44.asServiceRole.entities.SugestaoAgendamento.create(s);
      criadas.push(criada);
    }

    return Response.json({
      success: true,
      total_geradas: criadas.length,
      total_clientes_analisados: scoredWorkshops.length,
      sugestoes: criadas,
    });

  } catch (error) {
    console.error('Erro ao gerar sugestões:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});