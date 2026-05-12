import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Verifica se uma sprint foi finalizada (status = 'completed')
 * Se sim: marca FU ativo como "concluido"
 * 
 * Acionada por: automação entity ConsultoriaSprint.updated (status = completed)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    // Suporta sprint_id vindo direto ou via payload de automação entity
    const sprint_id = body.sprint_id || body.data?.id || body.event?.entity_id;

    if (!sprint_id) {
      return Response.json({ error: 'sprint_id é obrigatório' }, { status: 400 });
    }

    // Busca a sprint pelo ID
    let sprintAtual = null;
    try {
      const sprints = await base44.asServiceRole.entities.ConsultoriaSprint.filter({ id: sprint_id });
      sprintAtual = sprints?.[0];
    } catch {
      return Response.json({ info: 'Sprint não encontrada ou ID inválido', action: 'none' }, { status: 200 });
    }

    if (!sprintAtual) {
      return Response.json({ info: 'Sprint não encontrada', action: 'none' }, { status: 200 });
    }

    // Verifica se sprint está completa
    if (sprintAtual.status !== 'completed') {
      return Response.json(
        { info: 'Sprint ainda em progresso', action: 'none', status: sprintAtual.status },
        { status: 200 }
      );
    }

    // ✅ Sprint completa! Busca FU ativo
    const fuAtivos = await base44.asServiceRole.entities.FollowUpContador.filter({
      origem_id: sprint_id,
      origem_tipo: 'sprint',
      status: 'ativo'
    });

    if (fuAtivos.length === 0) {
      return Response.json(
        { info: 'Nenhum FU ativo encontrado para esta sprint', action: 'none' },
        { status: 200 }
      );
    }

    const fuAtual = fuAtivos[0];

    // Conta tarefas
    const allTarefas = sprintAtual.phases?.flatMap(p => p.tasks || []) || [];
    const totalTarefas = allTarefas.length;
    const tarefasConcluidas = allTarefas.filter(t => t.status === 'done').length;

    // Fechar o FU
    const dataBaixa = new Date();
    const dataCriacao = new Date(fuAtual.data_criacao || fuAtual.created_date);
    const diasDuracao = Math.max(0, Math.floor((dataBaixa - dataCriacao) / (1000 * 60 * 60 * 24)));

    // Última fase ativa
    const ultimaFase = sprintAtual.phases?.at(-1)?.name || 'Retrospective';

    const novoHistorico = [
      ...(fuAtual.historico || []),
      {
        numero: fuAtual.numero_sequencia,
        data_criacao: fuAtual.data_criacao || fuAtual.created_date,
        data_baixa: dataBaixa.toISOString(),
        dias_duracao: diasDuracao,
        motivo_fechamento: 'Sprint finalizada',
        snapshot: {
          tarefas_concluidas: tarefasConcluidas,
          tarefas_total: totalTarefas,
          fase_final: ultimaFase,
          sprint_status: sprintAtual.status,
          contexto: fuAtual.contexto
        },
        metricas: {
          evolucao: totalTarefas > 0
            ? `${((tarefasConcluidas / totalTarefas) * 100).toFixed(0)}% (${tarefasConcluidas}/${totalTarefas})`
            : '100%',
          ciclos_necessarios: fuAtual.numero_sequencia,
          velocidade: diasDuracao > 0 && tarefasConcluidas > 0
            ? `${(tarefasConcluidas / diasDuracao).toFixed(1)} tarefas/dia`
            : 'N/A'
        }
      }
    ];

    await base44.asServiceRole.entities.FollowUpContador.update(fuAtual.id, {
      status: 'concluido',
      data_baixa: dataBaixa.toISOString(),
      historico: novoHistorico
    });

    console.log(`✅ Sprint ${sprint_id}: FU #${fuAtual.numero_sequencia} concluído`);
    return Response.json({
      success: true,
      fu_concluido: fuAtual.numero_sequencia,
      historico_total: novoHistorico.length,
      dias_duracao: diasDuracao,
      tarefas: { concluidas: tarefasConcluidas, total: totalTarefas }
    });

  } catch (error) {
    console.error('❌ Erro em checkSprintCompletion:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});