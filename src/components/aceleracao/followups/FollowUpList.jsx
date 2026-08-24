import React, { useState } from "react";
import { AlertCircle, Clock, StickyNote, Search, X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { differenceInDays } from "date-fns";
import { calcPriorityScore } from "./ds/PriorityScore";
import FollowUpCompletedDetailDrawer from "@/components/aceleracao/FollowUpCompletedDetailDrawer";
import FollowUpConcluidoRow from "@/components/aceleracao/FollowUpConcluidoRow.jsx";
import FollowUpPendenteRow from "@/components/aceleracao/followups/FollowUpPendenteRow";
import DayCompletedHint from "@/components/aceleracao/followups/DayCompletedHint";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { sanitizeWorkshopIdArray } from "@/lib/workshopIdGuard";
import Combobox from "@/components/ui/combobox";
import { useFollowupIndex } from "./useFollowupIndex";
import { useWorkshopLogos } from "@/hooks/useWorkshopLogos";

function calcRiscoReuniao(workshopId, contractAttendances, consultoriaAtendimentos) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const atendimentos = consultoriaAtendimentos.filter(a => a.workshop_id === workshopId);
  const buckets = contractAttendances.filter(a => a.workshop_id === workshopId);
  const REALIZADOS_STATUS = ["concluido", "realizado", "participando"];
  const realizadasList = atendimentos.filter(a => REALIZADOS_STATUS.includes(a.status));
  const realizadas = realizadasList.length;
  const total = buckets.length > 0 ? buckets.length : atendimentos.length;
  const toLocalDate = (d) => {
    if (!d) return null;
    const s = typeof d === "string" ? d : d.toISOString();
    return new Date(s.includes("T") ? s : s + "T12:00:00");
  };
  const agora = new Date();
  const PENDENTES_STATUS = ["agendado", "confirmado", "reagendado", "atrasado"];
  const atrasadasList = atendimentos.filter(a => {
    if (!PENDENTES_STATUS.includes(a.status) || !a.data_agendada) return false;
    const s = typeof a.data_agendada === "string" ? a.data_agendada : a.data_agendada.toISOString();
    if (s.includes("T")) {
      const limite = new Date(s);
      limite.setMinutes(limite.getMinutes() + 30);
      return limite < agora;
    } else {
      const d = toLocalDate(s);
      const dSemHora = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      return dSemHora < hoje;
    }
  });
  const atrasadas = atrasadasList.length;
  const atrasadasIds = new Set(atrasadasList.map(a => a.id));
  const futuras = atendimentos
    .filter(a => {
      if (!["agendado", "confirmado", "reagendado", "atrasado"].includes(a.status)) return false;
      if (!a.data_agendada) return false;
      if (atrasadasIds.has(a.id)) return false;
      const d = toLocalDate(a.data_agendada);
      const dSemHora = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      return dSemHora >= hoje;
    })
    .sort((a, b) => toLocalDate(a.data_agendada) - toLocalDate(b.data_agendada));
  const proxima = futuras[0]?.data_agendada || null;
  const ultimasOrdenadas = realizadasList
    .map(a => new Date(a.data_realizada || a.data_agendada))
    .filter(d => !isNaN(d.getTime()))
    .sort((a, b) => b - a);
  const ultimaData = ultimasOrdenadas[0] || null;
  const diasDesdeUltima = ultimaData ? Math.floor((hoje - ultimaData) / (1000 * 60 * 60 * 24)) : null;
  let nivel;
  if (atendimentos.length === 0 && buckets.length === 0) nivel = "sem_dados";
  else if (realizadas === 0 && atrasadas === 0 && proxima) nivel = "ok";
  else if (realizadas === 0 && atrasadas === 0) nivel = "nunca";
  else if (atrasadas > 0 && !proxima) nivel = "critico";
  else if (atrasadas > 0) nivel = "atencao";
  else if (!proxima && realizadas > 0) nivel = "critico";
  else if (diasDesdeUltima !== null && diasDesdeUltima > 25) nivel = "atencao";
  else nivel = "ok";
  return { nivel, realizadas, total, proxima, diasDesdeUltima, atrasadas, atrasadasList };
}

