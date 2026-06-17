import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Mapeamento de categoria DRE → grupo DFC (mesma lógica do mapDREtoDFC.js no frontend)
function mapCategoriaToGrupoDFC(lancamento) {
  const { categoria, subcategoria } = lancamento;

  // Investimento
  if (["manutencao"].includes(categoria)) return "investimento";
  if (subcategoria === "Parcelamento de equipamento") return "investimento";
  if (subcategoria === "Compra de imóvel/terreno") return "investimento";

  // Financiamento
  if (subcategoria === "Financiamento (veículo/imóvel)") return "financiamento";
  if (subcategoria === "Consórcio") return "financiamento";
  if (subcategoria === "Processos judiciais") return "financiamento";
  if (["financeiro"].includes(categoria)) return "financiamento";

  // Padrão: operacional
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

    // Agrupar por mês
    const meses = [];

    for (let m = 1; m <= 12; m++) {
      const mesRef = `${ano}-${String(m).padStart(2, '0')}`;

      // Busca lançamentos manuais do DFC
      const dfcManuais = await base44.entities.DFCLancamento.filter(
        { workshop_id, mes: mesRef, origem: "manual" }, "-created_date", 500
      );

      // Busca lançamentos do DRE e mapeia para grupos DFC
      const dreLancamentos = await base44.entities.DRELancamento.filter(
        { workshop_id, mes: mesRef }, "-created_date", 500
      );

      // Converte DRE → DFC items (mesma lógica do mapDREtoDFC)
      const dreParaDFC = (dreLancamentos || []).map(l => ({
        grupo: mapCategoriaToGrupoDFC(l),
        tipo: l.tipo === "receita" ? "entrada" : "saida",
        valor: l.valor || 0,
        origem: "dre",
      }));

      const todosItens = [
        ...(dfcManuais || []).filter(l => l.grupo !== "saldo_inicial"),
        ...dreParaDFC,
      ];

      const calcFluxo = (grupo) =>
        todosItens
          .filter(i => i.grupo === grupo)
          .reduce((sum, i) => sum + (i.tipo === "entrada" ? i.valor : -i.valor), 0);

      const operacional  = calcFluxo("operacional");
      const investimento = calcFluxo("investimento");
      const financiamento = calcFluxo("financiamento");

      // Saldo inicial do mês
      const saldoRecords = await base44.entities.DFCLancamento.filter(
        { workshop_id, mes: mesRef, grupo: "saldo_inicial" }, "-created_date", 1
      );
      const saldoInicial = saldoRecords?.[0]?.valor ?? saldoRecords?.[0]?.saldo_inicial ?? 0;

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

    // Totais anuais
    const totalAnualOperacional  = meses.reduce((s, m) => s + m.operacional,  0);
    const totalAnualInvestimento = meses.reduce((s, m) => s + m.investimento, 0);
    const totalAnualFinanciamento= meses.reduce((s, m) => s + m.financiamento,0);
    const totalAnualSaldo        = totalAnualOperacional + totalAnualInvestimento + totalAnualFinanciamento;

    // Grupos por entradas/saídas anuais
    const gruposMap = {
      operacional:   { grupo: "operacional",   label: "Operacional",   total: 0, entradas: 0, saidas: 0 },
      investimento:  { grupo: "investimento",  label: "Investimento",  total: 0, entradas: 0, saidas: 0 },
      financiamento: { grupo: "financiamento", label: "Financiamento", total: 0, entradas: 0, saidas: 0 },
    };

    for (let m = 1; m <= 12; m++) {
      const mesRef = `${ano}-${String(m).padStart(2, '0')}`;

      const dfcManuais = await base44.entities.DFCLancamento.filter(
        { workshop_id, mes: mesRef, origem: "manual" }, "-created_date", 500
      );
      const dreLancamentos = await base44.entities.DRELancamento.filter(
        { workshop_id, mes: mesRef }, "-created_date", 500
      );
      const dreParaDFC = (dreLancamentos || []).map(l => ({
        grupo: mapCategoriaToGrupoDFC(l),
        tipo: l.tipo === "receita" ? "entrada" : "saida",
        valor: l.valor || 0,
      }));

      [...(dfcManuais || []).filter(l => l.grupo !== "saldo_inicial"), ...dreParaDFC].forEach(l => {
        const g = gruposMap[l.grupo];
        if (!g) return;
        if (l.tipo === "entrada") {
          g.entradas += l.valor || 0;
        } else {
          g.saidas += l.valor || 0;
        }
        g.total += l.tipo === "entrada" ? (l.valor || 0) : -(l.valor || 0);
      });
    }

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
        financiamento: totalAnualFinanciamento/ 12,
        saldo_final:   totalAnualSaldo        / 12,
      },
      meses,
      grupos: Object.values(gruposMap),
      total_lancamentos: meses.reduce((s, m) => s + (m.operacional !== 0 || m.investimento !== 0 || m.financiamento !== 0 ? 1 : 0), 0),
    });

  } catch (error) {
    return Response.json({ error: error.message, details: error.stack }, { status: 500 });
  }
});