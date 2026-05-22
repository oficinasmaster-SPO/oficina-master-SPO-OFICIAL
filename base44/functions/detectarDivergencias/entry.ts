import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      workshop_id,
      banco // opcional
    } = await req.json();

    if (!workshop_id) {
      return Response.json({ error: 'workshop_id obrigatório' }, { status: 400 });
    }

    const divergencias = [];

    // 1. Transações bancárias sem match no sistema
    const transacoesSemMatch = await base44.entities.BankTransaction.filter({
      workshop_id: workshop_id,
      ...(banco ? { banco } : {}),
      status_conciliacao: 'divergente',
      liquidacao_financeira_id: null
    });

    for (const tx of transacoesSemMatch) {
      divergencias.push({
        tipo: 'banco_sem_match',
        gravidade: 'media',
        descricao: `Transação bancária de R$ ${tx.valor} em ${tx.data_operacao} sem correspondência no sistema`,
        bank_transaction_id: tx.id,
        detalhes: {
          banco: tx.banco,
          valor: tx.valor,
          data: tx.data_operacao,
          descricao: tx.descricao
        },
        acao_sugerida: 'Verificar se há liquidação correspondente ou marcar como ignorada'
      });
    }

    // 2. Liquidações sem match no banco
    const liquidacoesSemMatch = await base44.entities.LiquidacaoFinanceira.filter({
      workshop_id,
      conciliado: false
    });

    for (const liq of liquidacoesSemMatch) {
      divergencias.push({
        tipo: 'sistema_sem_banco',
        gravidade: 'alta',
        descricao: `Liquidação de R$ ${liq.valor_liquidacao} em ${liq.data_liquidacao} não encontrada no banco`,
        liquidacao_financeira_id: liq.id,
        detalhes: {
          valor: liq.valor_liquidacao,
          data: liq.data_liquidacao,
          forma_pagamento: liq.forma_pagamento,
          conta_id: liq.conta_receber_id || liq.conta_pagar_id
        },
        acao_sugerida: 'Aguardar importação do extrato ou verificar se pagamento foi processado'
      });
    }

    // 3. Divergência de valores
    const transacoesConciliadas = await base44.entities.BankTransaction.filter({
      workshop_id,
      status_conciliacao: 'conciliado'
    });

    for (const tx of transacoesConciliadas) {
      if (!tx.liquidacao_financeira_id) continue;

      const liq = await base44.entities.LiquidacaoFinanceira.get(tx.liquidacao_financeira_id);
      if (!liq) continue;

      const diff = Math.abs(tx.valor - liq.valor_liquidacao);
      if (diff > 0.01) {
        divergencias.push({
          tipo: 'divergencia_valor',
          gravidade: 'alta',
          descricao: `Divergência de valor: Banco R$ ${tx.valor} vs Sistema R$ ${liq.valor_liquidacao}`,
          bank_transaction_id: tx.id,
          liquidacao_financeira_id: liq.id,
          detalhes: {
            valor_banco: tx.valor,
            valor_sistema: liq.valor_liquidacao,
            diferenca: diff,
            data: tx.data_operacao
          },
          acao_sugerida: 'Desfazer conciliação e verificar taxas/juros'
        });
      }
    }

    // 4. Duplicidade detectada
    const duplicatas = await detectarDuplicidade(base44, workshop_id);
    divergencias.push(...duplicatas.map(d => ({
      tipo: 'duplicidade',
      gravidade: 'critica',
      descricao: `Possível duplicidade: ${d.descricao}`,
      detalhes: d.detalhes,
      acao_sugerida: 'Verificar e excluir duplicata'
    })));

    // 5. Transações antigas não conciliadas (> 7 dias)
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - 7);

    const transacoesAntigas = await base44.entities.BankTransaction.filter({
      workshop_id,
      status_conciliacao: 'pendente',
      data_operacao: { $lt: dataLimite.toISOString().slice(0, 10) }
    });

    for (const tx of transacoesAntigas) {
      divergencias.push({
        tipo: 'nao_conciliado_antigo',
        gravidade: 'media',
        descricao: `Transação de ${tx.data_operacao} (R$ ${tx.valor}) não conciliada há mais de 7 dias`,
        bank_transaction_id: tx.id,
        detalhes: {
          data: tx.data_operacao,
          valor: tx.valor,
          dias_atraso: Math.floor((Date.now() - new Date(tx.data_operacao).getTime()) / (1000 * 60 * 60 * 24))
        },
        acao_sugerida: 'Conciliar ou investigar'
      });
    }

    // Ordena por gravidade
    const gravidadeOrder = { critica: 0, alta: 1, media: 2, baixa: 3 };
    divergencias.sort((a, b) => gravidadeOrder[a.gravidade] - gravidadeOrder[b.gravidade]);

    return Response.json({
      success: true,
      total_divergencias: divergencias.length,
      por_gravidade: {
        critica: divergencias.filter(d => d.gravidade === 'critica').length,
        alta: divergencias.filter(d => d.gravidade === 'alta').length,
        media: divergencias.filter(d => d.gravidade === 'media').length,
        baixa: divergencias.filter(d => d.gravidade === 'baixa').length
      },
      divergencias
    });

  } catch (error) {
    console.error('Erro ao detectar divergências:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// Helper: Detectar duplicidade
async function detectarDuplicidade(base44, workshop_id) {
  const duplicatas = [];

  // Busca transações por valor + data
  const transacoes = await base44.entities.BankTransaction.filter({
    workshop_id,
    status_conciliacao: { $ne: 'ignorado' }
  });

  // Agrupa por valor + data
  const grupos = {};
  for (const tx of transacoes) {
    const chave = `${tx.valor}-${tx.data_operacao}`;
    if (!grupos[chave]) {
      grupos[chave] = [];
    }
    grupos[chave].push(tx);
  }

  // Encontra grupos com mais de 1 transação
  for (const [chave, txs] of Object.entries(grupos)) {
    if (txs.length > 1) {
      // Verifica se são realmente duplicatas (mesma descrição)
      const descricoes = txs.map(t => t.descricao.toLowerCase());
      const descricoesUnicas = [...new Set(descricoes)];

      if (descricoesUnicas.length === 1) {
        duplicatas.push({
          descricao: `${txs.length} transações de R$ ${txs[0].valor} em ${txs[0].data_operacao}`,
          detalhes: {
            valor: txs[0].valor,
            data: txs[0].data_operacao,
            descricao: txs[0].descricao,
            transacoes_ids: txs.map(t => t.id),
            quantidade: txs.length
          }
        });
      }
    }
  }

  return duplicatas;
}