import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { status_filter = 'todos', empresa_filter = null, data_inicio_filter = null } = await req.json();

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

         // Buscar regras de atendimento para este plano (APENAS frequência)
         const planosRules = planAttendanceRules.filter(r => 
           r.plan_id === plano && 
           r.is_active && 
           r.scheduling_type === 'frequency'
         );

         // Construir lista de atendimentos esperados do plano
         const atendimentosPlano = planosRules.map(rule => ({
           id: rule.attendance_type_id,
           nome: rule.attendance_type_name || 'Atendimento',
           tipo_id: rule.attendance_type_id,
           attendance_type_name: rule.attendance_type_name
         }));

         // Filtrar atendimentos do cliente - comparar por nome (tipo_atendimento é texto livre)
         const atendimentosDoCli = attendances.filter(a => {
           if (a.workshop_id !== workshop.id) return false;
           // Procurar se o tipo de atendimento corresponde a alguma regra do plano
           return atendimentosPlano.some(aten => 
             aten.attendance_type_name && 
             a.tipo_atendimento && 
             a.tipo_atendimento.toLowerCase().includes(aten.attendance_type_name.toLowerCase())
           );
         });

         // Contar atendimentos realizados
         const atendimentosRealizados = atendimentosDoCli.filter(a => 
           a.status === 'realizado'
         );

         const atendimentosAtrasados = atendimentosDoCli.filter(a =>
           a.status !== 'realizado' && 
           a.status !== 'agendado' &&
           a.data_agendada && 
           new Date(a.data_agendada) < new Date()
         );

         const atendimentosPendentes = atendimentosDoCli.filter(a =>
           a.status !== 'realizado' &&
           !a.data_agendada
         );

        // Calcular taxa (total_previsto = número de regras de frequência)
        const totalPrevisto = atendimentosPlano.length;
        const totalRealizado = atendimentosRealizados.length;
        const taxaRealizacao = totalPrevisto > 0 ? Math.round((totalRealizado / totalPrevisto) * 100) : 0;

        // Contar quantos de cada tipo foram realizados
        const realizadosPorTipo = {};
        atendimentosRealizados.forEach(a => {
          const tipoMatch = atendimentosPlano.find(aten => 
            aten.attendance_type_name && 
            a.tipo_atendimento?.toLowerCase().includes(aten.attendance_type_name.toLowerCase())
          );
          if (tipoMatch) {
            realizadosPorTipo[tipoMatch.id] = (realizadosPorTipo[tipoMatch.id] || 0) + 1;
          }
        });

        // Mapear status de cada atendimento esperado
        const atendimentosStatus = atendimentosPlano.map((aten, idx) => {
          const quantidadeRealizada = realizadosPorTipo[aten.id] || 0;
          const realizados = atendimentosRealizados.filter(a => 
            aten.attendance_type_name && 
            a.tipo_atendimento?.toLowerCase().includes(aten.attendance_type_name.toLowerCase())
          );
          const atrasado = atendimentosAtrasados.find(a => 
            aten.attendance_type_name && 
            a.tipo_atendimento?.toLowerCase().includes(aten.attendance_type_name.toLowerCase())
          );
          const agendado = atendimentosDoCli.find(a =>
            a.status === 'agendado' && 
            aten.attendance_type_name && 
            a.tipo_atendimento?.toLowerCase().includes(aten.attendance_type_name.toLowerCase())
          );
          const pendente = atendimentosPendentes.find(a => 
            aten.attendance_type_name && 
            a.tipo_atendimento?.toLowerCase().includes(aten.attendance_type_name.toLowerCase())
          );

          if (quantidadeRealizada > 0) {
            return { 
              status: 'realizado', 
              data: realizados[0]?.data_realizada || null,
              nome: `${aten.nome} ${idx + 1}`,
              quantidade: quantidadeRealizada
            };
          } else if (atrasado) {
            const diasAtrasado = Math.floor((new Date() - new Date(atrasado.data_agendada)) / (1000 * 60 * 60 * 24));
            return { status: 'atrasado', diasAtrasado, nome: `${aten.nome} ${idx + 1}`, quantidade: 0 };
          } else if (agendado) {
            return { status: 'agendado', data: agendado.data_agendada, nome: `${aten.nome} ${idx + 1}`, quantidade: 0 };
          } else if (pendente) {
            return { status: 'pendente', nome: `${aten.nome} ${idx + 1}`, quantidade: 0 };
          } else {
            return { status: 'nao_agendado', nome: `${aten.nome} ${idx + 1}`, quantidade: 0 };
          }
        });

        return {
          id: workshop.id,
          nome: workshop.name,
          plano: plano,
          data_inicio: workshop.created_date,
          taxa_realizacao: taxaRealizacao,
          total_realizado: totalRealizado,
          total_previsto: totalPrevisto,
          total_atrasados: atendimentosAtrasados.length,
          total_pendentes: atendimentosPendentes.length,
          atendimentos_plano: atendimentosPlano,
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