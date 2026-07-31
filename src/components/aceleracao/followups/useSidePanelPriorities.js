import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { differenceInDays } from "date-fns";
import { calcPriorityScore } from "./ds/PriorityScore";
import { isValidWorkshopId } from "@/lib/workshopIdGuard";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

/** Ordem de prioridade para escolha do insight exibido no painel. */
const PRIORITY_ORDER = ["vencidos", "sem_followup", "sem_contato_7d", "nao_respondeu", "pedidos_abertos"];

/** Builders de texto para cada insight. */
const INSIGHT_BUILDERS = {
  vencidos:             (count, pct) => `Existem ${count} follow-up(s) vencido(s) (${pct}% da carteira). Priorize a retomada destes clientes antes de novos atendimentos.`,
  sem_followup:         (count, pct) => `Existem ${count} cliente(s) sem follow-up pendente (${pct}% da carteira). Recomendamos iniciar o acompanhamento destes clientes.`,
  sem_contato_7d:       (count, pct) => `Existem ${count} cliente(s) sem contato há mais de 7 dias (${pct}% da carteira). Priorize estes antes dos follow-ups novos.`,
  nao_respondeu:        (count, pct) => `Existem ${count} cliente(s) que não responderam ao último contato (${pct}% da carteira). Considere mudar canal ou horário.`,
  pedidos_abertos:      (count, pct) => `Existem ${count} pedido(s) interno(s) em aberto (${pct}% da carteira) aguardando retorno.`,
};

const MS_DAY      = 1000 * 60 * 60 * 24;
const DIAS_INATIVO = 7;
const DIAS_NAO_RESPONDEU = 30;
const DIAS_VENCIDO_CRITICO = 15;
const SAMPLE_SIZE = 3;
const TOP_ACTIONS  = 3;

// ─────────────────────────────────────────────
// Helpers puros (testáveis isoladamente)
// ─────────────────────────────────────────────

/** Extrai até N nomes de workshop a partir de uma lista de IDs. */
function sampleNames(wids, nameByWorkshop, n = SAMPLE_SIZE) {
  return wids.slice(0, n).map((wid) => nameByWorkshop.get(wid)).filter(Boolean);
}

/**
 * Uma única passada sobre `concluidos` constrói todos os índices derivados.
 *
 * @param {Array}  concluidos
 * @param {number} now          - Date.now()
 * @param {Set}    universe     - mutado in-place
 * @returns {{ lastContact: Map, concluidosByWorkshop: Map, naoRespondeuSet: Set }}
 */
function buildConcluidosIndexes(concluidos, now, universe) {
  const lastContact          = new Map(); // wid → timestamp
  const concluidosByWorkshop = new Map(); // wid → []
  const naoRespondeuSet      = new Set(); // wids

  for (const c of concluidos) {
    const wid = c.workshop_id;
    if (!wid || !isValidWorkshopId(wid)) continue;
    universe.add(wid);

    // lastContact
    const raw = c.completedAt || c.created_date;
    if (raw) {
      const ts = Date.parse(raw);
      if (!isNaN(ts) && ts > (lastContact.get(wid) ?? 0)) {
        lastContact.set(wid, ts);
      }
    }

    // concluidosByWorkshop
    if (!concluidosByWorkshop.has(wid)) concluidosByWorkshop.set(wid, []);
    concluidosByWorkshop.get(wid).push(c);

    // naoRespondeu (últimos N dias)
    if (c.resultado === "nao_atendeu" && raw) {
      const ts = Date.parse(raw);
      if (!isNaN(ts) && (now - ts) / MS_DAY <= DIAS_NAO_RESPONDEU) {
        naoRespondeuSet.add(wid);
      }
    }
  }

  return { lastContact, concluidosByWorkshop, naoRespondeuSet };
}

/**
 * Uma única passada sobre `reminders` constrói pendingByWorkshop, nameByWorkshop
 * e acumula workshop_ids no universe.
 */
function buildRemindersIndexes(reminders, universe) {
  const pendingByWorkshop = new Map(); // wid → count
  const nameByWorkshop    = new Map(); // wid → nome

  for (const r of reminders) {
    const wid = r.workshop_id;
    if (!wid || !isValidWorkshopId(wid)) continue;
    universe.add(wid);
    if (r.workshop_name) nameByWorkshop.set(wid, r.workshop_name);
    if (!r.is_completed) {
      pendingByWorkshop.set(wid, (pendingByWorkshop.get(wid) ?? 0) + 1);
    }
  }

  return { pendingByWorkshop, nameByWorkshop };
}

