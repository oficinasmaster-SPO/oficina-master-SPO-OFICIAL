import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { differenceInDays, startOfDay, startOfWeek, startOfMonth, subMonths } from "date-fns";
import { calcPriorityScore } from "./ds/PriorityScore";
import { isValidWorkshopId } from "@/lib/workshopIdGuard";
import { useFollowupIndex } from "./useFollowupIndex";

const MS_DAY = 1000 * 60 * 60 * 24;

/**
 * Calcula métricas, insight, ações, cobertura, produção e tendência
 * para a Central Operacional, em 3 contextos temporais:
 *
 *   "today"  → Estado operacional (o que resolver AGORA)
 *   "week"   → Performance acumulada desde segunda (produção da semana)
 *   "month"  → Performance acumulada desde o dia 1 (produção do mês)
 *
 * A agregação roda no client sobre dados já cacheados (useFollowupIndex
 * + query leve de pedidos), então trocar de período é instantâneo (sem
 * nova requisição) — consistente com a mitigação de 429 da Central.
 */
export function useSidePanelPriorities({ reminders = [], remindersConcluidos = [], today, userId, period = "today" }) {
  const concluidos = useFollowupIndex().data ?? [];

  const { data: pedidosAbertos = [] } = useQuery({
    queryKey: ["pedidos-internos-abertos-sidepanel", userId || null],
    queryFn: async () => {
      const filter = { status: { $in: ["pendente", "em_analise"] } };
      if (userId) filter.assignee_id = userId;
      return await base44.entities.PedidoInterno.filter(filter, "-created_date", 100);
    },
    staleTime: 3 * 60 * 1000,
  });

  return useMemo(() => {
    const now = Date.now();
    const todayDate = new Date(today + "T00:00:00");

    const startDate =
      period === "today" ? startOfDay(todayDate)
      : period === "week" ? startOfWeek(todayDate, { weekStartsOn: 1 })
      : startOfMonth(todayDate);
    const startMs = startDate.getTime();

    // Janela do período anterior (para tendência)
    const prevStartMs =
      period === "week" ? startMs - 7 * MS_DAY
      : period === "month" ? startOfMonth(subMonths(todayDate, 1)).getTime()
      : null;

    // ── Mapas comuns
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

    const vencidos = reminders.filter(r => !r.is_completed && r.reminder_date && r.reminder_date < today);
    const vencidosOver15 = vencidos.filter(r => {
      const days = differenceInDays(new Date(today + "T00:00:00"), new Date(r.reminder_date + "T00:00:00"));
      return days > 15;
    });

    const totalUniverse = universe.size || 1;
    const pct = (n) => Math.round((n / totalUniverse) * 100);

    // ════════════════════════════════════════════════════════════════════
    // MODO HOJE — estado operacional (sem tendência: não há snapshot anterior)
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
          const days = Math.floor((now - new Date(last)) / MS_DAY);
          if (days > 7) semContato7d.push(wid);
        }
      });

      const naoRespondeuMap = {};
      concluidos.forEach(c => {
        if (c.resultado === "nao_atendeu" && c.workshop_id) {
          const d = c.completedAt || c.created_date;
          if (d && (now - new Date(d)) / MS_DAY <= 30) naoRespondeuMap[c.workshop_id] = true;
        }
      });
      const naoRespondeu = Object.keys(naoRespondeuMap);

      const pedidosByWorkshop = {};
      pedidosAbertos.forEach(p => {
        if (p.workshop_id) pedidosByWorkshop[p.workshop_id] = (pedidosByWorkshop[p.workshop_id] || 0) + 1;
      });
      const pedidosCount = Object.keys(pedidosByWorkshop).length;

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
      ].map(m => ({ ...m, pct: pct(m.count), trend: null }));

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

      // S5: Ações recomendadas — prioriza clientes sem resposta consecutiva
      // Calcula dias consecutivos sem resposta por workshop
      const consecutivosPorWorkshop = {};
      const concluidosPorWs = {};
      concluidos.forEach(c => {
        if (!c.workshop_id) return;
        if (!concluidosPorWs[c.workshop_id]) concluidosPorWs[c.workshop_id] = [];
        concluidosPorWs[c.workshop_id].push(c);
      });
      Object.entries(concluidosPorWs).forEach(([wid, list]) => {
        // Ordena por data mais recente primeiro
        const sorted = list.slice().sort((a, b) => {
          const da = a.completedAt || a.created_date || '';
          const db = b.completedAt || b.created_date || '';
          return db.localeCompare(da);
        });
        let consecutivos = 0;
        for (const c of sorted) {
          if (c.resultado === 'nao_atendeu' || c.resultado === 'aguardando') {
            consecutivos++;
          } else {
            break; // parou de não responder
          }
        }
        if (consecutivos > 0) {
          consecutivosPorWorkshop[wid] = {
            dias: consecutivos,
            nome: nameByWorkshop[wid] || wid,
          };
        }
      });

      // Monta ações: primeiro clientes sem resposta (ordenados por mais dias), depois vencidos
      const actions = [];

      // Clientes sem resposta consecutiva (top 3)
      const semRespostaOrdenados = Object.entries(consecutivosPorWorkshop)
        .sort((a, b) => b[1].dias - a[1].dias)
        .slice(0, 3);

      semRespostaOrdenados.forEach(([wid, info]) => {
        let urgency = 'Média';
        if (info.dias >= 5) urgency = 'Crítica';
        else if (info.dias >= 3) urgency = 'Alta';
        actions.push({
          id: `nr_${wid}`,
          name: info.nome,
          reason: `${info.dias} tentativa${info.dias !== 1 ? 's' : ''} consecutiva${info.dias !== 1 ? 's' : ''} sem resposta. Mude horário ou canal.`,
          urgency,
          reminder: reminders.find(r => r.workshop_id === wid) || null,
        });
      });

      // Vencidos (top 2, se sobrar espaço)
      const maxVencidos = Math.max(0, 5 - actions.length);
      [...vencidos]
        .sort((a, b) => calcPriorityScore(b, today) - calcPriorityScore(a, today))
        .slice(0, maxVencidos)
        .forEach(r => {
          const days = r.reminder_date
            ? differenceInDays(new Date(today + "T00:00:00"), new Date(r.reminder_date + "T00:00:00"))
            : 0;
          let reason = '';
          let urgency = 'Média';
          if (days > 15) { reason = `vencido há ${days} dias`; urgency = 'Crítica'; }
          else if (days > 0) { reason = `vencido há ${days} dia${days !== 1 ? 's' : ''}`; urgency = 'Alta'; }
          else { reason = 'vence hoje'; }
          actions.push({ id: r.id, name: r.workshop_name || 'Cliente', reason, urgency, reminder: r });
        });

      return { metrics, insight, allClear, actions, vencidosOver15Count: vencidosOver15.length,
               coverage: null, production: null, trend: null };
    }

    // ════════════════════════════════════════════════════════════════════
    // MODO SEMANA / MÊS — performance acumulada + tendência vs período anterior
    // ════════════════════════════════════════════════════════════════════
    const inPeriod = (d) => {
      if (!d) return false;
      const t = new Date(d).getTime();
      return t >= startMs && t <= now;
    };
    const inPrev = (d) => {
      if (!d || prevStartMs == null) return false;
      const t = new Date(d).getTime();
      return t >= prevStartMs && t < startMs;
    };

    const concluidosPeriod = concluidos.filter(c => inPeriod(c.completedAt || c.created_date));
    const concluidosPrev = concluidos.filter(c => inPrev(c.completedAt || c.created_date));

    // S4 — Métricas orientadas a CLIENTES (distinct workshop_id), não a follow-ups

    // 1. Empresas atendidas (distinct workshop com ≥1 concluído no período)
    const empresasAtendidasSet = new Set();
    const empresasAtendidasList = [];
    concluidosPeriod.forEach(c => {
      if (c.workshop_id && !empresasAtendidasSet.has(c.workshop_id)) {
        empresasAtendidasSet.add(c.workshop_id);
        empresasAtendidasList.push({ wid: c.workshop_id, name: nameByWorkshop[c.workshop_id] || c.workshop_id });
      }
    });
    const empresasAtendidas = empresasAtendidasSet.size;
    const empresasAtendidasPrevSet = new Set();
    concluidosPrev.forEach(c => { if (c.workshop_id) empresasAtendidasPrevSet.add(c.workshop_id); });

    // 2. Ligações realizadas (total de concluídos com resultado=atendeu — contato efetivo)
    const ligacoesList = concluidosPeriod.filter(c => c.resultado === "atendeu");
    const ligacoes = ligacoesList.length;
    const ligacoesPrev = concluidosPrev.filter(c => c.resultado === "atendeu").length;

    // 3. Empresas com novos FUs (distinct workshop dos FUs criados no período)
    const criadosPeriod = [...reminders, ...remindersConcluidos].filter(r => inPeriod(r.created_date));
    const empresasNovosFuSet = new Set();
    const empresasNovosFuList = [];
    criadosPeriod.forEach(r => {
      if (r.workshop_id && !empresasNovosFuSet.has(r.workshop_id)) {
        empresasNovosFuSet.add(r.workshop_id);
        empresasNovosFuList.push({ wid: r.workshop_id, name: nameByWorkshop[r.workshop_id] || r.workshop_name || r.workshop_id });
      }
    });
    const empresasNovosFu = empresasNovosFuSet.size;
    const empresasNovosFuPrevSet = new Set();
    [...reminders, ...remindersConcluidos].filter(r => inPrev(r.created_date)).forEach(r => {
      if (r.workshop_id) empresasNovosFuPrevSet.add(r.workshop_id);
    });

    // 4. Clientes sem resposta (distinct workshop com nao_atendeu ou aguardando consecutivos)
    const naoRespondeuPeriod = concluidosPeriod.filter(c => c.resultado === "nao_atendeu" || c.resultado === "aguardando");
    const naoRespondeuWorkshops = new Set();
    const naoRespondeuList = [];
    naoRespondeuPeriod.forEach(c => {
      if (c.workshop_id && !naoRespondeuWorkshops.has(c.workshop_id)) {
        naoRespondeuWorkshops.add(c.workshop_id);
        naoRespondeuList.push({ wid: c.workshop_id, name: nameByWorkshop[c.workshop_id] || c.workshop_id });
      }
    });
    const naoRespondeuCount = naoRespondeuWorkshops.size;
    const naoRespondeuPrevWorkshops = new Set();
    concluidosPrev.filter(c => c.resultado === "nao_atendeu" || c.resultado === "aguardando")
      .forEach(c => { if (c.workshop_id) naoRespondeuPrevWorkshops.add(c.workshop_id); });

    // 5. Pedidos abertos (mantido)
    const pedidosPeriod = pedidosAbertos.filter(p => inPeriod(p.created_date));

    // 6. Clientes com FU atrasado (distinct workshop)
    const vencidosWorkshopSet = new Set();
    const vencidosList = [];
    vencidos.forEach(r => {
      if (r.workshop_id && !vencidosWorkshopSet.has(r.workshop_id)) {
        vencidosWorkshopSet.add(r.workshop_id);
        vencidosList.push({ wid: r.workshop_id, name: r.workshop_name || nameByWorkshop[r.workshop_id] || r.workshop_id });
      }
    });
    const clientesAtrasados = vencidosWorkshopSet.size;

    const coverage = Math.round((empresasAtendidas / totalUniverse) * 100);
    const periodLabel = period === "week" ? "semana" : "mês";

    const trendOf = (cur, prev, goodWhenUp) => {
      const delta = cur - prev;
      if (delta === 0) return null;
      return { delta, direction: delta > 0 ? "up" : "down", goodWhenUp };
    };

    const metrics = [
      { id: "empresas_atendidas", spId: "sp_realizados", pillId: "concluidos",
        emoji: "✓", label: "Empresas atendidas", count: empresasAtendidas, color: "green",
        tooltip: `Clientes distintos com ≥1 follow-up concluído nesta ${periodLabel}.`,
        sample: empresasAtendidasList.slice(0, 3).map(e => e.name), pct: coverage,
        trend: trendOf(empresasAtendidas, empresasAtendidasPrevSet.size, true),
        detailItems: empresasAtendidasList },
      { id: "ligacoes_realizadas", spId: "sp_atendidos", pillId: "concluidos",
        emoji: "☎", label: "Ligações realizadas", count: ligacoes, color: "blue",
        tooltip: `Contatos efetivos (resultado: atendeu) nesta ${periodLabel}.`,
        sample: [], pct: 0,
        trend: trendOf(ligacoes, ligacoesPrev, true),
        detailItems: ligacoesList.map(c => ({ wid: c.workshop_id, name: nameByWorkshop[c.workshop_id] || c.workshop_id })) },
      { id: "empresas_novos_fu", spId: "sp_criados", pillId: null,
        emoji: "📅", label: "Novos follow-ups", count: empresasNovosFu, color: "purple",
        tooltip: `Empresas que receberam novos follow-ups nesta ${periodLabel}.`,
        sample: empresasNovosFuList.slice(0, 3).map(e => e.name), pct: 0,
        trend: trendOf(empresasNovosFu, empresasNovosFuPrevSet.size, true),
        detailItems: empresasNovosFuList },
      { id: "nao_respondeu", spId: "sp_nao_respondeu", pillId: "concluidos",
        emoji: "❌", label: "Não responderam", count: naoRespondeuCount, color: "red",
        tooltip: `Clientes com resultado “não atendeu” ou “aguardando” nesta ${periodLabel}.`,
        sample: naoRespondeuList.slice(0, 3).map(e => e.name), pct: pct(naoRespondeuCount),
        trend: trendOf(naoRespondeuCount, naoRespondeuPrevWorkshops.size, false),
        detailItems: naoRespondeuList },
      { id: "pedidos_abertos", spId: "sp_pedidos_abertos", pillId: "concluidos",
        emoji: "📦", label: "Pedidos abertos", count: pedidosPeriod.length, color: "green",
        tooltip: `Pedidos internos abertos nesta ${periodLabel}.`,
        sample: [], pct: 0, trend: null, detailItems: [] },
      { id: "clientes_atrasados", spId: "sp_pendencias", pillId: "atrasados",
        emoji: "⏰", label: "Clientes atrasados", count: clientesAtrasados, color: "orange",
        tooltip: "Clientes distintos com follow-ups vencidos.",
        sample: vencidosList.slice(0, 3).map(e => e.name),
        pct: pct(clientesAtrasados), trend: null,
        detailItems: vencidosList },
    ];

    // Insight gerencial orientado a clientes
    const insightText = period === "month"
      ? (() => {
          const monthName = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(startDate);
          const cap = monthName.charAt(0).toUpperCase() + monthName.slice(1);
          return `${cap}: ${empresasAtendidas} empresas atendidas (${coverage}% da carteira). ${naoRespondeuCount > 0 ? `${naoRespondeuCount} cliente(s) sem resposta.` : ''} ${clientesAtrasados > 0 ? `${clientesAtrasados} cliente(s) com FU atrasado.` : ''}`;
        })()
      : `Nesta semana foram atendidas ${empresasAtendidas} empresas. ${coverage}% da carteira já recebeu atendimento.${naoRespondeuCount > 0 ? ` Ainda existem ${naoRespondeuCount} cliente(s) sem resposta.` : ''}${clientesAtrasados > 0 ? ` ${clientesAtrasados} pendência(s).` : ''}`;

    const insight = { metricId: "empresas_atendidas", text: insightText };
    const allClear = empresasAtendidas > 0 && clientesAtrasados === 0 && naoRespondeuCount === 0;

    // S4: Ações recomendadas orientadas a clientes sem resposta
    const actions = [];
    if (naoRespondeuCount > 0) {
      actions.push({
        id: "wk_nao_respondeu",
        name: `${naoRespondeuCount} cliente(s) sem resposta`,
        reason: "Verifique se já enviaram mensagem. Considere mudar canal ou horário.",
        urgency: naoRespondeuCount >= 5 ? "Alta" : "Média",
        pillId: "concluidos",
      });
    }
    if (clientesAtrasados > 0) {
      actions.push({
        id: "wk_vencidos",
        name: `${clientesAtrasados} cliente(s) com follow-up atrasado`,
        reason: "Priorize a retomada antes de novos atendimentos.",
        urgency: vencidosOver15.length > 0 ? "Crítica" : "Alta",
        pillId: "atrasados",
      });
    }

    const headlineTrend = trendOf(empresasAtendidas, empresasAtendidasPrevSet.size, true);

    return {
      metrics, insight, allClear, actions, vencidosOver15Count: vencidosOver15.length,
      coverage,
      production: { followups: realizados, clients: atendidos },
      trend: headlineTrend ? { variation: headlineTrend.delta, direction: headlineTrend.direction } : null,
    };
  }, [reminders, remindersConcluidos, concluidos, pedidosAbertos, today, period]);
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
    default:
      return "";
  }
}