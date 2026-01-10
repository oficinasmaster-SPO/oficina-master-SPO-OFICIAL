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

    // Buscar todos os consultores (users admin)
    const consultores = await base44.asServiceRole.entities.User.list();
    const admins = consultores.filter(u => u.role === 'admin');

    // Buscar todos os atendimentos deste mês
    const agora = new Date();
    const primeiroDia = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString();
    const ultimoDia = new Date(agora.getFullYear(), agora.getMonth() + 1, 0).toISOString();

    const atendimentos = await base44.asServiceRole.entities.ConsultoriaAtendimento.filter({
      status: { $in: ['agendado', 'confirmado', 'realizado', 'participando', 'atrasado'] }
    });

    // Buscar todas as tarefas abertas
    const tarefas = await base44.asServiceRole.entities.TarefaBacklog.list();
    const tarefasAbertas = tarefas.filter(t => t.status !== 'concluida');

    // Calcular para cada consultor
    const resultados = admins.map(consultor => {
      // Horas semanais disponíveis (padrão: 40h/semana)
      const horasSemanaisDisponiveis = 40;

      // 1. Horas em atendimentos este mês
      const atendimentosConsultor = atendimentos.filter(a => a.consultor_id === consultor.id);
      const horasAtendimentos = atendimentosConsultor.reduce((total, a) => {
        return total + (a.duracao_real_minutos || a.duracao_minutos || 60) / 60;
      }, 0);

      // 2. Horas necessárias para tarefas abertas
      const tarefasConsultor = tarefasAbertas.filter(t => t.consultor_id === consultor.id);
      const horasTarefas = tarefasConsultor.reduce((total, t) => {
        return total + (t.tempo_estimado_horas || 0);
      }, 0);

      // 3. Total de horas comprometidas
      const horasComprometidas = horasAtendimentos + horasTarefas;

      // 4. Tarefas vencidas (aumentam prioridade/urgência)
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const tarefasVencidas = tarefasConsultor.filter(t => 
        new Date(t.prazo) < hoje && t.status !== 'concluida'
      ).length;

      // 5. Tarefas críticas
      const tarefasCriticas = tarefasConsultor.filter(t => t.prioridade === 'critica').length;

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
        horas_atendimentos: parseFloat(horasAtendimentos.toFixed(2)),
        horas_tarefas_backlog: parseFloat(horasTarefas.toFixed(2)),
        horas_comprometidas: parseFloat(horasComprometidas.toFixed(2)),
        qtd_atendimentos: atendimentosConsultor.length,
        qtd_tarefas_abertas: tarefasConsultor.length,
        qtd_tarefas_vencidas: tarefasVencidas,
        qtd_tarefas_criticas: tarefasCriticas,
        indice_saturacao: parseFloat(indiceSaturacao.toFixed(2)),
        status_gargalo: statusGargalo,
        data_calculo: new Date().toISOString()
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