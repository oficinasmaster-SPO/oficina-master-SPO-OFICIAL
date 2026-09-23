// ─────────────────────────────────────────────────────────────────────────────
// HELPER COMPARTILHADO — Saldo de Contas (DFC Saldo Inicial)
// Usado por: registrarTransferencia, desfazerTransferencia
//
// Fornece as funções utilitárias para localizar o registro de Saldo Inicial
// do mês e movimentar saldos de contas (banco / máquina de cartão / caixa)
// de forma consistente, sem clamp silencioso.
//
// Formato de chave de fonte (fonteKey):
//   banco:<id>:<nome>
//   maquina:<id>:<nome>
//   caixa:caixa:Caixa
//
//   ATENÇÃO: o nome pode conter ":" — por isso o parse usa split com limite 3
//   e agrupa o restante como nome. Nunca use split(":")[1] sem o limite.
// ─────────────────────────────────────────────────────────────────────────────

import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";

// ── Tipos internos ────────────────────────────────────────────────────────────
interface Detalhes {
  bancos: Array<{ id: string; nome: string; tipo_conta?: string; saldo: number; data?: string }>;
  maquinas_cartao: Array<{ id: string; nome: string; gateway_pagamento?: string; saldo: number; data?: string }>;
  caixa: number;
}

interface DeltaResult {
  detalhes: Detalhes;
  novoTotal: number;
  clampado: boolean;
}

// ── Parseia a chave de fonte ──────────────────────────────────────────────────
export function parseFonteKey(key: string): { tipo: string; id: string; nome: string } {
  const partes = String(key || "").split(":");
  const tipo = partes[0] ?? "";
  const id   = partes[1] ?? "";
  const nome = partes.slice(2).join(":") || id; // nome pode ter ":" dentro
  return { tipo, id, nome };
}

// ── Rótulo legível da fonte (igual ao frontend) ───────────────────────────────
export function rotuloFonte(key: string): string {
  if (!key) return "—";
  const { tipo, nome } = parseFonteKey(key);
  if (tipo === "banco")   return `Banco: ${nome}`;
  if (tipo === "maquina") return `Máquina: ${nome}`;
  return "Caixa";
}

// ── Retorna o saldo atual de uma fonte, ou null se não encontrada ─────────────
export function saldoDaFonte(detalhes: Detalhes, fonteKey: string): number | null {
  const { tipo, id } = parseFonteKey(fonteKey);
  if (tipo === "banco") {
    const banco = detalhes.bancos?.find((b) => b.id === id);
    return banco !== undefined ? (banco.saldo ?? 0) : null;
  }
  if (tipo === "maquina") {
    const maq = detalhes.maquinas_cartao?.find((m) => m.id === id);
    return maq !== undefined ? (maq.saldo ?? 0) : null;
  }
  if (tipo === "caixa") {
    return detalhes.caixa ?? 0;
  }
  return null;
}

// ── Aplica um delta (+/-) ao saldo de uma fonte e retorna o detalhes atualizado.
//    clampado=true indica que o saldo teria ficado negativo e foi zerado (aviso, não erro).
export function aplicarDelta(detalhes: Detalhes, fonteKey: string, delta: number): DeltaResult {
  const { tipo, id } = parseFonteKey(fonteKey);
  let clampado = false;

  let bancos         = [...(detalhes.bancos ?? [])];
  let maquinas_cartao = [...(detalhes.maquinas_cartao ?? [])];
  let caixa          = detalhes.caixa ?? 0;

  if (tipo === "banco") {
    bancos = bancos.map((b) => {
      if (b.id !== id) return b;
      const novo = (b.saldo ?? 0) + delta;
      if (novo < 0) clampado = true;
      return { ...b, saldo: Math.max(0, novo) };
    });
  } else if (tipo === "maquina") {
    maquinas_cartao = maquinas_cartao.map((m) => {
      if (m.id !== id) return m;
      const novo = (m.saldo ?? 0) + delta;
      if (novo < 0) clampado = true;
      return { ...m, saldo: Math.max(0, novo) };
    });
  } else if (tipo === "caixa") {
    const novo = caixa + delta;
    if (novo < 0) clampado = true;
    caixa = Math.max(0, novo);
  }

  const novoDetalhes: Detalhes = { bancos, maquinas_cartao, caixa };
  const novoTotal =
    bancos.reduce((s, b) => s + (b.saldo ?? 0), 0) +
    maquinas_cartao.reduce((s, m) => s + (m.saldo ?? 0), 0) +
    caixa;

  return { detalhes: novoDetalhes, novoTotal, clampado };
}

// ── Busca o registro de Saldo Inicial do mês (preferência pelo formato novo: arrays) ──
export async function buscarRegistroSaldo(base44: ReturnType<typeof createClientFromRequest>, workshop_id: string, mes: string) {
  if (!workshop_id || !mes) return null;
  const registros = await base44.entities.DFCLancamento.filter(
    { workshop_id, mes, grupo: "saldo_inicial" },
    "-updated_date",
    10
  );
  if (!registros?.length) return null;
  // Prioriza o registro com arrays (formato novo) sobre o legado (banco/maquina_cartao como number)
  const comArrays = registros.find(
    (r: any) => r.detalhes && (Array.isArray(r.detalhes.bancos) || Array.isArray(r.detalhes.maquinas_cartao))
  );
  return comArrays ?? registros[0];
}
