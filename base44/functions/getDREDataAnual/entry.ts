import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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

    // FIX 2: uma única query para o ano inteiro com limite 500 (antes: 12 queries sequenciais sem limite, truncando em 50/mês)
    const todosLancamentos = await base44.entities.DRELancamento.filter(
      { workshop_id, mes: { $gte: `${ano}-01`, $lte: `${ano}-12` } },
      "-created_date",
      500
    ) || [];

    // Agrupar por mês
    const meses = [];
    for (let m = 1; m <= 12; m++) {
      const mesRef = `${ano}-${String(m).padStart(2, '0')}`;
      const lancamentosMes = todosLancamentos.filter(l => l.mes === mesRef);
      
      const receitas = lancamentosMes.filter(l => l.tipo === "receita");
      const despesas = lancamentosMes.filter(l => l.tipo === "despesa");
      
      const totalReceitas = receitas.reduce((sum, l) => sum + l.valor, 0);
      const totalDespesas = despesas.reduce((sum, l) => sum + l.valor, 0);
      const lucro = totalReceitas - totalDespesas;
      const margem = totalReceitas > 0 ? (lucro / totalReceitas) * 100 : 0;

      meses.push({
        mes: mesRef,
        mes_nome: new Date(ano, m - 1).toLocaleString('pt-BR', { month: 'short' }),
        receitas: totalReceitas,
        despesas: totalDespesas,
        lucro,
        margem
      });
    }

    // Totais anuais
    const totalAnualReceitas = meses.reduce((sum, m) => sum + m.receitas, 0);
    const totalAnualDespesas = meses.reduce((sum, m) => sum + m.despesas, 0);
    const totalAnualLucro = totalAnualReceitas - totalAnualDespesas;
    const mediaMensalReceitas = totalAnualReceitas / 12;
    const mediaMensalDespesas = totalAnualDespesas / 12;
    const mediaMensalLucro = totalAnualLucro / 12;
    const margemMedia = totalAnualReceitas > 0 ? (totalAnualLucro / totalAnualReceitas) * 100 : 0;

    // Labels legíveis por categoria
    const CATEGORIA_LABELS = {
      receita:         "Receita",
      pessoas:         "Pessoas",
      operacional:     "Operacional",
      marketing:       "Marketing",
      manutencao:      "Manutenção",
      terceirizados:   "Terceirizados",
      administrativo:  "Administrativo",
      financeiro:      "Financeiro",
      pecas:           "Peças",
      pecas_estoque:   "Peças (Estoque)",
      pecas_aplicadas: "Peças (Aplicadas)",
      servicos:        "Serviços",
      outras:          "Outras",
    };

    // Agrupar por categoria (anual)
    const categoriasMap = {};

    todosLancamentos.forEach(l => {
      const catKey = l.categoria;
      if (!categoriasMap[catKey]) {
        categoriasMap[catKey] = {
          categoria: catKey,
          label: CATEGORIA_LABELS[catKey] || (catKey ? catKey.charAt(0).toUpperCase() + catKey.slice(1) : "—"),
          tipo: l.tipo,
          total: 0,
          entra_tcmp2: l.entra_tcmp2 ?? true
        };
      }
      categoriasMap[catKey].total += l.valor;
    });

    const categorias = Object.values(categoriasMap).sort((a, b) => b.total - a.total);

    return Response.json({
      success: true,
      ano,
      workshop_id,
      total_anual: {
        receitas: totalAnualReceitas,
        despesas: totalAnualDespesas,
        lucro: totalAnualLucro,
        margem: margemMedia
      },
      media_mensal: {
        receitas: mediaMensalReceitas,
        despesas: mediaMensalDespesas,
        lucro: mediaMensalLucro
      },
      meses,
      categorias,
      total_lancamentos: todosLancamentos.length
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      details: error.stack 
    }, { status: 500 });
  }
});