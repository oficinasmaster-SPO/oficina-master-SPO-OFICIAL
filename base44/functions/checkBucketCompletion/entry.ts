import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Verifica se um bucket (ConsultoriaSprint tipo bucket) foi "completado"
 * Um bucket de reuniões é considerado completo quando seu status = 'completed'
 * ou quando todas as tarefas da fase Planning estão com status 'done'
 * 
 * Acionada por: automação entity ConsultoriaSprint.updated (origin_tipo bucket)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    // Suporta bucket_id vindo direto ou via payload de automação entity
    const bucket_id = body.bucket_id || body.data?.id || body.event?.entity_id;

    if (!bucket_id) {
      return Response.json({ error: 'bucket_id é obrigatório' }, { status: 400 });
    }

    // Busca o bucket pelo ID
    let bucketAtual = null;
    try {
      const buckets = await base44.asServiceRole.entities.ConsultoriaSprint.filter({ id: bucket_id });
      bucketAtual = buckets?.[0];
    } catch {
      return Response.json({ info: 'Bucket não encontrado ou ID inválido', action: 'none' }, { status: 200 });
    }

    if (!bucketAtual) {
      return Response.json({ info: 'Bucket não encontrado', action: 'none' }, { status: 200 });
    }

    // Um bucket é considerado concluído quando status = 'completed'
    if (bucketAtual.status !== 'completed') {
      return Response.json(
        { info: 'Bucket ainda em progresso', action: 'none', status: bucketAtual.status },
        { status: 200 }
      );
    }

    // ✅ Bucket completo! Busca FU ativo
    const fuAtivos = await base44.asServiceRole.entities.FollowUpContador.filter({
      origem_id: bucket_id,
      origem_tipo: 'bucket',
      status: 'ativo'
    });

    if (fuAtivos.length === 0) {
      return Response.json(
        { info: 'Nenhum FU ativo encontrado para este bucket', action: 'none' },
        { status: 200 }
      );
    }

    const fuAtual = fuAtivos[0];

    // Conta tarefas do bucket para métricas
    const allTarefas = bucketAtual.phases?.flatMap(p => p.tasks || []) || [];
    const tarefasConcluidas = allTarefas.filter(t => t.status === 'done').length;

    // Fechar o FU
    const dataBaixa = new Date();
    const dataCriacao = new Date(fuAtual.data_criacao || fuAtual.created_date);
    const diasDuracao = Math.max(0, Math.floor((dataBaixa - dataCriacao) / (1000 * 60 * 60 * 24)));

    const novoHistorico = [
      ...(fuAtual.historico || []),
      {
        numero: fuAtual.numero_sequencia,
        data_criacao: fuAtual.data_criacao || fuAtual.created_date,
        data_baixa: dataBaixa.toISOString(),
        dias_duracao: diasDuracao,
        motivo_fechamento: 'Bucket de atendimentos concluído',
        snapshot: {
          tarefas_concluidas: tarefasConcluidas,
          tarefas_total: allTarefas.length,
          bucket_status: bucketAtual.status,
          contexto: fuAtual.contexto
        },
        metricas: {
          evolucao: allTarefas.length > 0
            ? `${((tarefasConcluidas / allTarefas.length) * 100).toFixed(0)}% (${tarefasConcluidas}/${allTarefas.length})`
            : '100%',
          ciclos_necessarios: fuAtual.numero_sequencia
        }
      }
    ];

    await base44.asServiceRole.entities.FollowUpContador.update(fuAtual.id, {
      status: 'concluido',
      data_baixa: dataBaixa.toISOString(),
      historico: novoHistorico
    });

    console.log(`✅ Bucket ${bucket_id}: FU #${fuAtual.numero_sequencia} concluído`);
    return Response.json({
      success: true,
      fu_concluido: fuAtual.numero_sequencia,
      historico_total: novoHistorico.length,
      dias_duracao: diasDuracao
    });

  } catch (error) {
    console.error('❌ Erro em checkBucketCompletion:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});