import React, { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock, CheckCircle2, StickyNote, CalendarCheck, MessageCircle, Phone, Mail, MapPin, Video, FileText, Target, Search, X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import FollowUpCompletedDetailDrawer from "@/components/aceleracao/FollowUpCompletedDetailDrawer";
import FollowUpConcluidoRow from "@/components/aceleracao/FollowUpConcluidoRow.jsx";
import FollowUpQueue from "@/components/aceleracao/FollowUpQueue";
import FollowUpPendenteRow from "@/components/aceleracao/followups/FollowUpPendenteRow";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// Calcula o nível de risco de reuniões para um workshop_id
// Retorna: { nivel, realizadas, total, proxima, diasDesdeUltima, atrasadas, atrasadasList }
function calcRiscoReuniao(workshopId, contractAttendances, consultoriaAtendimentos) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  // Todos os ConsultoriaAtendimento deste workshop
  const atendimentos = consultoriaAtendimentos.filter(a => a.workshop_id === workshopId);

  // Buckets do plano contratado (ContractAttendance)
  const buckets = contractAttendances.filter(a => a.workshop_id === workshopId);

  // --- REALIZADAS: concluido, realizado, participando ---
  const REALIZADOS_STATUS = ["concluido", "realizado", "participando"];
  const realizadasList = atendimentos.filter(a => REALIZADOS_STATUS.includes(a.status));
  const realizadas = realizadasList.length;

  // --- TOTAL DO PLANO: slots de ContractAttendance OU total de ConsultoriaAtendimento ---
  const total = buckets.length > 0 ? buckets.length : atendimentos.length;

  // Helper: normaliza data para evitar UTC shift
  // "2026-05-21" sem hora → JS interpreta como UTC midnight → no Brasil vira dia 20 às 21h
  const toLocalDate = (d) => {
    if (!d) return null;
    const s = typeof d === "string" ? d : d.toISOString();
    return new Date(s.includes("T") ? s : s + "T12:00:00");
  };

  // Agora real — usado para comparação com tolerância de 30min
  const agora = new Date();

  // --- ATRASADAS: passou do horário + 30 minutos de tolerância ---
  // Lógica: se tem hora no campo (T) → usa datetime real + 30min de tolerância
  //         se só data (sem T)       → considera atrasada se o DIA já passou
  const PENDENTES_STATUS = ["agendado", "confirmado", "reagendado", "atrasado"];
  const atrasadasList = atendimentos.filter(a => {
    if (!PENDENTES_STATUS.includes(a.status) || !a.data_agendada) return false;
    const s = typeof a.data_agendada === "string" ? a.data_agendada : a.data_agendada.toISOString();
    if (s.includes("T")) {
      // Tem datetime: atrasada somente 30min APÓS o horário marcado
      const limite = new Date(s);
      limite.setMinutes(limite.getMinutes() + 30);
      return limite < agora; // ← usa agora real (não hoje zerado)
    } else {
      // Só data: atrasada se o dia já passou completamente
      const d = toLocalDate(s);
      const dSemHora = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      return dSemHora < hoje;
    }
  });
  const atrasadas = atrasadasList.length;

  // --- PRÓXIMA: reuniões com data hoje ou futura, que NÃO entraram na lista de atrasadas ---
  // Inclui "atrasado" no status pois o job markAtrasados pode ter marcado uma reunião de hoje/futuro
  // antes da correção da lógica — o que importa é a DATA, não o status gravado no banco
  const atrasadasIds = new Set(atrasadasList.map(a => a.id));
  const futuras = atendimentos
    .filter(a => {
      if (!["agendado", "confirmado", "reagendado", "atrasado"].includes(a.status)) return false;
      if (!a.data_agendada) return false;
      if (atrasadasIds.has(a.id)) return false; // foi calculada como realmente atrasada (passou +30min)
      const d = toLocalDate(a.data_agendada);
      const dSemHora = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      return dSemHora >= hoje; // data hoje ou futura → é próxima
    })
    .sort((a, b) => toLocalDate(a.data_agendada) - toLocalDate(b.data_agendada));
  const proxima = futuras[0]?.data_agendada || null;

  // --- ÚLTIMA REALIZADA: usa data_realizada, fallback data_agendada ---
  const ultimasOrdenadas = realizadasList
    .map(a => new Date(a.data_realizada || a.data_agendada))
    .filter(d => !isNaN(d.getTime()))
    .sort((a, b) => b - a);
  const ultimaData = ultimasOrdenadas[0] || null;
  const diasDesdeUltima = ultimaData
    ? Math.floor((hoje - ultimaData) / (1000 * 60 * 60 * 24))
    : null;

  // --- NÍVEL DE RISCO ---
  let nivel;
  if (atendimentos.length === 0 && buckets.length === 0) {
    nivel = "sem_dados";
  } else if (realizadas === 0 && atrasadas === 0 && proxima) {
    nivel = "ok"; // FIX: ainda não realizou NENHUMA mas JÁ TEM reunião futura agendada/confirmada → não é "nunca"
  } else if (realizadas === 0 && atrasadas === 0) {
    nivel = "nunca"; // nunca teve nenhuma atividade e nenhuma futura
  } else if (atrasadas > 0 && !proxima) {
    nivel = "critico"; // tem reuniões atrasadas e nenhuma futura agendada
  } else if (atrasadas > 0) {
    nivel = "atencao"; // tem atrasadas mas ao menos tem próxima futura
  } else if (!proxima && realizadas > 0) {
    nivel = "critico"; // realizou mas não tem nenhuma futura agendada
  } else if (diasDesdeUltima !== null && diasDesdeUltima > 25) {
    nivel = "atencao"; // última reunião há mais de 25 dias
  } else {
    nivel = "ok";
  }

  return { nivel, realizadas, total, proxima, diasDesdeUltima, atrasadas, atrasadasList };
}

