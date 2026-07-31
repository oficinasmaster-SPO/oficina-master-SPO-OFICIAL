import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { differenceInDays, startOfDay, startOfWeek, startOfMonth } from "date-fns";
import { calcPriorityScore } from "./ds/PriorityScore";
import { isValidWorkshopId } from "@/lib/workshopIdGuard";
import { useFollowupIndex } from "./useFollowupIndex";

/**
 * Calcula métricas, insight determinístico e ações recomendadas
 * para a Central Operacional, em 3 contextos temporais:
 *
 *   "today"  → Estado operacional (o que resolver AGORA)
 *   "week"   → Performance acumulada desde segunda (produção da semana)
 *   "month"  → Performance acumulada desde o dia 1 (produção do mês)
 *
 * Reutiliza o cache de FollowUpConcluido (useFollowupIndex) e faz uma
 * query leve de PedidoInterno. Todos os cálculos respeitam `startDate`
 * derivado do período.
 */
export function useSidePanelPriorities({ reminders = [], remindersConcluidos = [], today, userId, period = "today" }) {
  // Índice leve via backend (projeção mínima, últimos 30 dias, top 100).
  // Substitui a leitura de 2000 registros completos. Mesma query key do
  // FollowUpList.useConcluidosIndex → 1 read compartilhado para toda a Central.
  const concluidos = useFollowupIndex();

  // Query leve de pedidos abertos
  const { data: pedidosAbertos = [] } = useQuery({
    queryKey: ["pedidos-internos-abertos-sidepanel"],
    queryFn: async () => {
      return await base44.entities.PedidoInterno.filter(
        { status: { $in: ["pendente", "em_analise"] } },
        "-created_date",
        100
      );
    },
    staleTime: 3 * 60 * 1000,
  });

  return useMemo(() => {
    const msDay = 1000 * 60 * 60 * 24;
    const now = Date.now();
    const todayDate = new Date(today + "T00:00:00");

    // ── Janela temporal do período
    const startDate =
      period === "today" ? startOfDay(todayDate)
      : period === "week" ? startOfWeek(todayDate, { weekStartsOn: 1 })
      : startOfMonth(todayDate);
    const startMs = startDate.getTime();

    // ── Mapas comuns (universo, pendentes, último contato, concluidos, nomes)
    const universe = new Set();
    const pushId = (wid) => { if (isValidWorkshopId(wid)) universe.add(wid); };
    reminders.forEach(r => pushId(r.workshop_id));
    remindersConcluidos.forEach(r => pushId(r.workshop_id));
    concluidos.forEach(c => pushId(c.workshop_id));

    const pendingByWorkshop = {};
    reminders.forEach(r => {
      if (!r.is_completed && r.workshop_id) {
        pendingByWorkshop[r.workshop_id] = (pendingByWorkshop[r.workshop_id] || 0) + 1;
      }
    });

    const lastContactByWorkshop = {};
    concluidos.forEach(c => {
      const d = c.completedAt || c.created_date;
      if (!d || !c.workshop_id) return;
      if (!lastContactByWorkshop[c.workshop_id] || new Date(d) > new Date(lastContactByWorkshop[c.workshop_id])) {
        lastContactByWorkshop[c.workshop_id] = d;
      }
    });

    const concluidosByWorkshop = {};
    concluidos.forEach(c => {
      if (!c.workshop_id) return;
      if (!concluidosByWorkshop[c.workshop_id]) concluidosByWorkshop[c.workshop_id] = [];
      concluidosByWorkshop[c.workshop_id].push(c);
    });

    const nameByWorkshop = {};
    reminders.forEach(r => { if (r.workshop_id && r.workshop_name) nameByWorkshop[r.workshop_id] = r.workshop_name; });
    remindersConcluidos.forEach(r => { if (r.workshop_id && r.workshop_name) nameByWorkshop[r.workshop_id] = r.workshop_name; });

    // Vencidos (estado residual — independente do período)
    const vencidos = reminders.filter(r => !r.is_completed && r.reminder_date && r.reminder_date < today);
    const vencidosOver15 = vencidos.filter(r => {
      const days = differenceInDays(new Date(today + "T00:00:00"), new Date(r.reminder_date + "T00:00:00"));
      return days > 15;
    });

    const totalUniverse = universe.size || 1;
    const pct = (n) => Math.round((n / totalUniverse) * 100);

    // ════════════════════════════════════════════════════════════════════
    // MODO HOJE — estado operacional (comportamento original, intocado)
    // ════════════════════════════════════════════════════════════════════
    if (period === "today") {
      const semFollowup = [];
      universe.forEach(wid => { if (!pendingByWorkshop[wid]) semFollowup.push(wid); });

      const semContato7d = [];
      universe.forEach(wid => {
        const last = lastContactByWorkshop[wid];
        if (!last) {
          if (pendingByWorkshop[wid]) semContato7d.push(wid);
        } else {
          const days = Math.floor((now - new Date(last)) / msDay);
          if (days > 7) semContato7d.push(wid);
        }
      });

      const naoRespondeuMap = {};
      concluidos.forEach(c => {
        if (c.resultado === "nao_atendeu" && c.workshop_id) {
          const d = c.completedAt || c.created_date;
          if (d && (now - new Date(d)) / msDay <= 30) naoRespondeuMap[c.workshop_id] = true;
        }
      });
      const naoRespondeu = Object.keys(naoRespondeuMap);

      const pedidosCount = pedidosAbertos.length;
      const pedidosByWorkshop = {};
      pedidosAbertos.forEach(p => {
        if (p.workshop_id) pedidosByWorkshop[p.workshop_id] = (pedidosByWorkshop[p.workshop_id] || 0) + 1;
      });

      const semContatoRegistrado = [];
      universe.forEach(wid => {
        if (!concluidosByWorkshop[wid] && pendingByWorkshop[wid]) semContatoRegistrado.push(wid);
      });

      const metrics = [
        { id: "sem_followup", spId: "sp_sem_followup", pillId: "por_empresa",
          emoji: "🔴", label: "Sem Follow-up", count: semFollowup.length, color: "red",
          tooltip: "Clientes sem nenhum follow-up pendente cadastrado.",
          sample: semFollowup.slice(0, 3).map(wid => nameByWorkshop[wid]).filter(Boolean) },
        { id: "sem_contato_7d", spId: "sp_sem_contato_7d", pillId: "atrasados",
          emoji: "🟠", label: "+7 dias sem contato", count: semContato7d.length, color: "orange",
          tooltip: "Última interação registrada há mais de sete dias.",
          sample: semContato7d.slice(0, 3).map(wid => nameByWorkshop[wid]).filter(Boolean) },
        { id: "nao_respondeu", spId: "sp_nao_respondeu", pillId: "concluidos",
          emoji: "🔴", label: "Não respondeu", count: naoRespondeu.length, color: "red",
          tooltip: "Últimos follow-ups encerrados com resultado 'Não respondeu'.",
          sample: naoRespondeu.slice(0, 3).map(wid => nameByWorkshop[wid]).filter(Boolean) },
        { id: "pedidos_abertos", spId: "sp_pedidos_abertos", pillId: "concluidos",
          emoji: "🟢", label: "Pedidos abertos", count: pedidosCount, color: "green",
          tooltip: "Clientes com pedidos internos em aberto aguardando novo contato.",
          sample: Object.keys(pedidosByWorkshop).slice(0, 3).map(wid => nameByWorkshop[wid]).filter(Boolean) },
        { id: "vencidos", spId: "sp_vencidos", pillId: "atrasados",
          emoji: "🟣", label: "Vencidos", count: vencidos.length, color: "purple",
          tooltip: "Follow-ups cuja data prevista já expirou.",
          sample: vencidos.slice(0, 3).map(r => r.workshop_name).filter(Boolean) },
        { id: "sem_contato_registrado", spId: "sp_sem_contato_registrado", pillId: "por_empresa",
          emoji: "🔵", label: "Sem contato reg.", count: semContatoRegistrado.length, color: "blue",
          tooltip: "Clientes que ainda não receberam o primeiro contato.",
          sample: semContatoRegistrado.slice(0, 3).map(wid => nameByWorkshop[wid]).filter(Boolean) },
      ].map(m => ({ ...m, pct: pct(m.count) }));

      let insight = null;
      const priorityOrder = ["vencidos", "sem_followup", "sem_contato_7d", "nao_respondeu", "pedidos_abertos"];
      for (const id of priorityOrder) {
        const m = metrics.find(x => x.id === id);
        if (m && m.count > 0) {
          insight = { metricId: id, text: buildInsightText(id, m.count, m.pct, "hoje") };
          break;
        }
      }
      const allClear = !insight;

      const actions = [...vencidos]
        .sort((a, b) => calcPriorityScore(b, today) - calcPriorityScore(a, today))
        .slice(0, 3)
        .map(r => {
          const days = r.reminder_date
            ? differenceInDays(new Date(today + "T00:00:00"), new Date(r.reminder_date + "T00:00:00"))
            : 0;
          let reason = "";
          let urgency = "Média";
          if (days > 15) { reason = `vencido há ${days} dias`; urgency = "Crítica"; }
          else if (days > 0) { reason = `vencido há ${days} dia${days !== 1 ? "s" : ""}`; urgency = "Alta"; }
          else if (r.reminder_date === today) { reason = "vence hoje"; urgency = "Média"; }
          else { reason = "follow-up futuro"; urgency = "Baixa"; }
          if (r.origin_type === "guarda_chuva") reason += " · guarda-chuva";
          return { id: r.id, name: r.workshop_name || "Cliente", reason, urgency, reminder: r };
        });

      return { metrics, insight, allClear, actions, vencidosOver15Count: vencidosOver15.length };
    }

    // ════════════════════════════════════════════════════════════════════
    // MODO SEMANA / MÊS — performance acumulada (produção + pendências)
    // ════════════════════════════════════════════════════════════════════
    const inPeriod = (d) => {
      if (!d) return false;
      const t = new Date(d).getTime();
      return t >= startMs && t <= now;
    };

    const concluidosPeriod = concluidos.filter(c => inPeriod(c.completedAt || c.created_date));
    const realizados = concluidosPeriod.length;

    const atendeuSet = new Set();
    concluidosPeriod.forEach(c => { if (c.resultado === "atendeu" && c.workshop_id) atendeuSet.add(c.workshop_id); });
    const atendidos = atendeuSet.size;

    const naoRespondeuPeriod = concluidosPeriod.filter(c => c.resultado === "nao_atendeu");
    const naoRespondeuCount = naoRespondeuPeriod.length;
    const naoRespondeuWorkshops = new Set(naoRespondeuPeriod.map(c => c.workshop_id).filter(Boolean));

    const criados = [...reminders, ...remindersConcluidos].filter(r => inPeriod(r.created_date)).length;
    const pedidosPeriod = pedidosAbertos.filter(p => inPeriod(p.created_date));
    const pendencias = vencidos.length;

    const pctAtendida = Math.round((atendidos / totalUniverse) * 100);
    const periodLabel = period === "week" ? "semana" : "mês";

    const metrics = [
      { id: "realizados", spId: "sp_realizados", pillId: "concluidos",
        emoji: "✓", label: "Realizados", count: realizados, color: "green",
        tooltip: `Follow-ups com contato registrado nesta ${periodLabel}.`,
        sample: [], pct: 0 },
      { id: "atendidos", spId: "sp_atendidos", pillId: "concluidos",
        emoji: "☎", label: "Atendidos", count: atendidos, color: "blue",
        tooltip: `Clientes distintos que responderam nesta ${periodLabel}.`,
        sample: [], pct: pctAtendida },
      { id: "criados", spId: "sp_criados", pillId: null,
        emoji: "📅", label: "Criados", count: criados, color: "purple",
        tooltip: `Novos follow-ups criados nesta ${periodLabel}.`,
        sample: [], pct: 0 },
      { id: "nao_respondeu", spId: "sp_nao_respondeu", pillId: "concluidos",
        emoji: "❌", label: "Não responderam", count: naoRespondeuCount, color: "red",
        tooltip: `Contatos encerrados sem resposta nesta ${periodLabel}.`,
        sample: [], pct: pct(naoRespondeuWorkshops.size) },
      { id: "pedidos_abertos", spId: "sp_pedidos_abertos", pillId: "concluidos",
        emoji: "📦", label: "Pedidos abertos", count: pedidosPeriod.length, color: "green",
        tooltip: `Pedidos internos abertos nesta ${periodLabel}.`,
        sample: [], pct: 0 },
      { id: "pendencias", spId: "sp_pendencias", pillId: "atrasados",
        emoji: "⏰", label: "Pendências", count: pendencias, color: "orange",
        tooltip: "Follow-ups que seguem vencidos (residual atual).",
        sample: vencidos.slice(0, 3).map(r => r.workshop_name).filter(Boolean),
        pct: pct(pendencias) },
    ];

    const insight = {
      metricId: "realizados",
      text: buildInsightText("realizados_periodo", realizados, pctAtendida, periodLabel, pendencias, naoRespondeuCount),
    };
    const allClear = false;

    const actions = [];
    if (naoRespondeuCount > 0) {
      actions.push({
        id: "wk_nao_respondeu",
        name: `${naoRespondeuCount} cliente(s) ainda não responderam`,
        reason: "Clique para abrir a lista",
        urgency: "Média",
        pillId: "concluidos",
      });
    }
    if (pendencias > 0) {
      actions.push({
        id: "wk_vencidos",
        name: `${pendencias} follow-up(s) continuam vencidos`,
        reason: "Abrir lista de pendências",
        urgency: vencidosOver15.length > 0 ? "Crítica" : "Alta",
        pillId: "atrasados",
      });
    }

    return { metrics, insight, allClear, actions, vencidosOver15Count: vencidosOver15.length };
  }, [reminders, remindersConcluidos, concluidos, pedidosAbertos, today, userId, period]);
}

function buildInsightText(id, count, pct, periodLabel, pendencias = 0, naoRespondeu = 0) {
  switch (id) {
    case "vencidos":
      return `Existem ${count} follow-up(s) vencido(s) (${pct}% da carteira). Priorize a retomada destes clientes antes de novos atendimentos.`;
    case "sem_followup":
      return `Existem ${count} cliente(s) sem follow-up pendente (${pct}% da carteira). Recomendamos iniciar o acompanhamento destes clientes.`;
    case "sem_contato_7d":
      return `Existem ${count} cliente(s) sem contato há mais de 7 dias (${pct}% da carteira). Priorize estes antes dos follow-ups novos.`;
    case "nao_respondeu":
      return `Existem ${count} cliente(s) que não responderam ao último contato (${pct}% da carteira). Considere mudar canal ou horário.`;
    case "pedidos_abertos":
      return `Existem ${count} pedido(s) interno(s) em aberto (${pct}% da carteira) aguardando retorno.`;
    case "realizados_periodo":
      return `Nesta ${periodLabel} foram realizados ${count} follow-up(s). ${pct}% da carteira já foi atendida. Ainda existem ${pendencias} pendência(s) e ${naoRespondeu} sem resposta.`;
    default:
      return "";
  }
}