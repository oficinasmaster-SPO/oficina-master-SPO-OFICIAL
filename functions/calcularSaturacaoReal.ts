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

    // Buscar dados do perfil (Employee) para pegar o nome correto
    const adminIds = admins.map(u => u.id);
    const employees = await base44.asServiceRole.entities.Employee.filter({
      user_id: { $in: adminIds }
    });
    
    const employeeMap = {};
    employees.forEach(e => {
      employeeMap[e.user_id] = e;
    });

    // Converter datas para filtro
    const dataInicio = new Date(startDate);
    const dataFim = new Date(endDate);
    dataFim.setHours(23, 59, 59, 999);

    // Para "próximos X dias", buscar apenas atendimentos FUTUROS
    // Para "período atual" (mês), buscar todos os atendimentos do mês
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    // Se startDate for hoje ou futuro, é filtro de "próximos dias"
    const isFutureFilter = new Date(startDate) >= hoje;
    
    const atendimentos = await base44.asServiceRole.entities.ConsultoriaAtendimento.filter({
      status: { $in: ['agendado', 'confirmado', 'realizado', 'participando', 'atrasado'] },
      data_agendada: { $gte: startDate, $lte: endDate }
    });

    console.log('=== FILTRO APLICADO ===');
    console.log('Período:', startDate, 'até', endDate);
    console.log('É filtro futuro?', isFutureFilter);
    console.log('Total atendimentos encontrados:', atendimentos.length);
    console.log('Atendimentos detalhados:', atendimentos.map(a => ({
      id: a.id,
      data: a.data_agendada,
      status: a.status,
      consultor: a.consultor_id,
      workshop: a.workshop_id,
      duracao: a.duracao_minutos
    })));

    // Buscar TODAS as tarefas não concluídas (sem filtro de período)
    const todasTarefas = await base44.asServiceRole.entities.TarefaBacklog.filter({
      status: { $ne: 'concluida' }
    });

    const resultados = admins.map(consultor => {
      // Horas semanais disponíveis (padrão: 40h/semana)
      const horasSemanaisDisponiveis = 40;

      // 1. Horas em atendimentos no período
      const atendimentosConsultor = atendimentos.filter(a => a.consultor_id === consultor.id);

      // REMOVER DUPLICATAS: Se há múltiplos atendimentos no mesmo horário, considerar apenas 1
      const atendimentosUnicos = atendimentosConsultor.reduce((acc, atendimento) => {
        const chave = `${atendimento.data_agendada}_${atendimento.consultor_id}`;
        if (!acc.has(chave)) {
          acc.set(chave, atendimento);
        }
        return acc;
      }, new Map());
      const atendimentosSemDuplicatas = Array.from(atendimentosUnicos.values());

      // Se é filtro futuro, IGNORAR atendimentos "realizados" (pois já passaram)
      // Só considerar agendados/confirmados para o futuro
      const atendimentosRealizados = isFutureFilter ? [] : atendimentosSemDuplicatas.filter(a => 
        a.status === 'realizado' && new Date(a.data_agendada) < hoje
      );

      const atendimentosPrevisto = atendimentosSemDuplicatas.filter(a => 
        ['agendado', 'confirmado', 'participando'].includes(a.status) &&
        new Date(a.data_agendada) >= hoje
      );

      const atendimentosEmAtraso = atendimentosSemDuplicatas.filter(a => 
        (a.status === 'atrasado' || 
         (['agendado', 'confirmado', 'participando'].includes(a.status) && new Date(a.data_agendada) < hoje))
      );

      if (atendimentosConsultor.length > 0) {
        console.log(`\n=== Consultor: ${consultor.full_name} ===`);
        console.log('Filtro futuro?', isFutureFilter);
        console.log('Total atendimentos (com duplicatas):', atendimentosConsultor.length);
        console.log('Total atendimentos (sem duplicatas):', atendimentosSemDuplicatas.length);
        console.log('Realizados:', atendimentosRealizados.length, atendimentosRealizados.map(a => ({ data: a.data_agendada, status: a.status })));
        console.log('Previstos:', atendimentosPrevisto.length, atendimentosPrevisto.map(a => ({ data: a.data_agendada, status: a.status })));
        console.log('Em atraso:', atendimentosEmAtraso.length, atendimentosEmAtraso.map(a => ({ data: a.data_agendada, status: a.status })));
      }

      const horasAtendimentosRealizados = atendimentosRealizados.reduce((total, a) => {
        return total + (a.duracao_real_minutos || a.duracao_minutos || 60) / 60;
      }, 0);

      const horasAtendimentosPrevisto = atendimentosPrevisto.reduce((total, a) => {
        const info = {
          id: a.id,
          data: a.data_agendada,
          status: a.status,
          duracao: a.duracao_minutos || 60,
          workshop_id: a.workshop_id,
          tipo: a.tipo_atendimento
        };
        console.log('Atendimento PREVISTO:', info);
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
        console.log('Tarefa PREVISTA:', {
          id: t.id,
          titulo: t.titulo,
          prazo: t.prazo,
          status: t.status,
          tempo_estimado: t.tempo_estimado_horas || 0
        });
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

      const employee = employeeMap[consultor.id];
      const nomeExibicao = employee ? employee.full_name : consultor.full_name;

      return {
        consultor_id: consultor.id,
        consultor_nome: nomeExibicao,
        consultor_email: consultor.email,
        horas_semanais_disponiveis: horasSemanaisDisponiveis,
        // DEBUG: atendimentos detalhados
        debug_atendimentos_previstos: atendimentosPrevisto.map(a => ({
          id: a.id,
          data: a.data_agendada,
          status: a.status,
          duracao_min: a.duracao_minutos || 60,
          workshop_id: a.workshop_id
        })),
        debug_tarefas_previstas: tarefasPrevistas.map(t => ({
          id: t.id,
          titulo: t.titulo,
          prazo: t.prazo,
          tempo_h: t.tempo_estimado_horas || 0
        })),
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