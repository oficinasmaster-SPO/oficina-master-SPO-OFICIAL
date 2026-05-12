import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Verifica se uma sprint foi finalizada
 * Se sim: marca FU ativo como "concluido"
 * Acionada por: automação entity ConsultoriaSprint.updated (status="completed")
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { sprint_id } = await req.json();

    if (!sprint_id) {
      return Response.json({ error: 'sprint_id é obrigatório' }, { status: 400 });
    }

    // Busca a sprint
    const sprints = await base44.asServiceRole.entities.ConsultoriaSprint.list();
    const sprintAtual = sprints.find(s => s.id === sprint_id);

    if (!sprintAtual) {
      return Response.json({ error: 'Sprint não encontrada' }, { status: 404 });
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
        { info: 'Nenhum FU ativo encontrado', action: 'none' },
        { status: 200 }
      );
    }

    const fuAtual = fuAtivos[0];

    // Conta tarefas
    const totalTarefas = sprintAtual.phases
      ?.flatMap(p => p.tasks || [])
      .length || 0;

    const tarefasConcluidas = sprintAtual.phases
      ?.flatMap(p => p.tasks || [])
      .filter(t => t.status === 'done')
      .length || 0;

    // Fechar o FU
    const dataBaixa = new Date();
    const dataCriacao = new Date(fuAtual.data_criacao);
    const diasDuracao = Math.floor((dataBaixa - dataCriacao) / (1000 * 60 * 60 * 24));

    const novoHistorico = [
      ...(fuAtual.historico || []),
      {
        numero: fuAtual.numero_sequencia,
        data_criacao: fuAtual.data_criacao,
        data_baixa: dataBaixa.toISOString(),
        dias_duracao: diasDuracao,
        motivo_fechamento: 'Sprint finalizada',
        snapshot: {
          tarefas_concluidas: tarefasConcluidas,
          tarefas_total: totalTarefas,
          fase_final: sprintAtual.phases?.at(-1)?.name || 'Unknown',
          revisoes_solicitadas: sprintAtual.review_count || 0
        },
        metricas: {
          evolucao: `0% → 100% (${tarefasConcluidas}/${totalTarefas})`,
          ciclos_necessarios: fuAtual.numero_sequencia,
          velocidade: `${tarefasConcluidas} tarefas em ${diasDuracao} dias`,
          eficiencia: `${((tarefasConcluidas / totalTarefas) * 100).toFixed(1)}% concluído`
        }
      }
    ];

    await base44.asServiceRole.entities.FollowUpContador.update(fuAtual.id, {
      status: 'concluido',
      data_baixa: dataBaixa.toISOString(),
      historico: novoHistorico
    });

    console.log(`✅ Sprint ${sprint_id}: FU #${fuAtual.numero_sequencia} concluído (sprint finalizada)`);
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