import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Marca um FollowUpContador como "concluido"
 * Salva snapshot no histórico para rastreabilidade
 * Acionada quando: bucket finaliza agendamento OU sprint finaliza
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const {
      fu_id,                    // ID do FollowUpContador
      motivo_fechamento,        // "Todas 5 reuniões agendadas" ou "Sprint finalizada"
      snapshot = {}             // Contexto atual
    } = await req.json();

    if (!fu_id) {
      return Response.json({ error: 'fu_id é obrigatório' }, { status: 400 });
    }

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Busca o FU ativo
    const fu = await base44.entities.FollowUpContador.list('-data_criacao', 1);
    const fuAtual = fu.find(f => f.id === fu_id);

    if (!fuAtual) {
      return Response.json({ error: 'FollowUpContador não encontrado' }, { status: 404 });
    }

    // Calcula duração
    const dataCriacao = new Date(fuAtual.data_criacao);
    const dataBaixa = new Date();
    const diasDuracao = Math.floor((dataBaixa - dataCriacao) / (1000 * 60 * 60 * 24));

    // Adiciona ao histórico
    const novoHistorico = [
      ...(fuAtual.historico || []),
      {
        numero: fuAtual.numero_sequencia,
        data_criacao: fuAtual.data_criacao,
        data_baixa: dataBaixa.toISOString(),
        dias_duracao: diasDuracao,
        motivo_fechamento,
        snapshot: {
          ...snapshot,
          contexto: fuAtual.contexto
        },
        metricas: {
          evolucao: snapshot.evolucao_percentual || 'N/A',
          velocidade: snapshot.velocidade || 'N/A'
        }
      }
    ];

    // Atualiza FU como concluído
    await base44.entities.FollowUpContador.update(fu_id, {
      status: 'concluido',
      data_baixa: dataBaixa.toISOString(),
      historico: novoHistorico
    });

    console.log(`✅ FollowUpContador #${fuAtual.numero_sequencia} concluído: ${motivo_fechamento}`);
    return Response.json({ success: true, historico_total: novoHistorico.length });

  } catch (error) {
    console.error('❌ Erro em closeFollowUpContador:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});