import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Verifica se todas as reuniões de um bucket foram agendadas
 * Se sim: marca FU ativo como "concluido"
 * Acionada por: automação entity ConsultoriaSprint.updated
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { bucket_id } = await req.json();

    if (!bucket_id) {
      return Response.json({ error: 'bucket_id é obrigatório' }, { status: 400 });
    }

    // Busca o bucket
    const bucket = await base44.asServiceRole.entities.ConsultoriaSprint.list();
    const bucketAtual = bucket.find(b => b.id === bucket_id);

    if (!bucketAtual) {
      return Response.json({ error: 'Bucket não encontrado' }, { status: 404 });
    }

    // Verifica se todas as reuniões têm data
    const reunioes = bucketAtual.phases
      ?.flatMap(p => p.tasks || [])
      .filter(t => t.instructions?.includes('reunião') || t.description?.includes('reunião')) || [];

    if (reunioes.length === 0) {
      return Response.json({ info: 'Nenhuma reunião detectada', action: 'none' }, { status: 200 });
    }

    const todasAgendadas = reunioes.every(r => r.scheduled_date);

    if (!todasAgendadas) {
      return Response.json(
        { info: 'Ainda há reuniões não agendadas', action: 'none' },
        { status: 200 }
      );
    }

    // ✅ Todas agendadas! Busca FU ativo
    const fuAtivos = await base44.asServiceRole.entities.FollowUpContador.filter({
      origem_id: bucket_id,
      origem_tipo: 'bucket',
      status: 'ativo'
    });

    if (fuAtivos.length === 0) {
      return Response.json(
        { info: 'Nenhum FU ativo encontrado', action: 'none' },
        { status: 200 }
      );
    }

    const fuAtual = fuAtivos[0];

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
        motivo_fechamento: `Todas ${reunioes.length} reuniões agendadas`,
        snapshot: {
          reunioes_agendadas: reunioes.length,
          reunioes_total: reunioes.length,
          bucket_status: bucketAtual.status
        },
        metricas: {
          evolucao: `0% → 100% (${reunioes.length}/${reunioes.length})`,
          ciclos_necessarios: fuAtual.numero_sequencia
        }
      }
    ];

    await base44.asServiceRole.entities.FollowUpContador.update(fuAtual.id, {
      status: 'concluido',
      data_baixa: dataBaixa.toISOString(),
      historico: novoHistorico
    });

    console.log(`✅ Bucket ${bucket_id}: FU #${fuAtual.numero_sequencia} concluído (todas reuniões agendadas)`);
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