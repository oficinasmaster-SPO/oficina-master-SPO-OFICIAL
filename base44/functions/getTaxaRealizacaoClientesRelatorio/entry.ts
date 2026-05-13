import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { status_filter = 'todos', empresa_filter = null, data_inicio_filter = null } = await req.json();

    // Buscar workshops (clientes)
    const workshops = await base44.entities.Workshop.list('-created_date', 500);
    
    // Buscar regras de atendimento por plano
    const planAttendanceRules = await base44.entities.PlanAttendanceRule.list('-created_date', 500);
    
    // Buscar atendimentos realizados
    const attendances = await base44.entities.ConsultoriaAtendimento.list('-created_date', 5000);

    // Buscar planos que têm regras de frequência
    const plansWithFrequency = planAttendanceRules
      .filter(r => r.scheduling_type === 'frequency' && r.is_active)
      .map(r => r.plan_id);

    // Construir dados por cliente
    const clientesDados = workshops
      .filter(w => w.planoAtual && w.status !== 'inativo' && plansWithFrequency.includes(w.planoAtual)) // Apenas planos com frequência
      .filter(w => !empresa_filter || w.id === empresa_filter) // Filtro de empresa
      .filter(w => !data_inicio_filter || w.created_date >= data_inicio_filter) // Filtro de data
      .map(workshop => {
         const plano = workshop.planoAtual;

         // Buscar regras de atendimento para este plano (APENAS frequência - bucket)
         const planosRules = planAttendanceRules.filter(r => 
           r.plan_id === plano && 
           r.is_active && 
           r.scheduling_type === 'frequency'
         );
         const attendanceTypesDoPlano = planosRules.map(r => r.attendance_type_id);

         // Construir lista de atendimentos do plano
         const atendimentosPlano = planosRules.map(rule => ({
           id: rule.attendance_type_id,
           nome: rule.attendance_display_name || 'Atendimento',
           tipo_id: rule.attendance_type_id
         }));

         // Filtrar atendimentos APENAS pelos tipos que estão no plano
         const atendimentosDoCli = attendances.filter(a => 
           a.workshop_id === workshop.id && attendanceTypesDoPlano.includes(a.tipo_atendimento)
         );

         // Buscar atendimentos realizados deste cliente (apenas do plano)
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

        // Calcular taxa
        const totalPrevisto = atendimentosPlano.length;
        const totalRealizado = atendimentosRealizados.length;
        const taxaRealizacao = totalPrevisto > 0 ? Math.round((totalRealizado / totalPrevisto) * 100) : 0;

        // Contar quantos de cada tipo foram realizados (para suportar múltiplas ocorrências)
        const realizadosPorTipo = {};
        atendimentosRealizados.forEach(a => {
          realizadosPorTipo[a.tipo_atendimento] = (realizadosPorTipo[a.tipo_atendimento] || 0) + 1;
        });

        // Mapear status de cada atendimento (por attendance_type_id do plano)
        const atendimentosStatus = atendimentosPlano.map((aten, idx) => {
          const quantidadeRealizada = realizadosPorTipo[aten.id] || 0;
          const realizados = atendimentosRealizados.filter(a => a.tipo_atendimento === aten.id);
          const atrasado = atendimentosAtrasados.find(a => 
            a.tipo_atendimento === aten.id
          );
          const agendado = atendimentosDoCli.find(a =>
            a.status === 'agendado' && a.tipo_atendimento === aten.id
          );
          const pendente = atendimentosPendentes.find(a => 
            a.tipo_atendimento === aten.id
          );

          if (quantidadeRealizada > 0) {
            return { 
              status: 'realizado', 
              data: realizados[0]?.data_realizada || null,
              nome: `${aten.nome} ${idx + 1}`, // Adicionar número sequencial
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
      .sort((a, b) => b.taxa_realizacao - a.taxa_realizacao); // Ordenar por taxa descendente

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