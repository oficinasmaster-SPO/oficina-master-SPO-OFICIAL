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
    
    // Buscar tipos de atendimento e suas regras por plano
    const attendanceTypes = await base44.entities.TipoAtendimentoConsultoria.list('-created_date', 500);
    const planAttendanceRules = await base44.entities.PlanAttendanceRule.list('-created_date', 500);
    
    // Buscar atendimentos realizados
    const attendances = await base44.entities.ConsultoriaAtendimento.list('-created_date', 5000);

    // Construir dados por cliente
    const clientesDados = workshops
      .filter(w => w.planoAtual && w.status !== 'inativo') // Apenas workshops ativos com plano
      .filter(w => !empresa_filter || w.id === empresa_filter) // Filtro de empresa
      .filter(w => !data_inicio_filter || w.created_date >= data_inicio_filter) // Filtro de data
      .map(workshop => {
        const plano = workshop.planoAtual;
        
        // Buscar regras de atendimento para este plano
        const planosRules = planAttendanceRules.filter(r => r.plan_id === plano && r.is_active);
        
        // Construir lista de atendimentos do plano
        const atendimentosPlano = planosRules.map(rule => {
          const type = attendanceTypes.find(t => t.id === rule.attendance_type_id);
          return {
            id: rule.attendance_type_id,
            nome: rule.attendance_display_name || type?.nome || 'Atendimento',
            tipo_id: rule.attendance_type_id
          };
        });

        // Buscar atendimentos realizados deste cliente
        const atendimentosRealizados = attendances.filter(a => 
          a.workshop_id === workshop.id && a.status === 'realizado'
        );

        const atendimentosAtrasados = attendances.filter(a =>
          a.workshop_id === workshop.id && 
          a.status !== 'realizado' && 
          a.status !== 'agendado' &&
          a.data_agendada && 
          new Date(a.data_agendada) < new Date()
        );

        const atendimentosPendentes = attendances.filter(a =>
          a.workshop_id === workshop.id &&
          a.status !== 'realizado' &&
          !a.data_agendada
        );

        // Calcular taxa
        const totalPrevisto = atendimentosPlano.length;
        const totalRealizado = atendimentosRealizados.length;
        const taxaRealizacao = totalPrevisto > 0 ? Math.round((totalRealizado / totalPrevisto) * 100) : 0;

        // Mapear status de cada atendimento (por tipo_id, não nome)
        const atendimentosStatus = atendimentosPlano.map(aten => {
          const realizado = atendimentosRealizados.find(a => 
            a.tipo_atendimento === aten.nome || a.diagnostic_id === aten.id
          );
          const atrasado = atendimentosAtrasados.find(a => 
            a.tipo_atendimento === aten.nome || a.diagnostic_id === aten.id
          );
          const agendado = attendances.find(a =>
            a.workshop_id === workshop.id &&
            a.status === 'agendado' &&
            (a.tipo_atendimento === aten.nome || a.diagnostic_id === aten.id)
          );
          const pendente = atendimentosPendentes.find(a => 
            a.tipo_atendimento === aten.nome || a.diagnostic_id === aten.id
          );

          if (realizado) {
            return { status: 'realizado', data: realizado.data_realizada, nome: aten.nome };
          } else if (atrasado) {
            const diasAtrasado = Math.floor((new Date() - new Date(atrasado.data_agendada)) / (1000 * 60 * 60 * 24));
            return { status: 'atrasado', diasAtrasado, nome: aten.nome };
          } else if (agendado) {
            return { status: 'agendado', data: agendado.data_agendada, nome: aten.nome };
          } else if (pendente) {
            return { status: 'pendente', nome: aten.nome };
          } else {
            return { status: 'nao_agendado', nome: aten.nome };
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