function useReunioesIndex(workshopIds = []) {
  const ids = sanitizeWorkshopIdArray(workshopIds);
  const { data: contractData = [] } = useQuery({
    queryKey: ["contract-attendances-bulk", ids.sort().join(",")],
    queryFn: async () => {
      if (ids.length === 0) return [];
      const BATCH = 100;
      const results = [];
      for (let i = 0; i < ids.length; i += BATCH) {
        const batch = ids.slice(i, i + BATCH);
        const items = await base44.entities.ContractAttendance.filter({ workshop_id: { $in: batch } }, "-scheduled_date", BATCH * 10);
        results.push(...items);
      }
      return results;
    },
    enabled: ids.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
  const { data: consultoriaData = [] } = useQuery({
    queryKey: ["consultoria-atendimentos-bulk", ids.sort().join(",")],
    queryFn: async () => {
      if (ids.length === 0) return [];
      const BATCH = 50;
      const results = [];
      for (let i = 0; i < ids.length; i += BATCH) {
        const batch = ids.slice(i, i + BATCH);
        const items = await base44.entities.ConsultoriaAtendimento.filter({ workshop_id: { $in: batch } }, "-data_agendada", 500);
        results.push(...items);
      }
      return results;
    },
    enabled: ids.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
  const index = React.useMemo(() => {
    const byWorkshop = {};
    contractData.forEach(a => {
      const wid = a.workshop_id;
      if (!wid) return;
      if (!byWorkshop[wid]) byWorkshop[wid] = { contract: [], consultoria: [] };
      byWorkshop[wid].contract.push(a);
    });
    consultoriaData.forEach(a => {
      const wid = a.workshop_id;
      if (!wid) return;
      if (!byWorkshop[wid]) byWorkshop[wid] = { contract: [], consultoria: [] };
      byWorkshop[wid].consultoria.push(a);
    });
    const result = {};
    ids.forEach(wid => {
      result[wid] = calcRiscoReuniao(wid, byWorkshop[wid]?.contract || [], byWorkshop[wid]?.consultoria || []);
    });
    return result;
  }, [contractData, consultoriaData, ids.join(",")]);
  return index;
}

function getDaysOverdue(reminderDate, today) {
  if (!reminderDate) return 0;
  return differenceInDays(new Date(today + "T00:00:00"), new Date(reminderDate + "T00:00:00"));
}

// Histórico de 28 dias sob demanda — busca FollowUpConcluido por workshop ao expandir o card
function HistoricoExpandido({ workshopId }) {
  const { data: hist = [], isLoading } = useQuery({
    queryKey: ['historico-28d', workshopId],
    queryFn: () => base44.entities.FollowUpConcluido.filter(
      { workshop_id: workshopId, completedAt: { $gte: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString() } },
      '-completedAt',
      50
    ),
    staleTime: 3 * 60 * 1000,
    enabled: !!workshopId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
        <span className="text-[11px] text-gray-400">Carregando...</span>
      </div>
    );
  }

  const atendeu = hist.filter(c => c.resultado === 'atendeu').length;
  const naoAtendeu = hist.filter(c => c.resultado === 'nao_atendeu').length;
  const aguardando = hist.filter(c => c.resultado === 'aguardando').length;
  const total = hist.length || 1;
  const lastAtendeu = hist.filter(c => c.resultado === 'atendeu').sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''))[0];
  const lastDate = lastAtendeu?.completedAt?.split('T')[0] || null;

  if (hist.length === 0) return <p className="text-[11px] text-gray-400">Sem histórico nos últimos 28 dias</p>;

  return (
    <div className="space-y-1.5">
      {atendeu > 0 && (
        <div className="flex items-center gap-2">
          <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${Math.round(atendeu / total * 100)}%`, minWidth: 8, maxWidth: 80 }} />
          <span className="text-[11px] text-gray-600">Atendeu <strong>{atendeu}x</strong></span>
        </div>
      )}
      {naoAtendeu > 0 && (
        <div className="flex items-center gap-2">
          <div className="h-2 rounded-full bg-red-400" style={{ width: `${Math.round(naoAtendeu / total * 100)}%`, minWidth: 8, maxWidth: 80 }} />
          <span className="text-[11px] text-gray-600">Não atendeu <strong>{naoAtendeu}x</strong></span>
        </div>
      )}
      {aguardando > 0 && (
        <div className="flex items-center gap-2">
          <div className="h-2 rounded-full bg-amber-400" style={{ width: `${Math.round(aguardando / total * 100)}%`, minWidth: 8, maxWidth: 80 }} />
          <span className="text-[11px] text-gray-600">Aguardando <strong>{aguardando}x</strong></span>
        </div>
      )}
      {lastDate && (
        <p className="text-[10px] text-gray-400 mt-1">Último contato efetivo: {lastDate}</p>
      )}
    </div>
  );
}

function useConcluidosIndex() {
  // Índice leve via backend (projeção mínima, últimos 30 dias, top 100).
  // Substitui a leitura de 2000 registros completos com pastedImages.
  const data = useFollowupIndex().data ?? [];
  const byWorkshop = {};
  const byFollowupId = {};
  const sequenceByFollowupId = {};
  const byWorkshopRaw = {};
  data.forEach(c => {
    const wid = c.workshop_id;
    if (!wid) return;
    if (!byWorkshopRaw[wid]) byWorkshopRaw[wid] = [];
    byWorkshopRaw[wid].push(c);
    if (c.followup_id) byFollowupId[c.followup_id] = c;
    if (!byWorkshop[wid] || new Date(c.completedAt) > new Date(byWorkshop[wid].completedAt)) byWorkshop[wid] = c;
  });
  Object.entries(byWorkshopRaw).forEach(([wid, list]) => {
    list.slice().sort((a, b) => new Date(a.completedAt || a.created_date) - new Date(b.completedAt || b.created_date))
      .forEach((c, idx) => {
        const seq = idx + 1;
        if (c.followup_id) sequenceByFollowupId[c.followup_id] = seq;
        if (c.id) sequenceByFollowupId[c.id] = seq;
      });
  });
  return { byWorkshop, byFollowupId, sequenceByFollowupId };
}

function useWorkshopsPlanIndex(workshopIds = []) {
  const ids = sanitizeWorkshopIdArray(workshopIds);
  const { data = [] } = useQuery({
    queryKey: ["workshops-plan-index", ids.sort().join(",")],
    queryFn: async () => {
      if (ids.length === 0) return [];
      const BATCH = 100;
      const results = [];
      for (let i = 0; i < ids.length; i += BATCH) {
        const batch = ids.slice(i, i + BATCH);
        const items = await base44.entities.Workshop.filter({ id: { $in: batch } }, undefined, BATCH);
        results.push(...items);
      }
      return results;
    },
    enabled: ids.length > 0,
    staleTime: 10 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
  const byId = {};
  // S1: retorna plano + consultor_principal_nome do Workshop (fonte canônica da Gestão de Tenants)
  data.forEach(w => {
    if (w.id) byId[w.id] = {
      plano: w.planoAtual || null,
      consultorPrincipalNome: w.consultor_principal_nome || null,
    };
  });
  return byId;
}

function useAtasIndex(ataIds = []) {
  const uniqueIds = [...new Set(ataIds.filter(Boolean))];
  const { data = [] } = useQuery({
    queryKey: ["meeting-minutes-by-ids", uniqueIds.sort().join(",")],
    queryFn: async () => {
      if (uniqueIds.length === 0) return [];
      const BATCH = 50;
      const results = [];
      for (let i = 0; i < uniqueIds.length; i += BATCH) {
        const batch = uniqueIds.slice(i, i + BATCH);
        const items = await base44.entities.MeetingMinutes.filter({ id: { $in: batch } }, "-meeting_date", BATCH);
        results.push(...items);
      }
      return results;
    },
    enabled: uniqueIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
  const byId = {};
  data.forEach(a => { if (a.id) byId[a.id] = a; });
  return byId;
}

// S2-03a: hook que retorna { workshop_id: count } de atas em aberto por workshop
function useAtasAbertasIndex(workshopIds = []) {
  const ids = [...new Set(workshopIds.filter(Boolean))];
  const { data = [] } = useQuery({
    queryKey: ['atas-abertas-index', ids.sort().join(',')],
    queryFn: async () => {
      if (ids.length === 0) return [];
      const BATCH = 100;
      const results = [];
      for (let i = 0; i < ids.length; i += BATCH) {
        const batch = ids.slice(i, i + BATCH);
        const items = await base44.entities.MeetingMinutes.filter(
          { workshop_id: { $in: batch }, status: { $ne: 'finalizada' } },
          '-meeting_date', 500
        );
        results.push(...items);
      }
      return results;
    },
    enabled: ids.length > 0,
    staleTime: 3 * 60 * 1000,
  });
  const byWorkshop = {};
  data.forEach(a => {
    if (a.workshop_id) byWorkshop[a.workshop_id] = (byWorkshop[a.workshop_id] || 0) + 1;
  });
  return byWorkshop;
}

export default function FollowUpList({ reminders, remindersConcluidos = [], today, isLoading, onSelect, filterPill, onFilterPill, seqByReminderId = {}, statsByWorkshopId = {}, onSuporteRapido, meuId, selectedReminderId, onIniciarAtendimento }) {
  const [selectedCompleted, setSelectedCompleted] = useState(null);
  const [search, setSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [page, setPage] = useState(1);

  React.useEffect(() => {
    if (!isSearching) return;
    const t = setTimeout(() => setIsSearching(false), 300);
    return () => clearTimeout(t);
  }, [isSearching, search]);

  const PAGE_SIZE = 20;
  const { byFollowupId: concluidosByFuid } = useConcluidosIndex();
  const ataIds = reminders.map(r => r.ata_id).filter(Boolean);
  const atasIndex = useAtasIndex(ataIds);

  const proximoFuPorWorkshop = React.useMemo(() => {
    const mapa = {};
    reminders.filter(r => !r.is_completed && r.reminder_date >= today)
      .sort((a, b) => (a.reminder_date || "").localeCompare(b.reminder_date || ""))
      .forEach(r => { if (!mapa[r.workshop_id]) mapa[r.workshop_id] = r; });
    return mapa;
  }, [reminders, today]);

  const PILLS = [
    { id: "todos", label: "Todos" },
    { id: "atrasados", label: "Vencidos" },
    { id: "hoje", label: "Hoje" },
    { id: "urgentes", label: "Urgentes" },
    { id: "concluidos", label: "Concluídos" },
    { id: "criticos", label: "Críticos" },
    { id: "por_empresa", label: "Por Empresa" },
  ];

  const searchTerm = search.trim().toLowerCase();
  const isConcluidosPill = filterPill === "concluidos" || filterPill === "criticos" || filterPill === "por_empresa";
  const sourceList = isConcluidosPill ? remindersConcluidos : reminders;

  const workshopIdsTodos = React.useMemo(
    () => sanitizeWorkshopIdArray([...remindersConcluidos.map(r => r.workshop_id), ...reminders.map(r => r.workshop_id)]),
    [remindersConcluidos, reminders]
  );
  const reunioesIndex = useReunioesIndex(workshopIdsTodos);

  const planosByWorkshop = useWorkshopsPlanIndex(workshopIdsTodos);
  const logosByWorkshop = useWorkshopLogos(workshopIdsTodos);
  const atasAbertasIndex = useAtasAbertasIndex(workshopIdsTodos); // S2-03a

  const fusPorEmpresa = React.useMemo(() => {
    const mapa = {};
    remindersConcluidos.forEach(r => {
      if (!r.workshop_id) return;
      if (!mapa[r.workshop_id]) mapa[r.workshop_id] = { total: 0, critico: false };
      mapa[r.workshop_id].total++;
      const risco = reunioesIndex[r.workshop_id];
      if (risco && (risco.nivel === "critico" || risco.nivel === "nunca" || (risco.atrasadas || 0) > 0)) mapa[r.workshop_id].critico = true;
    });
    return mapa;
  }, [remindersConcluidos, reunioesIndex]);

  const filtered = React.useMemo(() => {
    const base = sourceList.filter(r => {
      if (searchTerm && !(r.workshop_name || "").toLowerCase().includes(searchTerm)) return false;
      if (filterPill === "concluidos") return true;
      if (filterPill === "criticos") { const risco = reunioesIndex[r.workshop_id]; return risco && (risco.nivel === "critico" || risco.nivel === "nunca"); }
      if (filterPill === "por_empresa") return true;
      if (filterPill === "atrasados") return !r.is_completed && r.reminder_date < today;
      if (filterPill === "hoje") return !r.is_completed && r.reminder_date === today;
      if (filterPill === "urgentes") return !r.is_completed && getDaysOverdue(r.reminder_date, today) >= 3;
      return !r.is_completed;
    }).sort((a, b) => {
      // S2 — Sort de 3 camadas (mesmo padrão do S0 de Atendimentos):
      // 1. Atrasados (reminder_date < hoje) — entre si: mais antigo primeiro
      // 2. Vence hoje — em sequência
      // 3. Futuros — crescente (próximo primeiro)
      // calcPriorityScore como tiebreaker dentro de cada camada.
      const isAtrasadoA = !a.is_completed && a.reminder_date < today;
      const isAtrasadoB = !b.is_completed && b.reminder_date < today;
      if (isAtrasadoA !== isAtrasadoB) return isAtrasadoA ? -1 : 1;
      if (isAtrasadoA && isAtrasadoB) {
        const cmp = (a.reminder_date || "").localeCompare(b.reminder_date || "");
        if (cmp !== 0) return cmp; // mais antigo primeiro
        const sa = calcPriorityScore(a, today), sb = calcPriorityScore(b, today);
        return sb - sa;
      }
      const isHojeA = a.reminder_date === today;
      const isHojeB = b.reminder_date === today;
      if (isHojeA !== isHojeB) return isHojeA ? -1 : 1;
      // Camada 3: por data crescente (próximo primeiro), score como tiebreaker
      const dateCmp = (a.reminder_date || "").localeCompare(b.reminder_date || "");
      if (dateCmp !== 0) return dateCmp;
      const sa = calcPriorityScore(a, today), sb = calcPriorityScore(b, today);
      return sb - sa;
    });
    if (filterPill === "por_empresa") {
      const seen = new Set();
      return [...base].sort((a, b) => (b.created_date || "").localeCompare(a.created_date || "")).filter(r => { if (seen.has(r.workshop_id)) return false; seen.add(r.workshop_id); return true; });
    }
    return base;
  }, [sourceList, searchTerm, filterPill, today, reunioesIndex]);

  React.useEffect(() => { setPage(1); }, [searchTerm, filterPill, sourceList.length]);

  // S3-03a: Agrupa FUs pendentes por empresa para a visibilidade default (1 linha por empresa)
  // Uma empresa aparece na lista quando tem pelo menos 1 FU com reminder_date === hoje
  const [expandedWorkshops, setExpandedWorkshops] = React.useState(new Set());
  const toggleExpanded = React.useCallback((wid) => {
    setExpandedWorkshops(prev => {
      const next = new Set(prev);
      next.has(wid) ? next.delete(wid) : next.add(wid);
      return next;
    });
  }, []);

  const empresasAgrupadas = React.useMemo(() => {
    if (filterPill === 'concluidos') return null; // concluídos não agrupam
    // Todos FUs pendentes do source (sem filtro de data — usados pra Qtd Follow)
    const todosPendentes = sourceList.filter(r => !r.is_completed);

    // Agrupa por workshop_id
    const mapa = {};
    todosPendentes.forEach(r => {
      if (!r.workshop_id) return;
      if (!mapa[r.workshop_id]) {
        mapa[r.workshop_id] = {
          workshop_id: r.workshop_id,
          workshop_name: r.workshop_name || '',
          fus: [],
        };
      }
      mapa[r.workshop_id].fus.push(r);
    });

    return Object.values(mapa)
      .map(grupo => {
        const fusOrdenados = [...grupo.fus].sort((a, b) =>
          (a.reminder_date || '').localeCompare(b.reminder_date || '')
        );
        const fusHoje = fusOrdenados.filter(f => f.reminder_date === today);
        const maisUrgente = fusOrdenados[0];
        // Origem: origin_type do FU com menor created_date (mais antigo)
        const maisAntigo = [...grupo.fus].sort((a, b) =>
          (a.created_date || '').localeCompare(b.created_date || '')
        )[0];
        return {
          ...grupo,
          fus: fusOrdenados,           // todos os FUs ordenados por data
          fusHoje,                      // FUs com reminder_date = hoje (visibilidade)
          maisUrgente,                  // FU mais próximo (define posição no sort)
          origemMaisAntiga: maisAntigo?.origin_type || '',
          historicoTooltip: fusOrdenados.map((f, i) =>
            `#${i + 1} · ${f.origin_type || 'manual'} · ${f.reminder_date || '?'}`
          ),
          qtdFollow: grupo.fus.length,
        };
      })
      // S3-03a: empresa aparece se tem FU com reminder_date <= hoje (atrasado + hoje)
      .filter(g => g.fus.some(f => f.reminder_date <= today))
      // Sort de 3 camadas por maisUrgente
      .sort((a, b) => {
        const ma = a.maisUrgente, mb = b.maisUrgente;
        if (!ma) return 1; if (!mb) return -1;
        const atA = ma.reminder_date < today;
        const atB = mb.reminder_date < today;
        if (atA !== atB) return atA ? -1 : 1;
        return (ma.reminder_date || '').localeCompare(mb.reminder_date || '');
      });
  }, [sourceList, today, filterPill]);

  // FIX: usar o length correto conforme o modo de render (agrupado vs flat)
  const displayCount = empresasAgrupadas ? empresasAgrupadas.length : filtered.length;
  const totalPages = Math.max(1, Math.ceil(displayCount / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const empresasPaginadas = empresasAgrupadas
    ? empresasAgrupadas.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
    : null;

  const countAtrasados = reminders.filter(r => !r.is_completed && r.reminder_date < today).length;
  const countHoje = reminders.filter(r => !r.is_completed && r.reminder_date === today).length;
  const countUrgentes = reminders.filter(r => !r.is_completed && getDaysOverdue(r.reminder_date, today) >= 3).length;
  const countEmpresasCriticas = Object.values(fusPorEmpresa).filter(e => e.critico).length;
  const countEmpresas = new Set(reminders.filter(r => !r.is_completed && (r.reminder_date < today || r.reminder_date === today || getDaysOverdue(r.reminder_date, today) >= 3)).map(r => r.workshop_id)).size;

  // ── S3: Detecção de "dia concluído" + dados do outro consultor ──
  const pendentesHoje = reminders.filter(r => !r.is_completed && r.reminder_date === today);
  const diaConcluidoPeloMeu = meuId && pendentesHoje.length === 0 && reminders.length > 0;

  // Conta clientes com resultado "não atendeu" ou "aguardando" nos concluídos recentes
  const concluidosIndex = useFollowupIndex().data ?? [];
  const naoRespondidosCount = React.useMemo(() => {
    if (!meuId) return 0;
    const porWorkshop = {};
    concluidosIndex
      .filter(c => (c.resultado === 'nao_atendeu' || c.resultado === 'aguardando'))
      .forEach(c => { if (c.workshop_id) porWorkshop[c.workshop_id] = true; });
    return Object.keys(porWorkshop).length;
  }, [concluidosIndex, meuId]);

  // Dados do outro consultor — busca follow-ups pendentes de hoje de outros consultores
  const { data: outroConsultorData } = useQuery({
    queryKey: ['outro-consultor-pendentes-hoje', today, meuId],
    queryFn: async () => {
      if (!meuId) return null;
      // Busca todos pendentes de hoje que NÃO são do consultor atual
      const todos = await base44.entities.FollowUpReminder.filter(
        { is_completed: false, reminder_date: today },
        'reminder_date',
        200
      );
      // Filtra os que são de outro consultor (via consultor_principal_id)
      const outros = todos.filter(r =>
        r.consultor_principal_id && r.consultor_principal_id !== meuId &&
        r.consultor_id !== meuId
      );
      if (outros.length === 0) return null;
      // Pega o nome do primeiro outro consultor encontrado
      const primeiroOutro = outros[0];
      return {
        nome: primeiroOutro.consultor_principal_nome || 'colega',
        pendentesHoje: outros.length,
      };
    },
    enabled: !!diaConcluidoPeloMeu,
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) return <div className="py-20 text-center text-gray-400 text-sm">Carregando...</div>;

  return (
    <div className="space-y-3">
      {/* Linha única compacta: busca + dropdown de filtros + chips informativos + suporte */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Busca compacta */}
        <div className="relative flex-shrink-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setIsSearching(true); }} placeholder="Buscar cliente..." className="w-48 pl-8 pr-8 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent placeholder-gray-400" />
          {isSearching ? <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 animate-spin" /> : search ? <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button> : null}
        </div>

        {/* Filtros via Combobox */}
        <div className="w-[200px] flex-shrink-0">
          <Combobox
            options={PILLS.map(p => ({ value: p.id, label: p.label }))}
            value={filterPill}
            onChange={onFilterPill}
            placeholder="Filtros"
            searchPlaceholder="Buscar filtro..."
            emptyText="Nenhum filtro encontrado."
            clearValue="todos"
            className="h-8"
            autoSelectOnOpen={false}
            maxHeight={320}
          />
        </div>

        {/* Chips informativos compactos */}
        <div className="flex items-center gap-1.5 text-xs flex-shrink-0">
          <div className="flex items-center gap-1 bg-red-50 border border-red-100 rounded-md px-2 py-1"><AlertCircle className="w-3 h-3 text-red-500" /><span className="font-semibold text-red-700">{countAtrasados}</span><span className="text-red-500 text-[11px]">vencidos</span></div>
          <div className="flex items-center gap-1 bg-amber-50 border border-amber-100 rounded-md px-2 py-1"><Clock className="w-3 h-3 text-amber-500" /><span className="font-semibold text-amber-700">{countHoje}</span><span className="text-amber-500 text-[11px]">hoje</span></div>
          <div className="flex items-center gap-1 bg-orange-50 border border-orange-100 rounded-md px-2 py-1"><AlertCircle className="w-3 h-3 text-orange-500" /><span className="font-semibold text-orange-700">{countUrgentes}</span><span className="text-orange-500 text-[11px]">urgentes</span></div>
          <button className="flex items-center gap-1 bg-purple-50 border border-purple-100 rounded-md px-2 py-1 hover:bg-purple-100 transition-colors cursor-pointer" onClick={() => onFilterPill("por_empresa")} title="Ver 1 por empresa">
            <AlertCircle className="w-3 h-3 text-purple-500" /><span className="font-semibold text-purple-700">{countEmpresas}</span><span className="text-purple-500 text-[11px]">empresas</span>
            {countEmpresasCriticas > 0 && <span className="text-[9px] font-bold text-red-600 bg-red-50 border border-red-200 px-1 py-0.5 rounded-full">{countEmpresasCriticas}🔴</span>}
          </button>
        </div>

      </div>

      {/* S3: Hint de dia concluído */}
      {diaConcluidoPeloMeu && filterPill === "todos" && (
        <DayCompletedHint
          naoRespondidos={naoRespondidosCount}
          outroConsultor={outroConsultorData || null}
          onVerNaoRespondidos={() => onFilterPill("concluidos")}
          onAjudarColega={() => {
            // Troca pra visualização "todos" sem filtro de consultor —
            // o parent (FollowUpsTab) trata a troca de consultorSelecionado.
            // Aqui apenas sinaliza a intenção via pill.
            onFilterPill("hoje");
          }}
        />
      )}

      {filtered.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center"><StickyNote className="w-8 h-8 text-gray-300" /></div>
          <p className="text-sm font-medium text-gray-500">{search ? "Nenhum resultado encontrado" : "Nenhum follow-up nesta categoria"}</p>
          <p className="text-xs text-gray-400 max-w-xs">{search ? "Tente outro termo ou limpe a busca para ver todos." : "Crie um novo follow-up ou atenda um cliente via suporte rápido."}</p>
          <div className="flex items-center gap-2 mt-1">
            {search && <button onClick={() => setSearch("")} className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Limpar busca</button>}
            {onSuporteRapido && <button onClick={onSuporteRapido} className="px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors">🛟 Suporte rápido</button>}
          </div>
        </div>
      ) : isConcluidosPill ? (
        <div className="rounded-lg border border-gray-200 overflow-x-auto bg-white">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wide min-w-[1200px]">
            <div className="w-10 flex-shrink-0 text-center">#FU</div>
            <div className="w-36 flex-shrink-0">Cliente{filterPill === "por_empresa" && <span className="ml-1 text-[9px] text-purple-500 normal-case font-normal">(1 por empresa)</span>}</div>
            <div className="w-20 flex-shrink-0">Data</div>
            <div className="w-28 flex-shrink-0">Consultor Resp.</div>
            <div className="w-28 flex-shrink-0">Quem Realizou</div>
            <div className="w-20 flex-shrink-0">Humor</div>
            <div className="w-20 flex-shrink-0">Canal</div>
            {filterPill === "por_empresa" && <div className="w-16 flex-shrink-0">Total FUs</div>}
            <div className="w-20 flex-shrink-0">ATA</div>
            <div className="w-24 flex-shrink-0">Tipo</div>
            <div className="w-32 flex-shrink-0">Situação Reuniões</div>
            <div className="w-24 flex-shrink-0">Próx. Contato</div>
            <div className="flex-shrink-0 ml-auto">Status</div>
          </div>
          {paginated.map(r => {
            const concluido = concluidosByFuid?.[r.id] || null;
            const ata = r.ata_id ? atasIndex[r.ata_id] : null;
            const seqFU = seqByReminderId[r.id] ?? null;
            const clientStats = statsByWorkshopId[r.workshop_id] ?? null;
            const risco = reunioesIndex[r.workshop_id] ?? null;
            const empresaInfo = filterPill === "por_empresa" ? fusPorEmpresa[r.workshop_id] : null;
            return <FollowUpConcluidoRow key={r.id} completed={concluido} reminder={r} ata={ata} totalFollowUps={seqFU} totalDoCliente={clientStats?.total ?? null} proximoFuPendente={proximoFuPorWorkshop[r.workshop_id]} risco={risco} empresaInfo={empresaInfo} logo_url={logosByWorkshop[r.workshop_id]} onSelect={() => setSelectedCompleted(r)} />;
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 shadow-sm overflow-x-auto bg-white">
          <div className="flex items-center border-b border-gray-200 bg-gray-50 text-[10px] font-bold uppercase tracking-widest text-gray-400 border-l-[3px] border-l-transparent">
            <div className="flex-1 min-w-[240px] px-4 py-2 pl-7">Cliente</div>
            {empresasAgrupadas && <div className="w-[80px] flex-shrink-0 px-2 py-2 text-center">Qtd Follow</div>}
            <div className="w-[140px] flex-shrink-0 px-2 py-2">Consultor</div>
            <div className="w-[72px] flex-shrink-0 px-2 py-2">Seq.</div>
            <div className="w-[200px] flex-shrink-0 px-2 py-2">Origem</div>
            <div className="w-[148px] flex-shrink-0 px-2 py-2">Follow-ups</div>
            <div className="w-[176px] flex-shrink-0 px-2 py-2">Datas</div>
            <div className="w-[112px] flex-shrink-0 px-3 py-2 text-right">Status</div>
            {empresasAgrupadas && <div className="w-[36px] flex-shrink-0" />}
          </div>

          {/* S3-03a/b: render agrupado por empresa (paginado) */}
          {empresasPaginadas ? empresasPaginadas.map((grupo) => {
            const r = grupo.maisUrgente;
            if (!r) return null;
            const isExpanded = expandedWorkshops.has(grupo.workshop_id);
            return (
              <React.Fragment key={grupo.workshop_id}>
                {/* Linha da empresa */}
                <div className="relative">
                  <FollowUpPendenteRow
                    reminder={r}
                    today={today}
                    seqFU={seqByReminderId[r.id] ?? null}
                    score={calcPriorityScore(r, today)}
                    onSelect={onSelect}
                    isLast={false}
                    meuId={meuId}
                    stats={statsByWorkshopId[r.workshop_id] ?? null}
                    isSelected={r.id === selectedReminderId}
                    risco={reunioesIndex[r.workshop_id] ?? null}
                    onIniciarAtendimento={onIniciarAtendimento}
                    plano={planosByWorkshop[r.workshop_id]?.plano ?? null}
                    workshopConsultorPrincipal={planosByWorkshop[r.workshop_id]?.consultorPrincipalNome ?? null}
                    logo_url={logosByWorkshop[r.workshop_id]}
                    atasAbertas={atasAbertasIndex[r.workshop_id] || 0}
                    qtdFollow={grupo.qtdFollow}
                    origemMaisAntiga={grupo.origemMaisAntiga}
                    historicoTooltip={grupo.historicoTooltip}
                    isExpanded={isExpanded}
                    onToggleExpand={() => toggleExpanded(grupo.workshop_id)}
                  />
                </div>

                {/* S3-03b: Painel expandido */}
                {isExpanded && (
                  <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
                    <div className="flex gap-6">
                      {/* Lista de FUs abertos */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Follows em aberto</p>
                        <div className="space-y-1.5">
                          {grupo.fus.map((fu, idx) => {
                            const isAtrasado = fu.reminder_date < today;
                            const isHoje = fu.reminder_date === today;
                            return (
                              <div key={fu.id} className="flex items-center gap-2 text-xs">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                                  isAtrasado ? 'bg-red-100 text-red-700' : isHoje ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                                }`}>#{idx + 1}</span>
                                <span className="text-gray-500">{fu.origin_type || 'manual'}</span>
                                <span className="text-gray-400">·</span>
                                <span className={isAtrasado ? 'text-red-600 font-medium' : isHoje ? 'text-amber-700 font-medium' : 'text-gray-500'}>
                                  {fu.reminder_date || '?'}
                                  {isAtrasado && ' ― atrasado'}
                                  {isHoje && ' ― hoje'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Gráfico de histórico */}
                      <div className="w-56 flex-shrink-0">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Histórico (28 dias)</p>
                        {(() => {
                          const idx = concluidosIndex || [];
                          const cutoff = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                          const hist = idx.filter(c => c.workshop_id === grupo.workshop_id && (c.completedAt || c.created_date || '') >= cutoff);
                          const atendeu = hist.filter(c => c.resultado === 'atendeu').length;
                          const naoAtendeu = hist.filter(c => c.resultado === 'nao_atendeu').length;
                          const aguardando = hist.filter(c => c.resultado === 'aguardando').length;
                          const total = hist.length || 1;
                          const lastAtendeu = hist.filter(c => c.resultado === 'atendeu').sort((a,b) => (b.completedAt||'').localeCompare(a.completedAt||''))[0];
                          const lastDate = lastAtendeu?.completedAt?.split('T')[0] || null;
                          if (hist.length === 0) return <p className="text-[11px] text-gray-400">Sem histórico nos últimos 28 dias</p>;
                          return (
                            <div className="space-y-1.5">
                              {atendeu > 0 && (
                                <div className="flex items-center gap-2">
                                  <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${Math.round(atendeu/total*100)}%`, minWidth: 8, maxWidth: 80 }} />
                                  <span className="text-[11px] text-gray-600">Atendeu <strong>{atendeu}x</strong></span>
                                </div>
                              )}
                              {naoAtendeu > 0 && (
                                <div className="flex items-center gap-2">
                                  <div className="h-2 rounded-full bg-red-400" style={{ width: `${Math.round(naoAtendeu/total*100)}%`, minWidth: 8, maxWidth: 80 }} />
                                  <span className="text-[11px] text-gray-600">Não atendeu <strong>{naoAtendeu}x</strong></span>
                                </div>
                              )}
                              {aguardando > 0 && (
                                <div className="flex items-center gap-2">
                                  <div className="h-2 rounded-full bg-amber-400" style={{ width: `${Math.round(aguardando/total*100)}%`, minWidth: 8, maxWidth: 80 }} />
                                  <span className="text-[11px] text-gray-600">Aguardando <strong>{aguardando}x</strong></span>
                                </div>
                              )}
                              {lastDate && (
                                <p className="text-[10px] text-gray-400 mt-1">Último contato efetivo: {lastDate}</p>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          }) : paginated.map((r, i) => (
            <FollowUpPendenteRow
              key={r.id} reminder={r} today={today} seqFU={seqByReminderId[r.id] ?? null} score={calcPriorityScore(r, today)}
              onSelect={onSelect} isLast={i === paginated.length - 1} meuId={meuId}
              stats={statsByWorkshopId[r.workshop_id] ?? null} isSelected={r.id === selectedReminderId} risco={reunioesIndex[r.workshop_id] ?? null}
              onIniciarAtendimento={onIniciarAtendimento}
              plano={planosByWorkshop[r.workshop_id]?.plano ?? null}
              workshopConsultorPrincipal={planosByWorkshop[r.workshop_id]?.consultorPrincipalNome ?? null}
              logo_url={logosByWorkshop[r.workshop_id]}
              atasAbertas={atasAbertasIndex[r.workshop_id] || 0}
            />
          ))}
        </div>
      )}

      {displayCount > PAGE_SIZE && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-gray-400">{(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, displayCount)} de {displayCount}{empresasPaginadas ? ' empresas' : ''}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"><ChevronLeft className="w-3.5 h-3.5" /> Anterior</button>
            <span className="text-xs text-gray-500">Página {currentPage} de {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">Próxima <ChevronRight className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      )}

      <FollowUpCompletedDetailDrawer followUp={selectedCompleted} open={!!selectedCompleted} onClose={() => setSelectedCompleted(null)} seqNum={selectedCompleted ? seqByReminderId[selectedCompleted.id] : undefined} stats={selectedCompleted ? statsByWorkshopId[selectedCompleted.workshop_id] : undefined} />
    </div>
  );
}