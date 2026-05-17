import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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
      return Response.json({ 
        error: 'ano e workshop_id são obrigatórios' 
      }, { status: 400 });
    }

    // Buscar todos os meses do ano
    const todosLancamentos = [];
    
    for (let mes = 1; mes <= 12; mes++) {
      const mesRef = `${ano}-${String(mes).padStart(2, '0')}`;
      
      // DFCLancamentos manuais
      const dfcManuais = await base44.entities.DFCLancamento.filter({
        workshop_id,
        mes: mesRef,
        origem: "manual"
      });
      
      if (dfcManuais && dfcManuais.length > 0) {
        todosLancamentos.push(...dfcManuais.map(l => ({ ...l, mes: mesRef })));
      }
    }

    // Agrupar por mês
    const meses = [];
    for (let m = 1; m <= 12; m++) {
      const mesRef = `${ano}-${String(m).padStart(2, '0')}`;
      const lancamentosMes = todosLancamentos.filter(l => l.mes === mesRef);
      
      const operacional = lancamentosMes.filter(l => l.grupo === "operacional");
      const investimento = lancamentosMes.filter(l => l.grupo === "investimento");
      const financiamento = lancamentosMes.filter(l => l.grupo === "financiamento");
      
      const calcFluxo = (itens) => itens.reduce((sum, i) => sum + (i.tipo === "entrada" ? i.valor : -i.valor), 0);
      
      meses.push({
        mes: mesRef,
        mes_nome: new Date(ano, m - 1).toLocaleString('pt-BR', { month: 'short' }),
        operacional: calcFluxo(operacional),
        investimento: calcFluxo(investimento),
        financiamento: calcFluxo(financiamento),
        saldo_final: calcFluxo(operacional) + calcFluxo(investimento) + calcFluxo(financiamento)
      });
    }

    // Totais anuais
    const totalAnualOperacional = meses.reduce((sum, m) => sum + m.operacional, 0);
    const totalAnualInvestimento = meses.reduce((sum, m) => sum + m.investimento, 0);
    const totalAnualFinanciamento = meses.reduce((sum, m) => sum + m.financiamento, 0);
    const totalAnualSaldo = totalAnualOperacional + totalAnualInvestimento + totalAnualFinanciamento;
    const mediaMensal = totalAnualSaldo / 12;

    // Agrupar por grupo (anual)
    const gruposMap = {
      operacional: { grupo: "operacional", label: "Operacional", total: 0, entradas: 0, saidas: 0 },
      investimento: { grupo: "investimento", label: "Investimento", total: 0, entradas: 0, saidas: 0 },
      financiamento: { grupo: "financiamento", label: "Financiamento", total: 0, entradas: 0, saidas: 0 }
    };

    todosLancamentos.forEach(l => {
      const grupo = l.grupo;
      if (gruposMap[grupo]) {
        if (l.tipo === "entrada") {
          gruposMap[grupo].entradas += l.valor;
        } else {
          gruposMap[grupo].saidas += l.valor;
        }
        gruposMap[grupo].total += (l.tipo === "entrada" ? l.valor : -l.valor);
      }
    });

    const grupos = Object.values(gruposMap);

    return Response.json({
      success: true,
      ano,
      workshop_id,
      total_anual: {
        operacional: totalAnualOperacional,
        investimento: totalAnualInvestimento,
        financiamento: totalAnualFinanciamento,
        saldo_final: totalAnualSaldo
      },
      media_mensal: {
        operacional: totalAnualOperacional / 12,
        investimento: totalAnualInvestimento / 12,
        financiamento: totalAnualFinanciamento / 12,
        saldo_final: mediaMensal
      },
      meses,
      grupos,
      total_lancamentos: todosLancamentos.length
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      details: error.stack 
    }, { status: 500 });
  }
});