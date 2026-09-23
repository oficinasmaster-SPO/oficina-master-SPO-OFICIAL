import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { buscarRegistroSaldo, saldoDaFonte, aplicarDelta, rotuloFonte } from "../../shared/saldoContas/entry.ts";

// ─────────────────────────────────────────────────────────────────────
// TRANSFERÊNCIA ENTRE CONTAS (DFC)
// Registra a movimentação de dinheiro entre contas da própria oficina
// (banco → caixa, máquina de cartão → banco etc.) como UM PAR de
// lançamentos DFC (grupo=transferencia, saída + entrada) amarrados pelo
// mesmo transferencia_id, e movimenta os saldos das duas contas no
// registro de Saldo Inicial do mês.
//
// Regra contábil (definição do financeiro/BPO):
//   Tipo      → "Transferência entre contas"  (grupo/origem = transferencia)
//   Categoria → "Transferência interna / Movimentação entre contas"
// O grupo `transferencia` fica FORA do resultado do mês (DRE) e do saldo
// consolidado (o par se cancela) — altera apenas a DISTRIBUIÇÃO entre contas.
//
// Classificação exata exigida:
//   - categoria/descrição: "Transferência interna / Movimentação entre contas"
// ─────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { workshop_id, fonte_origem, fonte_destino, valor, data, descricao } = body;

    // ── Validações ──
    if (!workshop_id || !fonte_origem || !fonte_destino || !valor || !data) {
      return Response.json(
        { error: "Parâmetros obrigatórios: workshop_id, fonte_origem, fonte_destino, valor, data" },
        { status: 400 }
      );
    }
    if (!(Number(valor) > 0)) {
      return Response.json({ error: "Valor deve ser maior que zero" }, { status: 400 });
    }
    if (String(fonte_origem) === String(fonte_destino)) {
      return Response.json(
        { error: "A conta de origem e a conta de destino devem ser diferentes" },
        { status: 400 }
      );
    }

    const mes = String(data).slice(0, 7);

    // ── Saldo Inicial do mês da transferência (mesma regra do registrarLiquidacao:
    //    o dinheiro se move no mês da DATA informada) ──
    const registroSaldo = await buscarRegistroSaldo(base44, workshop_id, mes);
    if (!registroSaldo?.detalhes) {
      return Response.json(
        {
          error: `Nenhum Saldo Inicial configurado para ${mes}. Configure o Saldo Inicial Detalhado (bancos, máquinas e caixa) antes de transferir entre contas.`,
        },
        { status: 400 }
      );
    }

    const detalhes = registroSaldo.detalhes;

    // Contas precisam existir no cadastro do mês
    const saldoOrigem = saldoDaFonte(detalhes, fonte_origem);
    if (saldoOrigem === null) {
      return Response.json(
        { error: `Conta de origem (${rotuloFonte(fonte_origem)}) não encontrada no Saldo Inicial de ${mes}` },
        { status: 400 }
      );
    }
    const saldoDestino = saldoDaFonte(detalhes, fonte_destino);
    if (saldoDestino === null) {
      return Response.json(
        { error: `Conta de destino (${rotuloFonte(fonte_destino)}) não encontrada no Saldo Inicial de ${mes}` },
        { status: 400 }
      );
    }

    // Regra do CFO: sem clamp silencioso — saldo insuficiente BLOQUEIA
    if (saldoOrigem + 0.001 < Number(valor)) {
      return Response.json(
        {
          error: `Saldo insuficiente na conta ${rotuloFonte(fonte_origem)}. Disponível: R$ ${saldoOrigem.toFixed(2)}, transferência: R$ ${Number(valor).toFixed(2)}`,
        },
        { status: 400 }
      );
    }

    // ── Cria o par de lançamentos (transferencia_id amarra os dois lados
    //    para o estorno reverter sempre o par completo) ──
    const transferencia_id = crypto.randomUUID();
    const descricaoBase =
      String(descricao || "").trim() ||
      `Transferência interna / Movimentação entre contas — ${rotuloFonte(fonte_origem)} → ${rotuloFonte(fonte_destino)}`;

    await base44.entities.DFCLancamento.create({
      workshop_id,
      mes,
      grupo: "transferencia",
      origem: "transferencia",
      tipo: "saida",
      descricao: descricaoBase,
      valor: Number(valor),
      fonte_saida: fonte_origem,
      transferencia_id,
    });

    await base44.entities.DFCLancamento.create({
      workshop_id,
      mes,
      grupo: "transferencia",
      origem: "transferencia",
      tipo: "entrada",
      descricao: descricaoBase,
      valor: Number(valor),
      fonte_entrada: fonte_destino,
      transferencia_id,
    });

    // ── Movimenta os dois saldos no Saldo Inicial (débito + crédito
    //    calculados juntos, uma única gravação) ──
    const debito = aplicarDelta(detalhes, fonte_origem, -Number(valor));
    const credito = aplicarDelta(debito.detalhes, fonte_destino, Number(valor));

    await base44.entities.DFCLancamento.update(registroSaldo.id, {
      detalhes: credito.detalhes,
      valor: credito.novoTotal,
      saldo_inicial: credito.novoTotal,
    });

    return Response.json({
      success: true,
      transferencia_id,
      mes,
      novo_saldo_total: credito.novoTotal,
      descricao: descricaoBase,
    });
  } catch (error) {
    console.error("Erro registrarTransferencia:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});