// Hook para buscar ContractAttendance e ConsultoriaAtendimento em lote para workshops visíveis
function useReunioesIndex(workshopIds = []) {
  const ids = [...new Set(workshopIds.filter(Boolean))];

  const { data: contractData = [] } = useQuery({
    queryKey: ["contract-attendances-bulk", ids.sort().join(",")],
    queryFn: async () => {
      if (ids.length === 0) return [];
      const BATCH = 100;
      const results = [];
      for (let i = 0; i < ids.length; i += BATCH) {
        const batch = ids.slice(i, i + BATCH);
        const items = await base44.entities.ContractAttendance.filter(
          { workshop_id: { $in: batch } },
          "-scheduled_date",
          BATCH * 10
        );
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
        const items = await base44.entities.ConsultoriaAtendimento.filter(
          { workshop_id: { $in: batch } },
          "-data_agendada",
          500
        );
        results.push(...items);
      }
      return results;
    },
    enabled: ids.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Pré-indexa por workshop_id (Map) — O(n) uma vez, lookup O(1) por workshop
  const index = React.useMemo(() => {
    const byWorkshop = {};

    // Indexa ContractAttendance
    contractData.forEach(a => {
      const wid = a.workshop_id;
      if (!wid) return;
      if (!byWorkshop[wid]) byWorkshop[wid] = { contract: [], consultoria: [] };
      byWorkshop[wid].contract.push(a);
    });

    // Indexa ConsultoriaAtendimento
    consultoriaData.forEach(a => {
      const wid = a.workshop_id;
      if (!wid) return;
      if (!byWorkshop[wid]) byWorkshop[wid] = { contract: [], consultoria: [] };
      byWorkshop[wid].consultoria.push(a);
    });

    // Calcula risco para cada workshop usando arrays pré-indexados (O(1) lookup)
    const result = {};
    ids.forEach(wid => {
      const buckets = byWorkshop[wid]?.contract || [];
      const atendimentos = byWorkshop[wid]?.consultoria || [];
      result[wid] = calcRiscoReuniao(wid, buckets, atendimentos);
    });
    return result;
  }, [contractData, consultoriaData, ids.join(",")]);

  return index;
}

const PROXIMO_PASSO_LABELS = {
  reagendar: "Reagendar FU",
  agendar: "Agendar reunião",
  enviar: "Enviar material",
  cancelar: "Cancelado",
  concluir: "Concluído",
  negociacao: "Avançar negociação",
  fechamento: "Avançar fechamento",
  nova_proposta: "Nova proposta",
  agendar_reuniao: "Agendar reunião",
  perdido: "Perdido",
  nurturing: "Nurturing",
};

function getInitials(name = "") {
  return name.split(" ").slice(0, 2).map(p => p[0]).join("").toUpperCase() || "?";
}

function getDaysOverdue(reminderDate, today) {
  if (!reminderDate) return 0;
  const diff = differenceInDays(new Date(today), new Date(reminderDate + "T00:00:00"));
  return diff;
}

function isToday(reminderDate, today) {
  return reminderDate === today;
}

const avatarColors = [
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-emerald-100 text-emerald-700",
  "bg-orange-100 text-orange-700",
  "bg-pink-100 text-pink-700",
];

function getAvatarColor(name = "") {
  const idx = name.charCodeAt(0) % avatarColors.length;
  return avatarColors[idx];
}

// Busca todos os FollowUpConcluidos de uma vez para enriquecer os cards
function useConcluidosIndex() {
  const { data = [] } = useQuery({
    queryKey: ["follow-up-concluidos-list-index-v2"],
    queryFn: () => base44.entities.FollowUpConcluido.list("-completedAt", 2000),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const byWorkshop = {};
  const byFollowupId = {};
  // sequenceByFollowupId: followup_id → número sequencial cronológico (#1, #2, #3...)
  const sequenceByFollowupId = {};

  // Agrupa por workshop e ordena cronologicamente (ASC) para atribuir sequência
  const byWorkshopRaw = {};
  data.forEach(c => {
    const wid = c.workshop_id;
    if (!wid) return;
    if (!byWorkshopRaw[wid]) byWorkshopRaw[wid] = [];
    byWorkshopRaw[wid].push(c);
    // índice por followup_id (último encontrado — há no máximo 1 por FU)
    if (c.followup_id) byFollowupId[c.followup_id] = c;
    // último concluído por workshop
    if (!byWorkshop[wid] || new Date(c.completedAt) > new Date(byWorkshop[wid].completedAt)) {
      byWorkshop[wid] = c;
    }
  });

  // Ordena cada workshop por completedAt ASC e atribui sequência #1, #2, #3...
  // Chave: followup_id (= id do FollowUpReminder) OU id do próprio FollowUpConcluido
  Object.entries(byWorkshopRaw).forEach(([wid, list]) => {
    list
      .slice()
      .sort((a, b) => new Date(a.completedAt || a.created_date) - new Date(b.completedAt || b.created_date))
      .forEach((c, idx) => {
        const seq = idx + 1;
        // chave primária: followup_id vincula ao FollowUpReminder.id
        if (c.followup_id) sequenceByFollowupId[c.followup_id] = seq;
        // chave secundária: id do próprio FollowUpConcluido (sem fallback cruzado)
        if (c.id) sequenceByFollowupId[c.id] = seq;
      });
  });

  return { byWorkshop, byFollowupId, sequenceByFollowupId };
}

// Busca ATAs pelo conjunto de ata_ids dos reminders ativos — sem limite de data
function useAtasIndex(ataIds = []) {
  const uniqueIds = [...new Set(ataIds.filter(Boolean))];
  const { data = [] } = useQuery({
    queryKey: ["meeting-minutes-by-ids", uniqueIds.sort().join(",")],
    queryFn: async () => {
      if (uniqueIds.length === 0) return [];
      // Busca em lotes de 50 para não sobrecarregar
      const BATCH = 50;
      const results = [];
      for (let i = 0; i < uniqueIds.length; i += BATCH) {
        const batch = uniqueIds.slice(i, i + BATCH);
        const items = await base44.entities.MeetingMinutes.filter(
          { id: { $in: batch } },
          "-meeting_date",
          BATCH
        );
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

const CANAL_ICON_MAP = {
  whatsapp:   { icon: MessageCircle, bg: "bg-green-500",  title: "Aguardando resposta WhatsApp" },
  ligacao:    { icon: Phone,          bg: "bg-blue-500",   title: "Aguardando retorno de ligação" },
  email:      { icon: Mail,           bg: "bg-indigo-500", title: "Aguardando resposta por e-mail" },
  presencial: { icon: MapPin,         bg: "bg-gray-500",   title: "Aguardando retorno presencial" },
  meet:       { icon: Video,          bg: "bg-purple-500", title: "Aguardando retorno via Meet" },
};

export default function FollowUpList({ reminders, remindersConcluidos = [], today, isLoading, onSelect, filterPill, onFilterPill, seqByReminderId = {}, statsByWorkshopId = {}, onSuporteRapido }) {
  const [selectedCompleted, setSelectedCompleted] = useState(null);
  const [search, setSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [page, setPage] = useState(1);

  // Feedback visual de busca: indicador ativo por 300ms após última tecla
  React.useEffect(() => {
    if (!isSearching) return;
    const t = setTimeout(() => setIsSearching(false), 300);
    return () => clearTimeout(t);
  }, [isSearching, search]);
  const PAGE_SIZE = 20;
  const { byWorkshop: concluidosIndex, byFollowupId: concluidosByFuid, sequenceByFollowupId } = useConcluidosIndex();
  // Extrai todos os ata_ids dos reminders para buscar apenas as ATAs necessárias
  const ataIds = reminders.map(r => r.ata_id).filter(Boolean);
  const atasIndex = useAtasIndex(ataIds);

  // Índice: workshop_id → próximo FU pendente com reminder_date >= hoje (para coluna Próx. Contato)
  const proximoFuPorWorkshop = React.useMemo(() => {
    const mapa = {};
    reminders
      .filter(r => !r.is_completed && r.reminder_date >= today)
      .sort((a, b) => (a.reminder_date || "").localeCompare(b.reminder_date || ""))
      .forEach(r => {
        if (!mapa[r.workshop_id]) mapa[r.workshop_id] = r;
      });
    return mapa;
  }, [reminders, today]);

  const PILLS = [
    { id: "todos",      label: "Todos" },
    { id: "atrasados",  label: "Vencidos" },
    { id: "hoje",       label: "Hoje" },
    { id: "urgentes",   label: "Urgentes" },
    { id: "concluidos", label: "Concluídos" },
    { id: "criticos",   label: "🔴 Críticos" },
    { id: "por_empresa", label: "🏢 Por Empresa" },
  ];

  const searchTerm = search.trim().toLowerCase();

  // Para pills de concluídos, críticos e por_empresa, usa a lista de concluídos
  const isConcluidosPill = filterPill === "concluidos" || filterPill === "criticos" || filterPill === "por_empresa";
  const sourceList = isConcluidosPill ? remindersConcluidos : reminders;

  // Workshop IDs de TODOS os reminders visíveis (pendentes + concluídos)
  // FIX: antes só buscava para concluídos — mas pendentes também precisam da coluna Situação Reuniões
  const workshopIdsTodos = React.useMemo(
    () => [...new Set([
      ...remindersConcluidos.map(r => r.workshop_id),
      ...reminders.map(r => r.workshop_id),
    ].filter(Boolean))],
    [remindersConcluidos, reminders]
  );
  const reunioesIndex = useReunioesIndex(workshopIdsTodos);

  // Contagem de FUs por empresa (para exibir badge no modo Por Empresa)
  const fusPorEmpresa = React.useMemo(() => {
    const mapa = {};
    remindersConcluidos.forEach(r => {
      if (!r.workshop_id) return;
      if (!mapa[r.workshop_id]) mapa[r.workshop_id] = { total: 0, critico: false };
      mapa[r.workshop_id].total++;
      const risco = reunioesIndex[r.workshop_id];
      if (risco && (risco.nivel === "critico" || risco.nivel === "nunca" || (risco.atrasadas || 0) > 0)) {
        mapa[r.workshop_id].critico = true;
      }
    });
    return mapa;
  }, [remindersConcluidos, reunioesIndex]);

  const filtered = React.useMemo(() => {
    const base = sourceList.filter(r => {
      if (searchTerm && !(r.workshop_name || "").toLowerCase().includes(searchTerm)) return false;
      if (filterPill === "concluidos") return true;
      if (filterPill === "criticos") {
        const risco = reunioesIndex[r.workshop_id];
        return risco && (risco.nivel === "critico" || risco.nivel === "nunca");
      }
      if (filterPill === "por_empresa") return true; // todos os concluídos, deduplicamos abaixo
      if (filterPill === "atrasados") return !r.is_completed && r.reminder_date < today;
      if (filterPill === "hoje")      return !r.is_completed && r.reminder_date === today;
      if (filterPill === "urgentes")  return !r.is_completed && getDaysOverdue(r.reminder_date, today) >= 3;
      return !r.is_completed;
    }).sort((a, b) => {
      const aOverdue = getDaysOverdue(a.reminder_date, today);
      const bOverdue = getDaysOverdue(b.reminder_date, today);
      if (aOverdue !== bOverdue) return bOverdue - aOverdue;
      return (a.reminder_date || "").localeCompare(b.reminder_date || "");
    });

    // Deduplicação: "Por Empresa" → 1 por workshop_id (o mais recente)
    if (filterPill === "por_empresa") {
      const seen = new Set();
      // Ordena por data decrescente para pegar o mais recente
      const sorted = [...base].sort((a, b) =>
        (b.created_date || "").localeCompare(a.created_date || "")
      );
      return sorted.filter(r => {
        if (seen.has(r.workshop_id)) return false;
        seen.add(r.workshop_id);
        return true;
      });
    }

    return base;
  }, [sourceList, searchTerm, filterPill, today, reunioesIndex]);

  // Reseta para a primeira página ao trocar filtro/busca/lista
  React.useEffect(() => { setPage(1); }, [searchTerm, filterPill, sourceList.length]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const countAtrasados = reminders.filter(r => !r.is_completed && r.reminder_date < today).length;
  const countHoje      = reminders.filter(r => !r.is_completed && r.reminder_date === today).length;
  const countUrgentes  = reminders.filter(r => !r.is_completed && getDaysOverdue(r.reminder_date, today) >= 3).length;
  const countEmpresasTotal = Object.keys(fusPorEmpresa).length;
  const countEmpresasCriticas = Object.values(fusPorEmpresa).filter(e => e.critico).length;

  // Empresas distintas com pelo menos 1 FU vencido OU hoje OU urgente
  const countEmpresas = new Set(
    reminders.filter(r =>
      !r.is_completed && (
        r.reminder_date < today ||
        r.reminder_date === today ||
        getDaysOverdue(r.reminder_date, today) >= 3
      )
    ).map(r => r.workshop_id)
  ).size;

  if (isLoading) return <div className="py-20 text-center text-gray-400 text-sm">Carregando...</div>;

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setIsSearching(true); }}
          placeholder="Buscar cliente..."
          className="w-full pl-9 pr-9 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent placeholder-gray-400"
        />
        {isSearching ? (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
        ) : search ? (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        ) : null}
      </div>

      {/* Mini metric strip */}
      <div className="flex gap-3 text-sm">
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-red-500" />
          <span className="font-semibold text-red-700">{countAtrasados}</span>
          <span className="text-red-500 text-xs">vencidos</span>
        </div>
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5">
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          <span className="font-semibold text-amber-700">{countHoje}</span>
          <span className="text-amber-500 text-xs">hoje</span>
        </div>
        <div className="flex items-center gap-2 bg-orange-50 border border-orange-100 rounded-lg px-3 py-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-orange-500" />
          <span className="font-semibold text-orange-700">{countUrgentes}</span>
          <span className="text-orange-500 text-xs">urgentes</span>
        </div>
        <div
          className="flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-purple-100 transition-colors"
          onClick={() => onFilterPill("por_empresa")}
          title="Ver 1 por empresa"
        >
          <AlertCircle className="w-3.5 h-3.5 text-purple-500" />
          <span className="font-semibold text-purple-700">{countEmpresas}</span>
          <span className="text-purple-500 text-xs">empresas</span>
          {countEmpresasCriticas > 0 && (
            <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1 py-0.5 rounded-full">
              {countEmpresasCriticas}🔴
            </span>
          )}
        </div>

        {/* Botão Suporte Rápido — ao lado do card Empresas */}
        {onSuporteRapido && (
          <button
            onClick={onSuporteRapido}
            title="Suporte Rápido — atender cliente sem follow-up agendado"
            className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 hover:bg-amber-100 transition-colors text-amber-700 font-semibold text-xs"
          >
            <span className="text-sm leading-none">🛟</span>
            Suporte
          </button>
        )}
      </div>

      {/* Pills */}
      <div className="flex gap-1.5 flex-wrap">
        {PILLS.map(p => (
          <button
            key={p.id}
            onClick={() => onFilterPill(p.id)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
              filterPill === p.id
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
            <StickyNote className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-sm font-medium text-gray-500">
            {search ? "Nenhum resultado encontrado" : "Nenhum follow-up nesta categoria"}
          </p>
          <p className="text-xs text-gray-400 max-w-xs">
            {search ? "Tente outro termo ou limpe a busca para ver todos." : "Crie um novo follow-up ou atenda um cliente via suporte rápido."}
          </p>
          <div className="flex items-center gap-2 mt-1">
            {search && (
              <button
                onClick={() => setSearch("")}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Limpar busca
              </button>
            )}
            {onSuporteRapido && (
              <button
                onClick={onSuporteRapido}
                className="px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
              >
                🛟 Suporte rápido
              </button>
            )}
          </div>
        </div>
      ) : isConcluidosPill ? (
        /* Layout horizontal tipo planilha para concluídos / críticos / por_empresa */
        <div className="rounded-lg border border-gray-200 overflow-x-auto bg-white">
          {/* Cabeçalho */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wide min-w-[1200px]">
            <div className="w-10 flex-shrink-0 text-center">#FU</div>
            <div className="w-36 flex-shrink-0">
              Cliente
              {filterPill === "por_empresa" && (
                <span className="ml-1 text-[9px] text-purple-500 normal-case font-normal">(1 por empresa)</span>
              )}
            </div>
            <div className="w-20 flex-shrink-0">Data</div>
            <div className="w-28 flex-shrink-0">Consultor Resp.</div>
            <div className="w-28 flex-shrink-0">Quem Realizou</div>
            <div className="w-20 flex-shrink-0">Humor</div>
            <div className="w-20 flex-shrink-0">Canal</div>
            {filterPill === "por_empresa" && (
              <div className="w-16 flex-shrink-0">Total FUs</div>
            )}
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
            return (
              <FollowUpConcluidoRow
                key={r.id}
                completed={concluido}
                reminder={r}
                ata={ata}
                totalFollowUps={seqFU}
                totalDoCliente={clientStats?.total ?? null}
                proximoFuPendente={proximoFuPorWorkshop[r.workshop_id]}
                risco={risco}
                empresaInfo={empresaInfo}
                onSelect={() => setSelectedCompleted(r)}
              />
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 shadow-sm overflow-x-auto bg-white">
          <div className="flex items-center px-4 py-3 bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wide min-w-[1100px]">
            <div className="w-10 flex-shrink-0 text-center">#</div>
            <div className="flex-1 min-w-[180px] flex-shrink-0">Cliente</div>
            <div className="w-28 flex-shrink-0">Tipo</div>
            <div className="w-44 flex-shrink-0">Consultor</div>
            <div className="w-36 flex-shrink-0">Data</div>
            <div className="w-36 flex-shrink-0">Criado em</div>
            <div className="w-28 flex-shrink-0 text-right ml-auto">Status</div>
          </div>
          {paginated.map((r, i) => (
            <FollowUpPendenteRow
              key={r.id}
              reminder={r}
              today={today}
              seqFU={seqByReminderId[r.id] ?? null}
              onSelect={onSelect}
              isLast={i === paginated.length - 1}
            />
          ))}
        </div>
      )}

      {/* Paginação — modo planilha (pendentes e concluídos) */}
      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-gray-400">
            {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} de {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Anterior
            </button>
            <span className="text-xs text-gray-500">Página {currentPage} de {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Próxima <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Drawer for completed follow-ups */}
      <FollowUpCompletedDetailDrawer
        followUp={selectedCompleted}
        open={!!selectedCompleted}
        onClose={() => setSelectedCompleted(null)}
        seqNum={selectedCompleted ? seqByReminderId[selectedCompleted.id] : undefined}
        stats={selectedCompleted ? statsByWorkshopId[selectedCompleted.workshop_id] : undefined}
      />
    </div>
  );
}