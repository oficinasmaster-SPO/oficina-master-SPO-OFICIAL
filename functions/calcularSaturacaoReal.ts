import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Calcula saturação REAL de consultores considerando:
 * - Atendimentos agendados
 * - Tarefas do backlog
 * - Horas disponíveis semanais
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { startDate, endDate } = await req.json();

    // Buscar todos os consultores (users admin)
    const consultores = await base44.asServiceRole.entities.User.list();
    const admins = consultores.filter(u => u.role === 'admin');

    // Converter datas para filtro
    const dataInicio = new Date(startDate);
    const dataFim = new Date(endDate);
    dataFim.setHours(23, 59, 59, 999);

    // Buscar atendimentos no período especificado
    const atendimentos = await base44.asServiceRole.entities.ConsultoriaAtendimento.filter({
      status: { $in: ['agendado', 'confirmado', 'realizado', 'participando', 'atrasado'] },
      data_agendada: { $gte: startDate, $lte: endDate }
    });

    console.log('=== FILTRO APLICADO ===');
    console.log('Período:', startDate, 'até', endDate);
    console.log('Total atendimentos encontrados:', atendimentos.length);
    console.log('Atendimentos por status:', {
      realizado: atendimentos.filter(a => a.status === 'realizado').length,
      agendado: atendimentos.filter(a => a.status === 'agendado').length,
      confirmado: atendimentos.filter(a => a.status === 'confirmado').length,
      atrasado: atendimentos.filter(a => a.status === 'atrasado').length
    });

    // Buscar TODAS as tarefas não concluídas (sem filtro de período)
    const todasTarefas = await base44.asServiceRole.entities.TarefaBacklog.filter({
      status: { $ne: 'concluida' }
    });

    // Calcular para cada consultor
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const resultados = admins.map(consultor => {
      // Horas semanais disponíveis (padrão: 40h/semana)
      const horasSemanaisDisponiveis = 40;

      // 1. Horas em atendimentos no período
      const atendimentosConsultor = atendimentos.filter(a => a.consultor_id === consultor.id);

      // Separar em realizados, previstos e em atraso (DENTRO DO PERÍODO)
      const atendimentosRealizados = atendimentosConsultor.filter(a => 
        a.status === 'realizado'
      );

      const atendimentosPrevisto = atendimentosConsultor.filter(a => 
        ['agendado', 'confirmado', 'participando'].includes(a.status) &&
        new Date(a.data_agendada) >= hoje
      );

      const atendimentosEmAtraso = atendimentosConsultor.filter(a => 
        (a.status === 'atrasado' || 
         (['agendado', 'confirmado', 'participando'].includes(a.status) && new Date(a.data_agendada) < hoje))
      );

      if (atendimentosConsultor.length > 0) {
        console.log(`\n=== Consultor: ${consultor.full_name} ===`);
        console.log('Total atendimentos:', atendimentosConsultor.length);
        console.log('Realizados:', atendimentosRealizados.length, atendimentosRealizados.map(a => ({ data: a.data_agendada, status: a.status })));
        console.log('Previstos:', atendimentosPrevisto.length, atendimentosPrevisto.map(a => ({ data: a.data_agendada, status: a.status })));
        console.log('Em atraso:', atendimentosEmAtraso.length, atendimentosEmAtraso.map(a => ({ data: a.data_agendada, status: a.status })));
      }

      const horasAtendimentosRealizados = atendimentosRealizados.reduce((total, a) => {
        return total + (a.duracao_real_minutos || a.duracao_minutos || 60) / 60;
      }, 0);

      const horasAtendimentosPrevisto = atendimentosPrevisto.reduce((total, a) => {
        return total + (a.duracao_minutos || 60) / 60;
      }, 0);

      const horasAtendimentosEmAtraso = atendimentosEmAtraso.reduce((total, a) => {
        return total + (a.duracao_minutos || 60) / 60;
      }, 0);

      const horasAtendimentos = horasAtendimentosRealizados + horasAtendimentosPrevisto + horasAtendimentosEmAtraso;

      // 2. Horas necessárias para tarefas abertas
      const todasTarefasConsultor = todasTarefas.filter(t => t.consultor_id === consultor.id);
      const tarefasConsultor = todasTarefasConsultor.filter(t =>
        new Date(t.prazo) >= dataInicio && new Date(t.prazo) <= dataFim
      );

      // Separar tarefas em realizadas, previstas e em atraso (DENTRO DO PERÍODO)
      const tarefasRealizadas = tarefasConsultor.filter(t => t.status === 'concluida');
      const tarefasPrevistas = tarefasConsultor.filter(t => 
        t.status !== 'concluida' && 
        new Date(t.prazo) >= hoje
      );
      const tarefasEmAtraso = tarefasConsultor.filter(t => 
        t.status !== 'concluida' && new Date(t.prazo) < hoje
      );

      const horasTarefasRealizadas = tarefasRealizadas.reduce((total, t) => {
        return total + (t.tempo_real_horas || t.tempo_estimado_horas || 0);
      }, 0);

      const horasTarefasPrevistas = tarefasPrevistas.reduce((total, t) => {
        return total + (t.tempo_estimado_horas || 0);
      }, 0);

      const horasTarefasEmAtraso = tarefasEmAtraso.reduce((total, t) => {
        return total + (t.tempo_estimado_horas || 0);
      }, 0);

      const horasTarefas = horasTarefasRealizadas + horasTarefasPrevistas + horasTarefasEmAtraso;

      // 3. Total de horas comprometidas
      const horasComprometidas = horasAtendimentos + horasTarefas;

      // 4. Tarefas vencidas (TODAS as não concluídas com prazo passado, sem limite de período)
      const tarefasVencidas = todasTarefasConsultor.filter(t => 
        new Date(t.prazo) < hoje && t.status !== 'concluida'
      ).length;

      // 5. Tarefas críticas (TODAS as abertas com prioridade crítica, sem limite de período)
      const tarefasCriticas = todasTarefasConsultor.filter(t => 
        t.prioridade === 'critica' && t.status !== 'concluida'
      ).length;

      // 6. Índice de Saturação Real (%)
      // Fórmula: (horasComprometidas / horasSemanaisDisponiveis) * 100
      // Com ajuste para tarefas vencidas (+20% por tarefa vencida)
      const indiceBase = (horasComprometidas / horasSemanaisDisponiveis) * 100;
      const ajusteVencidas = tarefasVencidas * 20; // +20% por cada tarefa vencida
      const indiceSaturacao = Math.min(indiceBase + ajusteVencidas, 200); // Cap em 200%

      // 7. Status de gargalo
      let statusGargalo;
      if (indiceSaturacao > 150) {
        statusGargalo = 'critico';
      } else if (indiceSaturacao > 100) {
        statusGargalo = 'alto';
      } else if (indiceSaturacao > 70) {
        statusGargalo = 'medio';
      } else {
        statusGargalo = 'baixo';
      }

      return {
        consultor_id: consultor.id,
        consultor_nome: consultor.full_name,
        consultor_email: consultor.email,
        horas_semanais_disponiveis: horasSemanaisDisponiveis,
        // Atendimentos
        atendimentos_realizados: {
          horas: parseFloat(horasAtendimentosRealizados.toFixed(2)),
          qtd: atendimentosRealizados.length
        },
        atendimentos_previstos: {
          horas: parseFloat(horasAtendimentosPrevisto.toFixed(2)),
          qtd: atendimentosPrevisto.length
        },
        atendimentos_em_atraso: {
          horas: parseFloat(horasAtendimentosEmAtraso.toFixed(2)),
          qtd: atendimentosEmAtraso.length
        },
        total_atendimentos: {
          horas: parseFloat(horasAtendimentos.toFixed(2)),
          qtd: atendimentosConsultor.length
        },
        // Tarefas
        tarefas_realizadas: {
          horas: parseFloat(horasTarefasRealizadas.toFixed(2)),
          qtd: tarefasRealizadas.length
        },
        tarefas_previstas: {
          horas: parseFloat(horasTarefasPrevistas.toFixed(2)),
          qtd: tarefasPrevistas.length
        },
        tarefas_em_atraso: {
          horas: parseFloat(horasTarefasEmAtraso.toFixed(2)),
          qtd: tarefasEmAtraso.length
        },
        total_tarefas: {
          horas: parseFloat(horasTarefas.toFixed(2)),
          qtd: tarefasConsultor.length
        },
        // Totalizador
        carga_total_realizada: parseFloat((horasAtendimentosRealizados + horasTarefasRealizadas).toFixed(2)),
        carga_total_prevista: parseFloat(horasComprometidas.toFixed(2)),
        // Métricas adicionais
        qtd_tarefas_vencidas: tarefasVencidas,
        qtd_tarefas_criticas: tarefasCriticas,
        // Índices
        indice_saturacao: parseFloat(indiceSaturacao.toFixed(2)),
        status_gargalo: statusGargalo,
        data_calculo: new Date().toISOString(),
        periodo_filtro: { startDate, endDate }
      };
    });

    return Response.json({
      sucesso: true,
      timestamp: new Date().toISOString(),
      consultores: resultados.sort((a, b) => b.indice_saturacao - a.indice_saturacao)
    });
  } catch (error) {
    console.error('Erro ao calcular saturação:', error);
    return Response.json({
      sucesso: false,
      erro: error.message
    }, { status: 500 });
  }
});