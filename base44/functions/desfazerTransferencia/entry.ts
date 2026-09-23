import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { buscarRegistroSaldo, aplicarDelta, rotuloFonte } from "../../shared/saldoContas/entry.ts";

// ─────────────────────────────────────────────────────────────────────
// ESTORNO DE TRANSFERÊNCIA ENTRE CONTAS (DFC)
// Localiza o PAR de lançamentos (saída + entrada) pelo transferencia_id,
// devolve o dinheiro à conta de origem, retira da conta de destino e
// deleta os dois lançamentos DFC. Reverte sempre o par completo — nunca
// um lado isolado (o que quebraria a distribuição de saldos).
// Rastreabilidade: motivo obrigatório + SystemEventLog (best-effort).
// ─────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { transferencia_id, motivo } = body;

    if (!transferencia_id) {
      return Response.json({ error: "transferencia_id é obrigatório" }, { status: 400 });
    }
    if (!motivo || !String(motivo).trim()) {
      return Response.json({ error: "Informe o motivo do estorno" }, { status: 400 });
    }

    // ── Localiza o par (filtro user-scoped → RLS garante acesso só à própria oficina) ──
    const registros = await base44.entities.DFCLancamento.filter({ transferencia_id });
    const saida = (registros || []).find((r) => r.tipo === "saida");
    const entrada = (registros || []).find((r) => r.tipo === "entrada");

    if (!saida || !entrada) {
      return Response.json(
        { error: "Transferência não encontrada ou já estornada" },
        { status: 404 }
      );
    }

    const { workshop_id, mes, valor } = saida;
    const avisos = [];

    // ── 1. Reverte os saldos das duas contas no Saldo Inicial do mês ──
    const registroSaldo = await buscarRegistroSaldo(base44, workshop_id, mes);
    if (registroSaldo?.detalhes) {
      const devolve = aplicarDelta(registroSaldo.detalhes, saida.fonte_saida, Number(valor));
      const retira = aplicarDelta(devolve.detalhes, entrada.fonte_entrada, -Number(valor));
      if (retira.clampado) {
        avisos.push(
          `Atenção: o saldo da conta de destino (${rotuloFonte(entrada.fonte_entrada)}) ficou zerado — o dinheiro já pode ter saído por outro lançamento.`
        );
      }
      await base44.entities.DFCLancamento.update(registroSaldo.id, {
        detalhes: retira.detalhes,
        valor: retira.novoTotal,
        saldo_inicial: retira.novoTotal,
      });
    } else {
      avisos.push(
        `Saldo Inicial de ${mes} não encontrado — os lançamentos foram removidos, mas os saldos por conta não puderam ser revertidos.`
      );
    }

    // ── 2. Deleta o par completo ──
    await base44.entities.DFCLancamento.delete(saida.id);
    await base44.entities.DFCLancamento.delete(entrada.id);

    // ── 3. Trilha de auditoria (best-effort — não bloqueia o estorno) ──
    try {
      await base44.entities.SystemEventLog.create({
        event_type: "TRANSFERENCIA_ESTORNADA",
        entity_type: "DFCLancamento",
        entity_id: transferencia_id,
        workshop_id,
        triggered_by: "user",
        status: "success",
        details: {
          motivo: String(motivo).trim(),
          usuario_id: user.id,
          usuario_email: user.email,
          usuario_nome: user.full_name || "",
          valor: Number(valor),
          mes,
          conta_origem: saida.fonte_saida,
          conta_destino: entrada.fonte_entrada,
          descricao: saida.descricao,
          estornado_em: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (_) { /* auditoria best-effort */ }

    return Response.json({
      success: true,
      transferencia_id,
      avisos: avisos.length > 0 ? avisos : undefined,
    });
  } catch (error) {
    console.error("Erro desfazerTransferencia:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});