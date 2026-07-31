import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { differenceInDays } from "date-fns";
import { calcPriorityScore } from "./ds/PriorityScore";
import { isValidWorkshopId } from "@/lib/workshopIdGuard";

/**
 * Calcula métricas, insight determinístico e ações recomendadas
 * para a Central Operacional. Reutiliza o cache de FollowUpConcluido
 * (mesma query key do FollowUpList) e faz uma query leve de PedidoInterno.
 */
export function useSidePanelPriorities({ reminders = [], remindersConcluidos = [], today, userId }) {
  // Reaproveita cache do FollowUpList (mesma query key)
  const { data: concluidos = [] } = useQuery({
    queryKey: ["follow-up-concluidos-list-index-v2"],
    queryFn: () => base44.entities.FollowUpConcluido.list("-completedAt", 2000),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

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

    // Universo de workshop_ids (defesa em profundidade: só IDs válidos entram,
    // impedindo que lixo ("test", "ws-firm-001") polua as métricas do painel)
    const universe = new Set();
    const pushId = (wid) => { if (isValidWorkshopId(wid)) universe.add(wid); };
    reminders.forEach(r => pushId(r.workshop_id));
    remindersConcluidos.forEach(r => pushId(r.workshop_id));
    concluidos.forEach(c => pushId(c.workshop_id));

    // Reminders pendentes por workshop
    const pendingByWorkshop = {};
    reminders.forEach(r => {
      if (!r.is_completed && r.workshop_id) {
        pendingByWorkshop[r.workshop_id] = (pendingByWorkshop[r.workshop_id] || 0) + 1;
      }
    });

    // Último contato por workshop (FollowUpConcluido)
    const lastContactByWorkshop = {};
    concluidos.forEach(c => {
      const d = c.completedAt || c.created_date;
      if (!d || !c.workshop_id) return;
      if (!lastContactByWorkshop[c.workshop_id] || new Date(d) > new Date(lastContactByWorkshop[c.workshop_id])) {
        lastContactByWorkshop[c.workshop_id] = d;
      }
    });

    // Concluidos por workshop
    const concluidosByWorkshop = {};
    concluidos.forEach(c => {
      if (!c.workshop_id) return;
      if (!concluidosByWorkshop[c.workshop_id]) concluidosByWorkshop[c.workshop_id] = [];
      concluidosByWorkshop[c.workshop_id].push(c);
    });

    // Mapa de nomes
    const nameByWorkshop = {};
    reminders.forEach(r => { if (r.workshop_id && r.workshop_name) nameByWorkshop[r.workshop_id] = r.workshop_name; });
    remindersConcluidos.forEach(r => { if (r.workshop_id && r.workshop_name) nameByWorkshop[r.workshop_id] = r.workshop_name; });

    // ── Métrica 1: Sem Follow-up pendente
    const semFollowup = [];
    universe.forEach(wid => { if (!pendingByWorkshop[wid]) semFollowup.push(wid); });

    // ── Métrica 2: +7 dias sem contato
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

    // ── Métrica 3: Não respondeu (últimos 30 dias)
    const naoRespondeuMap = {};
    concluidos.forEach(c => {
      if (c.resultado === "nao_atendeu" && c.workshop_id) {
        const d = c.completedAt || c.created_date;
        if (d && (now - new Date(d)) / msDay <= 30) naoRespondeuMap[c.workshop_id] = true;
      }
    });
    const naoRespondeu = Object.keys(naoRespondeuMap);

    // ── Métrica 4: Pedidos abertos
    const pedidosCount = pedidosAbertos.length;
    const pedidosByWorkshop = {};
    pedidosAbertos.forEach(p => {
      if (p.workshop_id) pedidosByWorkshop[p.workshop_id] = (pedidosByWorkshop[p.workshop_id] || 0) + 1;
    });

    // ── Métrica 5: Vencidos
    const vencidos = reminders.filter(r => !r.is_completed && r.reminder_date && r.reminder_date < today);
    const vencidosOver15 = vencidos.filter(r => {
      const days = differenceInDays(new Date(today + "T00:00:00"), new Date(r.reminder_date + "T00:00:00"));
      return days > 15;
    });

    // ── Métrica 6: Sem contato registrado
    const semContatoRegistrado = [];
    universe.forEach(wid => {
      if (!concluidosByWorkshop[wid] && pendingByWorkshop[wid]) semContatoRegistrado.push(wid);
    });

    const totalUniverse = universe.size || 1;
    const pct = (n) => Math.round((n / totalUniverse) * 100);

    const metrics = [
      {
        id: "sem_followup", spId: "sp_sem_followup", pillId: "por_empresa",
        emoji: "🔴", label: "Sem Follow-up", count: semFollowup.length, color: "red",
        tooltip: "Clientes sem nenhum follow-up pendente cadastrado.",
        sample: semFollowup.slice(0, 3).map(wid => nameByWorkshop[wid]).filter(Boolean),
      },
      {
        id: "sem_contato_7d", spId: "sp_sem_contato_7d", pillId: "atrasados",
        emoji: "🟠", label: "+7 dias sem contato", count: semContato7d.length, color: "orange",
        tooltip: "Última interação registrada há mais de sete dias.",
        sample: semContato7d.slice(0, 3).map(wid => nameByWorkshop[wid]).filter(Boolean),
      },
      {
        id: "nao_respondeu", spId: "sp_nao_respondeu", pillId: "concluidos",
        emoji: "🔴", label: "Não respondeu", count: naoRespondeu.length, color: "red",
        tooltip: "Últimos follow-ups encerrados com resultado 'Não respondeu'.",
        sample: naoRespondeu.slice(0, 3).map(wid => nameByWorkshop[wid]).filter(Boolean),
      },
      {
        id: "pedidos_abertos", spId: "sp_pedidos_abertos", pillId: "concluidos",
        emoji: "🟢", label: "Pedidos abertos", count: pedidosCount, color: "green",
        tooltip: "Clientes com pedidos internos em aberto aguardando novo contato.",
        sample: Object.keys(pedidosByWorkshop).slice(0, 3).map(wid => nameByWorkshop[wid]).filter(Boolean),
      },
      {
        id: "vencidos", spId: "sp_vencidos", pillId: "atrasados",
        emoji: "🟣", label: "Vencidos", count: vencidos.length, color: "purple",
        tooltip: "Follow-ups cuja data prevista já expirou.",
        sample: vencidos.slice(0, 3).map(r => r.workshop_name).filter(Boolean),
      },
      {
        id: "sem_contato_registrado", spId: "sp_sem_contato_registrado", pillId: "por_empresa",
        emoji: "🔵", label: "Sem contato reg.", count: semContatoRegistrado.length, color: "blue",
        tooltip: "Clientes que ainda não receberam o primeiro contato.",
        sample: semContatoRegistrado.slice(0, 3).map(wid => nameByWorkshop[wid]).filter(Boolean),
      },
    ].map(m => ({ ...m, pct: pct(m.count) }));

    // ── Insight determinístico
    let insight = null;
    const priorityOrder = ["vencidos", "sem_followup", "sem_contato_7d", "nao_respondeu", "pedidos_abertos"];
    for (const id of priorityOrder) {
      const m = metrics.find(x => x.id === id);
      if (m && m.count > 0) {
        insight = { metricId: id, text: buildInsightText(id, m.count, m.pct) };
        break;
      }
    }
    const allClear = !insight;

    // ── Ações recomendadas (top 3 por prioridade)
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
  }, [reminders, remindersConcluidos, concluidos, pedidosAbertos, today, userId]);
}

function buildInsightText(id, count, pct) {
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
    default:
      return "";
  }
}