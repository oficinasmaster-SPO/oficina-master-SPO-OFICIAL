import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Mapeamento de categoria DRE → grupo DFC
function mapCategoriaToGrupoDFC(lancamento) {
  const { categoria, subcategoria } = lancamento;
  if (["manutencao"].includes(categoria)) return "investimento";
  if (subcategoria === "Parcelamento de equipamento") return "investimento";
  if (subcategoria === "Compra de imóvel/terreno") return "investimento";
  if (subcategoria === "Financiamento (veículo/imóvel)") return "financiamento";
  if (subcategoria === "Consórcio") return "financiamento";
  if (subcategoria === "Processos judiciais") return "financiamento";
  if (["financeiro"].includes(categoria)) return "financiamento";
  return "operacional";
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { ano, workshop_id } = body;

    if (!ano || !workshop_id) {
      return Response.json({ error: 'ano e workshop_id são obrigatórios' }, { status: 400 });
    }

    // Buscar TODOS os dados do ano em paralelo (uma query por entidade, não 12x cada)
    const [dfcLancamentosAno, dreLancamentosAno] = await Promise.all([
      base44.entities.DFCLancamento.filter(
        { workshop_id, mes: { $gte: `${ano}-01`, $lte: `${ano}-12` } },
        "-created_date", 500
      ),
      base44.entities.DRELancamento.filter(
        { workshop_id, mes: { $gte: `${ano}-01`, $lte: `${ano}-12` } },
        "-created_date", 500
      ),
    ]);

    // Indexar por mês para acesso O(1)
    const dfcPorMes = {};
    const drePorMes = {};

    for (const l of (dfcLancamentosAno || [])) {
      if (!dfcPorMes[l.mes]) dfcPorMes[l.mes] = [];
      dfcPorMes[l.mes].push(l);
    }
    for (const l of (dreLancamentosAno || [])) {
      if (!drePorMes[l.mes]) drePorMes[l.mes] = [];
      drePorMes[l.mes].push(l);
    }

    // Acumuladores para grupos anuais
    const gruposMap = {
      operacional:   { grupo: "operacional",   label: "Operacional",   total: 0, entradas: 0, saidas: 0 },
      investimento:  { grupo: "investimento",  label: "Investimento",  total: 0, entradas: 0, saidas: 0 },
      financiamento: { grupo: "financiamento", label: "Financiamento", total: 0, entradas: 0, saidas: 0 },
    };

    const meses = [];

    for (let m = 1; m <= 12; m++) {
      const mesRef = `${ano}-${String(m).padStart(2, '0')}`;

      const dfcManuais = (dfcPorMes[mesRef] || []).filter(l => l.grupo !== "saldo_inicial" && l.origem === "manual");
      const saldoRecord = (dfcPorMes[mesRef] || []).find(l => l.grupo === "saldo_inicial");

      const dreParaDFC = (drePorMes[mesRef] || []).map(l => ({
        grupo: mapCategoriaToGrupoDFC(l),
        tipo: l.tipo === "receita" ? "entrada" : "saida",
        valor: l.valor || 0,
      }));

      const todosItens = [...dfcManuais, ...dreParaDFC];

      const calcFluxo = (grupo) =>
        todosItens
          .filter(i => i.grupo === grupo)
          .reduce((sum, i) => sum + (i.tipo === "entrada" ? i.valor : -i.valor), 0);

      const operacional   = calcFluxo("operacional");
      const investimento  = calcFluxo("investimento");
      const financiamento = calcFluxo("financiamento");

      // Acumular nos grupos anuais
      for (const item of todosItens) {
        const g = gruposMap[item.grupo];
        if (!g) continue;
        if (item.tipo === "entrada") {
          g.entradas += item.valor;
        } else {
          g.saidas += item.valor;
        }
        g.total += item.tipo === "entrada" ? item.valor : -item.valor;
      }

      const saldoInicial = saldoRecord?.valor ?? saldoRecord?.saldo_inicial ?? 0;

      meses.push({
        mes: mesRef,
        mes_nome: new Date(ano, m - 1).toLocaleString('pt-BR', { month: 'short' }),
        operacional,
        investimento,
        financiamento,
        saldo_inicial: saldoInicial,
        saldo_final: saldoInicial + operacional + investimento + financiamento,
      });
    }

    const totalAnualOperacional   = meses.reduce((s, m) => s + m.operacional,   0);
    const totalAnualInvestimento  = meses.reduce((s, m) => s + m.investimento,  0);
    const totalAnualFinanciamento = meses.reduce((s, m) => s + m.financiamento, 0);
    const totalAnualSaldo         = totalAnualOperacional + totalAnualInvestimento + totalAnualFinanciamento;

    return Response.json({
      success: true,
      ano,
      workshop_id,
      total_anual: {
        operacional:   totalAnualOperacional,
        investimento:  totalAnualInvestimento,
        financiamento: totalAnualFinanciamento,
        saldo_final:   totalAnualSaldo,
      },
      media_mensal: {
        operacional:   totalAnualOperacional  / 12,
        investimento:  totalAnualInvestimento / 12,
        financiamento: totalAnualFinanciamento / 12,
        saldo_final:   totalAnualSaldo        / 12,
      },
      meses,
      grupos: Object.values(gruposMap),
    });

  } catch (error) {
    return Response.json({ error: error.message, details: error.stack }, { status: 500 });
  }
});