/** Complementa nameByWorkshop com nomes dos concluídos. */
function enrichNames(remindersConcluidos, nameByWorkshop, universe) {
  for (const r of remindersConcluidos) {
    const wid = r.workshop_id;
    if (!wid || !isValidWorkshopId(wid)) continue;
    universe.add(wid);
    if (r.workshop_name && !nameByWorkshop.has(wid)) {
      nameByWorkshop.set(wid, r.workshop_name);
    }
  }
}

/** Calcula as 6 métricas a partir dos índices já construídos. */
function buildMetrics({
  universe,
  workshopIds,
  pendingByWorkshop,
  lastContact,
  concluidosByWorkshop,
  naoRespondeuSet,
  pedidosAbertos,
  reminders,
  nameByWorkshop,
  today,
  todayDate,
  now,
}) {
  const pct = (n) => Math.round((n / (universe.size || 1)) * 100);

  // pedidos
  const pedidosByWorkshop = new Map();
  for (const p of pedidosAbertos) {
    if (p.workshop_id) pedidosByWorkshop.set(p.workshop_id, (pedidosByWorkshop.get(p.workshop_id) ?? 0) + 1);
  }

  // sem follow-up pendente
  const semFollowup = workshopIds.filter((wid) => !pendingByWorkshop.has(wid));

  // +N dias sem contato
  const semContato7d = workshopIds.filter((wid) => {
    const ts = lastContact.get(wid);
    if (!ts) return pendingByWorkshop.has(wid); // nunca contatado mas tem pending
    return (now - ts) / MS_DAY > DIAS_INATIVO;
  });

  // não respondeu
  const naoRespondeu = [...naoRespondeuSet];

  // vencidos
  const vencidos = reminders.filter(
    (r) => !r.is_completed && r.reminder_date && r.reminder_date < today
  );
  const vencidosOver15 = vencidos.filter((r) => {
    const days = differenceInDays(todayDate, new Date(`${r.reminder_date}T00:00:00`));
    return days > DIAS_VENCIDO_CRITICO;
  });

  // sem contato registrado
  const semContatoRegistrado = workshopIds.filter(
    (wid) => !concluidosByWorkshop.has(wid) && pendingByWorkshop.has(wid)
  );

  return {
    metrics: [
      {
        id: "sem_followup", spId: "sp_sem_followup", pillId: "por_empresa",
        emoji: "🔴", label: "Sem Follow-up", count: semFollowup.length, color: "red",
        tooltip: "Clientes sem nenhum follow-up pendente cadastrado.",
        sample: sampleNames(semFollowup, nameByWorkshop),
      },
      {
        id: "sem_contato_7d", spId: "sp_sem_contato_7d", pillId: "atrasados",
        emoji: "🟠", label: "+7 dias sem contato", count: semContato7d.length, color: "orange",
        tooltip: "Última interação registrada há mais de sete dias.",
        sample: sampleNames(semContato7d, nameByWorkshop),
      },
      {
        id: "nao_respondeu", spId: "sp_nao_respondeu", pillId: "concluidos",
        emoji: "🔴", label: "Não respondeu", count: naoRespondeu.length, color: "red",
        tooltip: "Últimos follow-ups encerrados com resultado 'Não respondeu'.",
        sample: sampleNames(naoRespondeu, nameByWorkshop),
      },
      {
        id: "pedidos_abertos", spId: "sp_pedidos_abertos", pillId: "concluidos",
        emoji: "🟢", label: "Pedidos abertos", count: pedidosAbertos.length, color: "green",
        tooltip: "Clientes com pedidos internos em aberto aguardando novo contato.",
        sample: sampleNames([...pedidosByWorkshop.keys()], nameByWorkshop),
      },
      {
        id: "vencidos", spId: "sp_vencidos", pillId: "atrasados",
        emoji: "🟣", label: "Vencidos", count: vencidos.length, color: "purple",
        tooltip: "Follow-ups cuja data prevista já expirou.",
        sample: vencidos.slice(0, SAMPLE_SIZE).map((r) => r.workshop_name).filter(Boolean),
      },
      {
        id: "sem_contato_registrado", spId: "sp_sem_contato_registrado", pillId: "por_empresa",
        emoji: "🔵", label: "Sem contato reg.", count: semContatoRegistrado.length, color: "blue",
        tooltip: "Clientes que ainda não receberam o primeiro contato.",
        sample: sampleNames(semContatoRegistrado, nameByWorkshop),
      },
    ].map((m) => ({ ...m, pct: pct(m.count) })),
    vencidos,
    vencidosOver15Count: vencidosOver15.length,
  };
}

