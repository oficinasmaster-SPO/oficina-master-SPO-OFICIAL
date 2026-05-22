import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { FinancialEngine } from './FinancialEngine.js';

// Detecta divergências financeiras entre sistema e banco
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { workshopId, mes } = await req.json();
    if (!workshopId) {
      return Response.json({ error: 'workshopId obrigatório' }, { status: 400 });
    }

    const engine = new FinancialEngine(base44);
    const divergencias = [];

    // 1. Transações bancárias divergentes (banco tem, sistema não)
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

    // 2. Liquidações pendentes de conciliação
    const liquidacoesPendentes = await base44.entities.LiquidacaoFinanceira.filter({
      workshop_id: workshopId,
      conciliado: false
    });

    const hoje = new Date();
    for (const l of liquidacoesPendentes) {
      const dataLiq = new Date(l.data_liquidacao);
      const diasPendente = Math.floor((hoje - dataLiq) / (1000 * 60 * 60 * 24));
      
      if (diasPendente > 3) { // Pendente há mais de 3 dias
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

    // 3. Contas vencidas sem pagamento
    const contasVencidas = await engine.getContasVencidas(workshopId);
    if (contasVencidas.total > 0) {
      divergencias.push({
        tipo: 'inadimplencia',
        descricao: `${contasVencidas.total} contas vencidas sem pagamento`,
        valor: contasVencidas.valor_vencido,
        severidade: 'media',
        total_contas: contasVencidas.total
      });
    }

    // 4. DRE vs Contas a Receber (se passado um mês)
    if (mes) {
      const dre = await engine.getDRE(mes, workshopId);
      const contasMes = await base44.entities.ContaReceber.filter({
        workshop_id: workshopId,
        data_emissao: { $gte: `${mes}-01`, $lte: `${mes}-31` }
      });
      
      const totalContasMes = engine.sum(contasMes.map(c => c.valor_original));
      const difDreCr = Math.abs(dre.faturamento - totalContasMes);
      
      if (difDreCr > 1) { // tolerância de R$ 1
        divergencias.push({
          tipo: 'dre_vs_contas_receber',
          descricao: `DRE (R$ ${dre.faturamento.toFixed(2)}) ≠ Contas a Receber (R$ ${totalContasMes.toFixed(2)})`,
          valor: difDreCr,
          mes,
          severidade: 'critica'
        });
      }
    }

    // Ordena por severidade
    const ordemSeveridade = { critica: 0, alta: 1, media: 2, baixa: 3 };
    divergencias.sort((a, b) => ordemSeveridade[a.severidade] - ordemSeveridade[b.severidade]);

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