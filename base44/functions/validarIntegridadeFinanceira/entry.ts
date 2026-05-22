import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Valida integridade dos dados financeiros
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { workshop_id, mes } = await req.json();
    if (!workshop_id) {
      return Response.json({ error: 'workshop_id obrigatório' }, { status: 400 });
    }

    const divergencias = [];

    // 1. DRE vs ContaReceber
    const dreReceitas = await base44.entities.DRELancamento.filter({
      workshop_id,
      mes,
      tipo: 'receita'
    });
    const totalDRE = dreReceitas.reduce((sum, l) => sum + l.valor, 0);

    const contasReceber = await base44.entities.ContaReceber.filter({
      workshop_id
    });
    const totalCR = contasReceber.reduce((sum, c) => sum + c.valor_original, 0);

    const difDRE_CR = Math.abs(totalDRE - totalCR);
    if (difDRE_CR > 1) {
      divergencias.push({
        tipo: 'dre_vs_contas_receber',
        descricao: `DRE (R$ ${totalDRE.toFixed(2)}) ≠ ContasReceber (R$ ${totalCR.toFixed(2)})`,
        diferenca: difDRE_CR,
        severidade: 'critica'
      });
    }

    // 2. DFC vs Liquidações
    const liquidacoes = await base44.entities.LiquidacaoFinanceira.filter({
      workshop_id
    });
    const recebimentos = liquidacoes.filter(l => l.tipo === 'recebimento');
    const totalLiq = recebimentos.reduce((sum, l) => sum + l.valor_liquido, 0);

    const difDFC_Liq = Math.abs(totalDRE - totalLiq);
    if (difDFC_Liq > 1) {
      divergencias.push({
        tipo: 'dfc_vs_liquidacoes',
        descricao: `Receitas DRE (R$ ${totalDRE.toFixed(2)}) ≠ Recebimentos (R$ ${totalLiq.toFixed(2)})`,
        diferenca: difDFC_Liq,
        severidade: 'critica'
      });
    }

    // 3. ContasReceber sem Liquidação
    const crSemLiq = contasReceber.filter(cr => {
      return !liquidacoes.some(l => l.conta_receber_id === cr.id && l.tipo === 'recebimento');
    });
    if (crSemLiq.length > 0) {
      divergencias.push({
        tipo: 'contas_receber_sem_liquidacao',
        descricao: `${crSemLiq.length} ContasReceber sem liquidação`,
        quantidade: crSemLiq.length,
        severidade: 'alta'
      });
    }

    // 4. Liquidações sem ContaReceber
    const liqSemCR = liquidacoes.filter(l => 
      l.tipo === 'recebimento' && l.conta_receber_id && 
      !contasReceber.some(cr => cr.id === l.conta_receber_id)
    );
    if (liqSemCR.length > 0) {
      divergencias.push({
        tipo: 'liquidacoes_sem_conta_receber',
        descricao: `${liqSemCR.length} Liquidações sem ContaReceber`,
        quantidade: liqSemCR.length,
        severidade: 'alta'
      });
    }

    // 5. Snapshots inconsistentes
    if (mes) {
      const snapshot = await base44.entities.FinancialMonthSnapshot.filter({
        workshop_id,
        mes,
        status: 'fechado'
      });

      if (snapshot.length > 0) {
        const s = snapshot[0];
        const difFaturamento = Math.abs(s.dre_faturamento_total - totalDRE);
        if (difFaturamento > 1) {
          divergencias.push({
            tipo: 'snapshot_inconsistente',
            descricao: `Snapshot faturamento (R$ ${s.dre_faturamento_total.toFixed(2)}) ≠ DRE atual (R$ ${totalDRE.toFixed(2)})`,
            diferenca: difFaturamento,
            severidade: 'critica'
          });
        }
      }
    }

    // Ordena por severidade
    const ordem = { critica: 0, alta: 1, media: 2, baixa: 3 };
    divergencias.sort((a, b) => ordem[a.severidade] - ordem[b.severidade]);

    return Response.json({
      workshop_id,
      mes,
      total_divergencias: divergencias.length,
      criticas: divergencias.filter(d => d.severidade === 'critica').length,
      altas: divergencias.filter(d => d.severidade === 'alta').length,
      integridade: divergencias.length === 0 ? 'OK' : 'DIVERGENCIAS_ENCONTRADAS',
      divergencias
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});