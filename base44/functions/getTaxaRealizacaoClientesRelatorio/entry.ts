import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { status_filter = 'todos', empresa_filter = null, data_inicio_filter = null } = await req.json();

    // ─── Helpers (TDD-style: pure functions, easy to unit-test) ───────────────

    // Statuses that mean "the meeting actually happened"
    const REALIZADO_STATUSES = new Set(['realizado', 'concluido']);
    const isRealizado = (a) => REALIZADO_STATUSES.has(a.status);

    // Buscar dados base
    const workshops = await base44.entities.Workshop.list('-created_date', 500);
    const planAttendanceRules = await base44.entities.PlanAttendanceRule.list('-created_date', 500);
    const attendances = await base44.entities.ConsultoriaAtendimento.list('-created_date', 5000);

    // Buscar planos que têm regras de frequência
    const plansWithFrequency = planAttendanceRules
      .filter(r => r.scheduling_type === 'frequency' && r.is_active)
      .map(r => r.plan_id);

    // Construir dados por cliente
    const clientesDados = workshops
      .filter(w => w.planoAtual && w.status !== 'inativo' && plansWithFrequency.includes(w.planoAtual))
      .filter(w => !empresa_filter || w.id === empresa_filter)
      .filter(w => !data_inicio_filter || w.created_date >= data_inicio_filter)
      .map(workshop => {
         const plano = workshop.planoAtual;

         // Total previsto = número de regras de frequência do plano
         const planosRules = planAttendanceRules.filter(r =>
           r.plan_id === plano &&
           r.is_active &&
           r.scheduling_type === 'frequency'
         );
         const totalPrevisto = planosRules.length;

         // Todos os atendimentos do cliente
         const todosAtendimentosDoCli = attendances.filter(a => a.workshop_id === workshop.id);

         // ── NOVA LÓGICA: conta por quantidade real, não por correspondência de nome ──
         // Realizados = qualquer atendimento com status realizado OU concluido
         const atendimentosRealizados = todosAtendimentosDoCli
           .filter(isRealizado)
           .sort((a, b) => new Date(a.data_agendada || a.created_date) - new Date(b.data_agendada || b.created_date));

         const totalRealizado = atendimentosRealizados.length;

         // Agendados (futuros, ainda não realizados)
         const atendimentosAgendados = todosAtendimentosDoCli.filter(a =>
           a.status === 'agendado' || a.status === 'confirmado'
         );

         // Atrasados (passados, não realizados, não cancelados)
         const STATUSES_IGNORADOS = new Set(['realizado', 'concluido', 'agendado', 'confirmado', 'cancelado']);
         const atendimentosAtrasados = todosAtendimentosDoCli.filter(a =>
           !STATUSES_IGNORADOS.has(a.status) &&
           a.data_agendada &&
           new Date(a.data_agendada) < new Date()
         );

         // Taxa de realização: realizados / previsto pelo plano (cap em 100%)
         const taxaRealizacao = totalPrevisto > 0
           ? Math.min(100, Math.round((totalRealizado / totalPrevisto) * 100))
           : 0;

         // ── Colunas dinâmicas: as reuniões que realmente aconteceram ──
         // Cada linha = uma reunião realizada (em ordem cronológica)
         const atendimentosStatus = atendimentosRealizados.map((a, idx) => ({
           status: 'realizado',
           nome: a.tipo_atendimento || `Reunião ${idx + 1}`,
           data: a.data_realizada || a.data_agendada || null,
           quantidade: 1
         }));

        return {
          id: workshop.id,
          nome: workshop.name,
          plano: plano,
          data_inicio: workshop.created_date,
          taxa_realizacao: taxaRealizacao,
          total_realizado: totalRealizado,
          total_previsto: totalPrevisto,
          total_atrasados: atendimentosAtrasados.length,
          total_pendentes: atendimentosAgendados.length,
          atendimentos_plano: planosRules.map(r => ({ id: r.attendance_type_id, nome: r.attendance_type_name || 'Atendimento' })),
          atendimentos_status: atendimentosStatus
        };
      })
      .sort((a, b) => b.taxa_realizacao - a.taxa_realizacao);

    // Aplicar filtro de status
    let filtered = clientesDados;
    if (status_filter === 'realizados') {
      filtered = filtered.filter(c => c.taxa_realizacao === 100);
    } else if (status_filter === 'atrasados') {
      filtered = filtered.filter(c => c.total_atrasados > 0);
    } else if (status_filter === 'agendados') {
      filtered = filtered.filter(c => c.atendimentos_status.some(a => a.status === 'agendado'));
    } else if (status_filter === 'pendentes') {
      filtered = filtered.filter(c => c.total_pendentes > 0 || c.atendimentos_status.some(a => a.status === 'nao_agendado'));
    }

    return Response.json({
      success: true,
      clientes: filtered,
      total: filtered.length
    });

  } catch (error) {
    console.error('Erro ao buscar taxa realização:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});