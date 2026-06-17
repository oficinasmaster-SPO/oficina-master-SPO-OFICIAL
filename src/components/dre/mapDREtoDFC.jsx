/**
 * mapDREtoDFC — converte DRELancamento[] em itens do DFC
 *
 * IMPORTANTE (Fase 4 - Subcategorias):
 * O mapeamento usa o campo `categoria` (categoria pai), NÃO usa `subcategoria`.
 * Subcategorias herdam automaticamente o grupo DFC da categoria pai.
 * Exemplo: categoria="financeiro", subcategoria="Financiamento veículo" → grupo="financiamento"
 *
 * Regras de mapeamento:
 *  receitas                                        → Operacional / Entrada
 *  pessoas, operacional, marketing, administrativo,
 *  terceirizados, pecas_estoque, pecas_aplicadas,
 *  servicos, outras (despesas genéricas)           → Operacional / Saída
 *  manutenção de equipamento                       → Investimento / Saída
 *  compra de imóvel / terreno                      → Investimento / Saída
 *  financeiro (financiamento, consórcio,
 *    parcelamento equipamento, boleto peças)       → Financiamento / Saída
 */

const SUBCATS_FINANCIAMENTO = [
  "financiamento",
  "consorcio",
  "consórcio",
  "parcelamento",
  "boleto",
  "empréstimo",
  "emprestimo",
  "juros",
  "loan",
];

const SUBCATS_INVESTIMENTO = [
  "equipamento",
  "maquina",
  "máquina",
  "reforma",
  "obra",
  "instalacao",
  "instalação",
  "terreno",
  "imóvel",
  "imovel",
  "predial",
];

function normalizar(str) {
  return (str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function contemPalavra(texto, palavras) {
  const n = normalizar(texto);
  return palavras.some(p => n.includes(normalizar(p)));
}

export function mapDREtoDFC(lancamentos = []) {
  return lancamentos.map(l => {
    const cat = l.categoria || "";
    const sub = l.subcategoria || "";
    const desc = l.descricao || sub || cat;

    // Campos de data e status — propagados para ProjecaoCaixaView e badges de status
    const dataVencimento = l.data_vencimento || null;
    const dataPagamento  = l.data_pagamento  || null;
    const statusConta    = l.status_conta    || null;

    // --- ENTRADAS ---
    if (l.tipo === "receita") {
      return {
        id: l.id,
        descricao: desc,
        valor: l.valor,
        tipo: "entrada",
        grupo: "operacional",
        origem: "dre_automatico",
        data_vencimento: dataVencimento,
        data_pagamento:  dataPagamento,
        status_conta:    statusConta,
      };
    }

    // --- DESPESAS → determinar grupo ---
    let grupo = "operacional"; // default

    // 1. Financiamento: categoria financeiro com subcategorias financeiras
    if (cat === "financeiro" && contemPalavra(sub, SUBCATS_FINANCIAMENTO)) {
      grupo = "financiamento";
    }
    // 2. Investimento: manutenção de equipamento ou compra de imóvel/terreno
    else if (
      (cat === "manutencao" && contemPalavra(sub, SUBCATS_INVESTIMENTO)) ||
      (cat === "financeiro" && contemPalavra(sub, ["terreno", "imovel", "imóvel", "predial"]))
    ) {
      grupo = "investimento";
    }
    // 3. Tudo mais → Operacional

    return {
      id: l.id,
      descricao: desc,
      valor: l.valor,
      tipo: "saida",
      grupo,
      origem: "dre_automatico",
      data_vencimento: dataVencimento,
      data_pagamento:  dataPagamento,
      status_conta:    statusConta,
    };
  });
}