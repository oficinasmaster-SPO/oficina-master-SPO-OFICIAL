import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { workshopId, mes } = await req.json();
    if (!workshopId) {
      return Response.json({ error: 'workshopId obrigatório' }, { status: 400 });
    }

    const divergencias = [];
    const hoje = new Date().toISOString().slice(0, 10);

    // 1. Transações bancárias sem match
    const transacoesDivergentes = await base44.entities.BankTransaction.filter({
      workshop_id: workshopId,
      status_conciliacao: 'divergente'
    });

    for (const t of transacoesDivergentes) {
      divergencias.push({
        tipo: 'sem_match_sistema',
        descricao: `Transação bancária sem correspondência: ${t.descricao}`,
        valor: t.valor,
        data: t.data_operacao,
        banco: t.banco,
        severidade: 'alta',
        bank_transaction_id: t.id
      });
    }

    // 2. Liquidações pendentes há mais de 3 dias
    const liquidacoesPendentes = await base44.entities.LiquidacaoFinanceira.filter({
      workshop_id: workshopId,
      conciliado: false
    });

    for (const l of liquidacoesPendentes) {
      const diasPendente = Math.floor((new Date() - new Date(l.data_liquidacao)) / (1000 * 60 * 60 * 24));
      if (diasPendente > 3) {
        divergencias.push({
          tipo: 'liquidacao_nao_conciliada',
          descricao: `Liquidação sem conciliação bancária há ${diasPendente} dias`,
          valor: l.valor_liquidacao,
          data: l.data_liquidacao,
          diasPendente,
          severidade: diasPendente > 7 ? 'alta' : 'media',
          liquidacao_id: l.id
        });
      }
    }

    // 3. Contas vencidas
    const contasVencidas = await base44.entities.ContaReceber.filter({
      workshop_id: workshopId,
      status: { $in: ['aberto', 'parcial'] },
      data_vencimento: { $lt: hoje }
    });

    if (contasVencidas.length > 0) {
      const sum = arr => arr.reduce((a, v) => a + (v || 0), 0);
      divergencias.push({
        tipo: 'inadimplencia',
        descricao: `${contasVencidas.length} contas vencidas sem pagamento`,
        valor: sum(contasVencidas.map(c => c.valor_aberto)),
        severidade: 'media',
        total_contas: contasVencidas.length
      });
    }

    // 4. DRE vs Contas a Receber (por mês)
    if (mes) {
      const [lancamentos, contasMes] = await Promise.all([
        base44.entities.DRELancamento.filter({ workshop_id: workshopId, mes, tipo: 'receita' }),
        base44.entities.ContaReceber.filter({ workshop_id: workshopId, data_emissao: { $gte: `${mes}-01`, $lte: `${mes}-31` } })
      ]);

      const totalDRE = lancamentos.reduce((a, l) => a + l.valor, 0);
      const totalCR = contasMes.reduce((a, c) => a + c.valor_original, 0);
      const dif = Math.abs(totalDRE - totalCR);

      if (dif > 1) {
        divergencias.push({
          tipo: 'dre_vs_contas_receber',
          descricao: `DRE (R$ ${totalDRE.toFixed(2)}) ≠ Contas a Receber (R$ ${totalCR.toFixed(2)})`,
          valor: dif,
          mes,
          severidade: 'critica'
        });
      }
    }

    // Ordena por severidade
    const ordem = { critica: 0, alta: 1, media: 2, baixa: 3 };
    divergencias.sort((a, b) => ordem[a.severidade] - ordem[b.severidade]);

    return Response.json({
      total: divergencias.length,
      criticas: divergencias.filter(d => d.severidade === 'critica').length,
      altas: divergencias.filter(d => d.severidade === 'alta').length,
      medias: divergencias.filter(d => d.severidade === 'media').length,
      divergencias
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});