/**
 * dataValor — utilitários de data local e valor monetário (pt-BR)
 *
 * POR QUE EXISTE
 * 1. `new Date().toISOString().split("T")[0]` devolve a data em UTC. No Brasil (UTC-3),
 *    depois das 21h isso já é o dia seguinte: "pago hoje" às 22h grava amanhã, contas
 *    que vencem hoje aparecem como vencidas, e uma baixa feita às 22h do último dia do
 *    mês cai no mês seguinte. `hojeLocal()` usa o fuso do navegador.
 *
 * 2. O parse antigo (`replace(/\./g, "").replace(",", ".")`) tratava todo ponto como
 *    separador de milhar. Um valor vindo do banco como 33.83 virava "3383" ao ser
 *    editado e salvo sem alteração. `parseValorBR` distingue milhar de decimal e
 *    `valorParaInputBR` preenche o campo já no formato brasileiro.
 */

/** YYYY-MM-DD no fuso local. */
export function dataLocalISO(d = new Date()) {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

/** Data de hoje (YYYY-MM-DD) no fuso local. */
export function hojeLocal() {
  return dataLocalISO(new Date());
}

/**
 * Converte texto digitado em número.
 *   "1.234,56" → 1234.56   (padrão BR)
 *   "33,83"    → 33.83
 *   "33.83"    → 33.83     (ponto com 1–2 casas = decimal)
 *   "1.500"    → 1500      (ponto com 3 dígitos = milhar)
 *   "R$ 90"    → 90
 * Retorna NaN para entrada vazia ou inválida.
 */
export function parseValorBR(entrada) {
  if (typeof entrada === "number") return entrada;
  let s = String(entrada ?? "").replace(/R\$/gi, "").replace(/\s/g, "");
  if (!s) return NaN;

  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (!/^-?\d+\.\d{1,2}$/.test(s)) {
    s = s.replace(/\./g, "");
  }
  return parseFloat(s);
}

/** Número → texto para campo de edição no padrão BR ("1.234,50"). */
export function valorParaInputBR(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