/** Escolhe o insight de maior prioridade com contagem > 0. */
function buildInsight(metricsById) {
  for (const id of PRIORITY_ORDER) {
    const m = metricsById.get(id);
    if (m?.count > 0) {
      const builder = INSIGHT_BUILDERS[id];
      return { metricId: id, text: builder ? builder(m.count, m.pct) : "" };
    }
  }
  return null;
}

/** Top-N ações recomendadas ordenadas por score de prioridade. */
function buildActions(vencidos, today, todayDate) {
  return [...vencidos]
    .sort((a, b) => calcPriorityScore(b, today) - calcPriorityScore(a, today))
    .slice(0, TOP_ACTIONS)
    .map((r) => {
      const days = r.reminder_date
        ? differenceInDays(todayDate, new Date(`${r.reminder_date}T00:00:00`))
        : 0;

      let reason  = "follow-up futuro";
      let urgency = "Baixa";

      if (days > DIAS_VENCIDO_CRITICO) { reason = `vencido há ${days} dias`; urgency = "Crítica"; }
      else if (days > 0)               { reason = `vencido há ${days} dia${days !== 1 ? "s" : ""}`; urgency = "Alta"; }
      else if (r.reminder_date === today) { reason = "vence hoje"; urgency = "Média"; }

      if (r.origin_type === "guarda_chuva") reason += " · guarda-chuva";

      return { id: r.id, name: r.workshop_name || "Cliente", reason, urgency, reminder: r };
    });
}

// ─────────────────────────────────────────────
// Hook principal
// ─────────────────────────────────────────────

/**
 * Calcula métricas, insight determinístico e ações recomendadas
 * para a Central Operacional.
 *
 * @param {{ reminders: Array, remindersConcluidos: Array, today: string }} props
 */
export function useSidePanelPriorities({ reminders = [], remindersConcluidos = [], today }) {
  // ── Queries paralelas (independentes entre si)
  const [concluidosQuery, pedidosQuery] = useQueries({
    queries: [
      {
        queryKey: ["follow-up-concluidos-list-index-v2"],
        queryFn: () => base44.entities.FollowUpConcluido.list("-completedAt", 2000),
        staleTime: 5 * 60 * 1000,
        gcTime:    10 * 60 * 1000,
      },
      {
        queryKey: ["pedidos-internos-abertos-sidepanel"],
        queryFn:  () =>
          base44.entities.PedidoInterno.filter(
            { status: { $in: ["pendente", "em_analise"] } },
            "-created_date",
            100
          ),
        staleTime: 3 * 60 * 1000,
      },
    ],
  });

  const concluidos    = concluidosQuery.data  ?? [];
  const pedidosAbertos = pedidosQuery.data    ?? [];

  return useMemo(() => {
    const now       = Date.now();
    const todayDate = new Date(`${today}T00:00:00`); // criado uma única vez

    // ── Construção dos índices (3 passadas mínimas, sem repetição)
    const universe = new Set();

    const { lastContact, concluidosByWorkshop, naoRespondeuSet } =
      buildConcluidosIndexes(concluidos, now, universe);

    const { pendingByWorkshop, nameByWorkshop } =
      buildRemindersIndexes(reminders, universe);

    enrichNames(remindersConcluidos, nameByWorkshop, universe);

    // Array estável para iterar sem re-criar Set repetidamente
    const workshopIds = [...universe];

    // ── Métricas
    const { metrics, vencidos, vencidosOver15Count } = buildMetrics({
      universe,
      workshopIds,
      pendingByWorkshop,
      lastContact,
      concluidosByWorkshop,
      naoRespondeuSet,
      pedidosAbertos,
      reminders,
      nameByWorkshop,
      today,
      todayDate,
      now,
    });

    // ── Índice de métricas para O(1) no buildInsight
    const metricsById = new Map(metrics.map((m) => [m.id, m]));

    // ── Insight + Ações
    const insight  = buildInsight(metricsById);
    const actions  = buildActions(vencidos, today, todayDate);

    return {
      metrics,
      insight,
      allClear: !insight,
      actions,
      vencidosOver15Count,
    };
  }, [reminders, remindersConcluidos, concluidos, pedidosAbertos, today]);
}