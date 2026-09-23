// ─────────────────────────────────────────────────────────────────────
// Helpers de manipulação de saldo por conta (Saldo Inicial detalhado DFC).
// Usado por: registrarTransferencia, desfazerTransferencia.
// Fonte única da lógica de débito/crédito por conta — o mesmo formato de
// chave de fonte usado por registrarLiquidacao ("banco:<id>:<nome>",
// "maquina:<id>:<nome>", "caixa:caixa:Caixa").
// ─────────────────────────────────────────────────────────────────────

export function parseFonteKey(fonteKey) {
  const partes = String(fonteKey || "").split(":");
  return {
    tipo: partes[0] || "",
    id: partes[1] || null,
    nome: partes.slice(2).join(":") || "",
  };
}

// Saldo atual da fonte no detalhe do Saldo Inicial.
// Retorna null se a conta não existir no cadastro.
export function saldoDaFonte(detalhes, fonteKey) {
  const { tipo, id } = parseFonteKey(fonteKey);
  if (!detalhes) return null;
  if (tipo === "banco") {
    const b = (detalhes.bancos || []).find((x) => x.id === id);
    return b ? b.saldo ?? 0 : null;
  }
  if (tipo === "maquina") {
    const m = (detalhes.maquinas_cartao || []).find((x) => x.id === id);
    return m ? m.saldo ?? 0 : null;
  }
  if (tipo === "caixa") return detalhes.caixa ?? 0;
  return null;
}

// Aplica um delta (positivo ou negativo) ao saldo de UMA fonte.
// Retorna { detalhes, novoTotal, clampado } — clampado=true quando o saldo
// ficaria negativo e foi zerado (o chamador decide se bloqueia ou avisa).
export function aplicarDelta(detalhes, fonteKey, delta) {
  const { tipo, id } = parseFonteKey(fonteKey);
  const d = {
    bancos: (detalhes?.bancos || []).map((b) => ({ ...b })),
    maquinas_cartao: (detalhes?.maquinas_cartao || []).map((m) => ({ ...m })),
    caixa: detalhes?.caixa || 0,
  };
  let clampado = false;

  const soma = (novo) => {
    if (novo < -0.001) clampado = true;
    return Math.max(0, novo);
  };

  if (tipo === "banco") {
    d.bancos = d.bancos.map((b) => (b.id === id ? { ...b, saldo: soma((b.saldo || 0) + delta) } : b));
  } else if (tipo === "maquina") {
    d.maquinas_cartao = d.maquinas_cartao.map((m) =>
      m.id === id ? { ...m, saldo: soma((m.saldo || 0) + delta) } : m
    );
  } else if (tipo === "caixa") {
    d.caixa = soma(d.caixa + delta);
  }

  const novoTotal =
    d.bancos.reduce((s, b) => s + (b.saldo || 0), 0) +
    d.maquinas_cartao.reduce((s, m) => s + (m.saldo || 0), 0) +
    d.caixa;

  return { detalhes: d, novoTotal, clampado };
}

// Busca o registro de Saldo Inicial do mês (grupo=saldo_inicial), escopado
// pelo RLS do usuário que invoca (user-scoped base44 client).
export async function buscarRegistroSaldo(base44, workshopId, mes) {
  const records = await base44.entities.DFCLancamento.filter(
    { workshop_id: workshopId, mes, grupo: "saldo_inicial" },
    "-created_date",
    1
  );
  return records?.[0] || null;
}

// Rótulo legível da fonte (para descrições e mensagens de erro).
export function rotuloFonte(fonteKey) {
  const { tipo, nome } = parseFonteKey(fonteKey);
  if (tipo === "banco") return `Banco ${nome}`.trim();
  if (tipo === "maquina") return `Máquina ${nome}`.trim();
  if (tipo === "caixa") return "Caixa";
  return String(fonteKey || "—");
}