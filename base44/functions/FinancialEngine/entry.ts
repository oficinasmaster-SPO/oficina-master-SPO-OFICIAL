import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ==================== FINANCIAL ENGINE ====================
function createEngine(base44) {
  const sum = arr => arr.reduce((acc, val) => acc + (val || 0), 0);
  const avg = arr => arr.length === 0 ? 0 : sum(arr) / arr.length;

  const subtrairMes = (mesStr) => {
    const [ano, mes] = mesStr.split('-').map(Number);
    const d = new Date(ano, mes - 1, 1);
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const calcularR70 = (receitas) => {
    const servicos = sum(receitas.filter(r => r.categoria?.includes('Serviço')).map(r => r.valor));
    const total = sum(receitas.map(r => r.valor));
    return total > 0 ? (servicos / total) * 100 : 0;
  };

  const calcularI30 = (receitas) => {
    const pecas = sum(receitas.filter(r => r.categoria?.includes('Peças')).map(r => r.valor));
    const total = sum(receitas.map(r => r.valor));
    return total > 0 ? (pecas / total) * 100 : 0;
  };

  const getDRE = async (mes, workshopId) => {
    const lancamentos = await base44.entities.DRELancamento.filter({ workshop_id: workshopId, mes });
    const receitas = lancamentos.filter(l => l.tipo === 'receita');
    const despesas = lancamentos.filter(l => l.tipo === 'despesa');
    const faturamento = sum(receitas.map(l => l.valor));
    const custosDiretos = sum(despesas.filter(l => l.entra_tcmp2).map(l => l.valor));
    const despesasTotais = sum(despesas.map(l => l.valor));
    const lucro = faturamento - despesasTotais;
    return {
      faturamento,
      custos_diretos: custosDiretos,
      despesas_totais: despesasTotais,
      lucro_liquido: lucro,
      margem_liquida: faturamento > 0 ? (lucro / faturamento) * 100 : 0,
      r70: calcularR70(receitas),
      i30: calcularI30(receitas)
    };
  };

  const getDFC = async (mes, workshopId) => {
    const liquidacoes = await base44.entities.LiquidacaoFinanceira.filter({
      workshop_id: workshopId,
      data_liquidacao: { $gte: `${mes}-01`, $lte: `${mes}-31` }
    });
    const recebimentos = liquidacoes.filter(l => l.tipo === 'recebimento');
    const pagamentos = liquidacoes.filter(l => l.tipo === 'pagamento');
    const entradas = sum(recebimentos.map(l => l.valor_liquido || l.valor_liquidacao));
    const saidas = sum(pagamentos.map(l => l.valor_liquidacao));
    return {
      entradas_totais: entradas,
      saidas_totais: saidas,
      saldo_final: entradas - saidas,
      conciliacao: {
        total: recebimentos.length,
        conciliados: recebimentos.filter(l => l.conciliado).length,
        taxa: recebimentos.length > 0 ? (recebimentos.filter(l => l.conciliado).length / recebimentos.length) * 100 : 0
      }
    };
  };

  const getContasReceber = async (workshopId, filters = {}) => {
    const statusFiltro = filters.status || ['aberto', 'parcial', 'vencido'];
    const contas = await base44.entities.ContaReceber.filter({ 
      workshop_id: workshopId,
      status: { $in: statusFiltro }
    });
    const hoje = new Date().toISOString().slice(0, 10);
    return {
      total: contas.length,
      valor_aberto: sum(contas.map(c => c.valor_aberto)),
      valor_vencido: sum(contas.filter(c => c.data_vencimento < hoje).map(c => c.valor_aberto)),
      dias_atraso_medio: avg(contas.map(c => c.dias_atraso || 0)),
      contas
    };
  };

  const getContasPagar = async (workshopId, filters = {}) => {
    const statusFiltro = filters.status || ['aberto', 'parcial', 'vencido'];
    const contas = await base44.entities.ContaPagar.filter({ 
      workshop_id: workshopId,
      status: { $in: statusFiltro }
    });
    const hoje = new Date().toISOString().slice(0, 10);
    return {
      total: contas.length,
      valor_aberto: sum(contas.map(c => c.valor_aberto)),
      valor_vencido: sum(contas.filter(c => c.data_vencimento < hoje).map(c => c.valor_aberto)),
      contas
    };
  };

  const getKPIs = async (mes, workshopId) => {
    const [dre, dfc, contas] = await Promise.all([
      getDRE(mes, workshopId),
      getDFC(mes, workshopId),
      getContasReceber(workshopId)
    ]);
    return {
      faturamento: dre.faturamento,
      lucro_liquido: dre.lucro_liquido,
      margem_liquida: dre.margem_liquida,
      r70: dre.r70,
      i30: dre.i30,
      caixa_final: dfc.saldo_final,
      entradas: dfc.entradas_totais,
      saidas: dfc.saidas_totais,
      contas_receber_aberto: contas.valor_aberto,
      contas_receber_vencido: contas.valor_vencido,
      inadimplencia: contas.valor_aberto > 0 ? (contas.valor_vencido / contas.valor_aberto) * 100 : 0,
      conciliacao_taxa: dfc.conciliacao?.taxa || 0
    };
  };

  const getBudgetVsActual = async (mes, workshopId) => {
    const [metas, dre] = await Promise.all([
      base44.entities.BudgetMeta.filter({ workshop_id: workshopId, mes }),
      getDRE(mes, workshopId)
    ]);
    const comparacao = metas.map(meta => {
      const realizado = meta.tipo === 'receita' ? dre.faturamento : dre.despesas_totais;
      const metaValor = meta.meta_fixa_rs || 0;
      const atingimento = metaValor > 0 ? (realizado / metaValor) * 100 : 0;
      return {
        ...meta,
        realizado,
        atingimento,
        diferenca: realizado - metaValor,
        status: atingimento >= 100 ? 'acima' : atingimento >= 80 ? 'dentro' : 'abaixo'
      };
    });
    return { metas: comparacao, total_metas: metas.length, atingimento_medio: avg(comparacao.map(c => c.atingimento)) };
  };

  const getCashFlow = async (workshopId) => {
    const [receber, pagar] = await Promise.all([
      getContasReceber(workshopId),
      getContasPagar(workshopId)
    ]);
    return {
      entradas_previstas: receber.valor_aberto,
      saidas_previstas: pagar.valor_aberto,
      saldo_projetado: receber.valor_aberto - pagar.valor_aberto
    };
  };

  const conciliate = async (workshopId, banco) => {
    const [transacoesPendentes, liquidacoesPendentes] = await Promise.all([
      base44.entities.BankTransaction.filter({ workshop_id: workshopId, banco, status_conciliacao: 'pendente' }),
      base44.entities.LiquidacaoFinanceira.filter({ workshop_id: workshopId, conciliado: false })
    ]);
    let conciliadas = 0;
    let divergentes = 0;
    for (const t of transacoesPendentes) {
      const match = liquidacoesPendentes.find(l => {
        const valorMatch = Math.abs(l.valor_liquidacao - t.valor) < 0.01;
        const diffDias = Math.abs((new Date(t.data_operacao) - new Date(l.data_liquidacao)) / (1000 * 60 * 60 * 24));
        return valorMatch && diffDias <= 2;
      });
      if (match) {
        await Promise.all([
          base44.entities.BankTransaction.update(t.id, { liquidacao_financeira_id: match.id, status_conciliacao: 'conciliado', data_conciliacao: new Date().toISOString(), conciliado_por: 'sistema_auto' }),
          base44.entities.LiquidacaoFinanceira.update(match.id, { conciliado: true, data_conciliacao: new Date().toISOString() })
        ]);
        conciliadas++;
      } else {
        await base44.entities.BankTransaction.update(t.id, { status_conciliacao: 'divergente', divergencia_tipo: 'sem_match_sistema' });
        divergentes++;
      }
    }
    const pendentes = transacoesPendentes.length - conciliadas - divergentes;
    return { total: transacoesPendentes.length, conciliadas, pendentes, divergentes, taxa_sucesso: transacoesPendentes.length > 0 ? (conciliadas / transacoesPendentes.length) * 100 : 0 };
  };

  return { getDRE, getDFC, getKPIs, getContasReceber, getContasPagar, getBudgetVsActual, getCashFlow, conciliate };
}

// ==================== HANDLER ====================
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, params } = await req.json();
    const engine = createEngine(base44);

    const actions = {
      'getDRE':           () => engine.getDRE(params.mes, params.workshopId),
      'getDFC':           () => engine.getDFC(params.mes, params.workshopId),
      'getKPIs':          () => engine.getKPIs(params.mes, params.workshopId),
      'getContasReceber': () => engine.getContasReceber(params.workshopId, params.filters),
      'getContasPagar':   () => engine.getContasPagar(params.workshopId, params.filters),
      'getBudgetVsActual':() => engine.getBudgetVsActual(params.mes, params.workshopId),
      'getCashFlow':      () => engine.getCashFlow(params.workshopId),
      'conciliate':       () => engine.conciliate(params.workshopId, params.banco),
    };

    if (!actions[action]) {
      return Response.json({ error: `Ação inválida: ${action}` }, { status: 400 });
    }

    const result = await actions[action]();
    return Response.json(result);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});