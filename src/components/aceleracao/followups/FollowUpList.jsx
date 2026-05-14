import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock, CheckCircle2, StickyNote, CalendarCheck, MessageCircle, Phone, Mail, MapPin, Video, FileText, Target, Search, X } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import FollowUpCompletedDetailDrawer from "@/components/aceleracao/FollowUpCompletedDetailDrawer";
import FollowUpConcluidoRow from "@/components/aceleracao/FollowUpConcluidoRow.jsx";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

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
    staleTime: 0,
    gcTime: 0,
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

export default function FollowUpList({ reminders, today, isLoading, onSelect, filterPill, onFilterPill, seqByReminderId = {}, statsByWorkshopId = {} }) {
  const [selectedCompleted, setSelectedCompleted] = useState(null);
  const [search, setSearch] = useState("");
  const { byWorkshop: concluidosIndex, byFollowupId: concluidosByFuid, sequenceByFollowupId } = useConcluidosIndex();
  // Extrai todos os ata_ids dos reminders para buscar apenas as ATAs necessárias
  const ataIds = reminders.map(r => r.ata_id).filter(Boolean);
  const atasIndex = useAtasIndex(ataIds);

  const PILLS = [
    { id: "todos",     label: "Todos" },
    { id: "atrasados", label: "Vencidos" },
    { id: "hoje",      label: "Hoje" },
    { id: "urgentes",  label: "Urgentes" },
    { id: "concluidos", label: "Concluídos" },
  ];

  const searchTerm = search.trim().toLowerCase();

  const filtered = reminders.filter(r => {
    if (searchTerm && !(r.workshop_name || "").toLowerCase().includes(searchTerm)) return false;
    if (filterPill === "concluidos") return r.is_completed;
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

  const countAtrasados = reminders.filter(r => !r.is_completed && r.reminder_date < today).length;
  const countHoje      = reminders.filter(r => !r.is_completed && r.reminder_date === today).length;
  const countUrgentes  = reminders.filter(r => !r.is_completed && getDaysOverdue(r.reminder_date, today) >= 3).length;

  if (isLoading) return <div className="py-20 text-center text-gray-400 text-sm">Carregando...</div>;

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar cliente..."
          className="w-full pl-9 pr-9 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent placeholder-gray-400"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
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
        <div className="py-16 flex flex-col items-center justify-center gap-2 text-gray-400">
          <StickyNote className="w-8 h-8 text-gray-300" />
          <p className="text-sm">Nenhum follow-up nesta categoria</p>
        </div>
      ) : filterPill === "concluidos" ? (
        /* Layout horizontal tipo planilha para concluídos */
        <div className="rounded-lg border border-gray-200 overflow-x-auto bg-white">
          {/* Cabeçalho */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wide min-w-[1100px]">
            <div className="w-10 flex-shrink-0 text-center">#FU</div>
            <div className="w-36 flex-shrink-0">Cliente</div>
            <div className="w-20 flex-shrink-0">Data</div>
            <div className="w-28 flex-shrink-0">Consultor Resp.</div>
            <div className="w-28 flex-shrink-0">Quem Realizou</div>
            <div className="w-20 flex-shrink-0">Humor</div>
            <div className="w-20 flex-shrink-0">Canal</div>
            <div className="w-20 flex-shrink-0">ATA</div>
            <div className="w-24 flex-shrink-0">Tipo</div>
            <div className="w-24 flex-shrink-0">Próx. Contato</div>
            <div className="flex-shrink-0 ml-auto">Status</div>
          </div>
          {filtered.map(r => {
            const concluido = concluidosByFuid?.[r.id] || null;
            const ata = r.ata_id ? atasIndex[r.ata_id] : null;
            // Usa sequência universal do hook (fonte da verdade: todos os reminders do cliente)
            const seqFU = seqByReminderId[r.id] ?? null;
            const clientStats = statsByWorkshopId[r.workshop_id] ?? null;
            return (
              <FollowUpConcluidoRow
                key={r.id}
                completed={concluido}
                reminder={r}
                ata={ata}
                totalFollowUps={seqFU}
                totalDoCliente={clientStats?.total ?? null}
                onSelect={() => setSelectedCompleted(r)}
              />
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => {
            const daysOver = getDaysOverdue(r.reminder_date, today);
            const isOverdue = !r.is_completed && r.reminder_date < today;
            const isTodayItem = isToday(r.reminder_date, today);
            const isUrgent = daysOver >= 3;
            const name = r.workshop_name || "Sem cliente";
            const isConcluido = r.is_completed;

            const ultimoConcluido = concluidosIndex[r.workshop_id];
            const hasProximoPasso = ultimoConcluido?.proximoPasso && ultimoConcluido.proximoPasso !== 'cancelar';

            // ATA vinculada
            const ata = r.ata_id ? atasIndex[r.ata_id] : null;
            const tipoReuniao = ata?.tipo_aceleracao || ata?.tipo_atendimento || null;
            const ataCode = ata?.code || null;
            const ataHorario = ata?.meeting_time || null;
            // objetivos_atendimento pode ser "• texto\n• texto2" — pega a 1ª linha limpa
            const objetivoRaw = ata?.objetivos_atendimento
              || (Array.isArray(ata?.objetivos) && ata.objetivos[0])
              || null;
            const objetivo = objetivoRaw
              ? (typeof objetivoRaw === "string"
                  ? objetivoRaw
                      .split("\n")[0]              // primeira linha
                      .replace(/^[•\-–\s]+/, "")   // remove bullet inicial
                      .trim()
                      .slice(0, 90)
                  : String(objetivoRaw).slice(0, 90))
              : null;

            // ATA orphan: reminder tem ata_id mas a ATA não existe mais
            const ataOrfha = r.ata_id && atasIndex !== null && Object.keys(atasIndex).length > 0 && !ata;

            // Canal ícone
            const canalCfg = r.canal_origem ? CANAL_ICON_MAP[r.canal_origem] : null;
            const CanalIcon = canalCfg?.icon || null;

            return (
              <button
                key={r.id}
                onClick={() => isConcluido ? setSelectedCompleted(r) : onSelect(r)}
                className={`w-full text-left rounded-lg border bg-white hover:bg-gray-50 transition-all flex flex-col gap-0 group ${
                  isConcluido ? "border-green-200 bg-green-50" :
                  (r.origin_type === 'suporte' || r.origin_type === 'suporte_checkin') ? (isOverdue ? "border-l-4 border-l-amber-500 border-t-amber-100 border-r-amber-100 border-b-amber-100 bg-amber-50/30" : "border-amber-200 bg-amber-50/20") :
                  isOverdue ? "border-l-4 border-l-red-500 border-t-red-100 border-r-red-100 border-b-red-100" : "border-gray-200"
                }`}
              >
                {/* MAIN ROW */}
                <div className="flex items-center gap-3 px-4 py-2.5">
                  {/* Avatar */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${getAvatarColor(name)}`}>
                    {getInitials(name)}
                  </div>

                  {/* Content — 3 sub-lines */}
                  <div className="flex-1 min-w-0">
                    {/* Line 1: nome + urgente + canal */}
                    <div className="flex items-center gap-1.5 min-w-0">
                     {seqByReminderId[r.id] && (
                       <span className="flex-shrink-0 text-[10px] font-bold text-gray-400">#{seqByReminderId[r.id]}</span>
                     )}
                     <span className="font-semibold text-sm text-gray-800 truncate">{name}</span>
                      {canalCfg && CanalIcon && (
                        <span title={canalCfg.title} className={`flex-shrink-0 flex items-center justify-center w-4 h-4 rounded-full ${canalCfg.bg}`}>
                          <CanalIcon className="w-2.5 h-2.5 text-white" />
                        </span>
                      )}
                      {isUrgent && (
                        <span className="flex-shrink-0 text-[9px] font-bold uppercase tracking-wide text-red-600 bg-red-50 border border-red-200 px-1 py-0.5 rounded">
                          Urgente
                        </span>
                      )}
                    </div>

                    {/* Stats do cliente */}
                    {statsByWorkshopId[r.workshop_id] && !r.is_completed && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-gray-400">
                          {statsByWorkshopId[r.workshop_id].total} FUs
                          · <span className="text-green-600">{statsByWorkshopId[r.workshop_id].concluidos} ✓</span>
                          · <span className="text-amber-600">{statsByWorkshopId[r.workshop_id].pendentes} pend.</span>
                        </span>
                      </div>
                    )}

                    {/* Line 2: FU + consultor | tipo + ATA code + horário */}
                    <div className="flex items-center gap-0 min-w-0 mt-0.5">
                      {(r.origin_type === 'suporte' || r.origin_type === 'suporte_checkin') ? (
                        <span className="text-xs flex-shrink-0 flex items-center gap-1">
                          <span className="text-amber-600 font-bold">🛟 {r.origin_type === 'suporte_checkin' ? 'Check-in Suporte' : 'Suporte ao Cliente'}</span>
                          {r.suporte_id && <span className="text-[10px] text-amber-500 font-mono">{r.suporte_id}</span>}
                          {r.consultor_nome && <span className="text-gray-400"> · {r.consultor_nome}</span>}
                        </span>
                      ) : (
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        Follow-up #{seqByReminderId[r.id] ?? r.sequence_number}{statsByWorkshopId[r.workshop_id] ? ` de ${statsByWorkshopId[r.workshop_id].total}` : ""}
                        {r.consultor_nome && <> · <span className="text-gray-400">{r.consultor_nome}</span></>}
                      </span>
                      )}
                      {ataOrfha ? (
                        <span className="ml-2 text-[10px] text-red-500 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                          ATA removida
                        </span>
                      ) : (tipoReuniao || ataCode || ataHorario) ? (
                        <span className="flex items-center gap-1 ml-2 flex-shrink-0">
                          {tipoReuniao && (
                            <span className="flex items-center gap-0.5 text-[10px] text-purple-700 bg-purple-50 border border-purple-100 px-1.5 py-0.5 rounded-full font-medium">
                              <FileText className="w-2.5 h-2.5" />
                              {tipoReuniao}
                            </span>
                          )}
                          {ataCode && (
                            <span className="text-[10px] text-gray-500 font-mono">· {ataCode}</span>
                          )}
                          {ataHorario && (
                            <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                              · <Clock className="w-2.5 h-2.5" />{ataHorario}
                            </span>
                          )}
                        </span>
                      ) : null}
                    </div>

                    {/* Line 3: datas + objetivo */}
                    <div className="flex items-center gap-1 min-w-0 mt-0.5">
                      <span className="text-[10px] text-gray-400 flex-shrink-0">
                        {r.created_date && <>Criado: {format(new Date(r.created_date), "dd/MM/yyyy")}</>}
                        {r.created_date && r.reminder_date && " · "}
                        {r.reminder_date && <>Agendado: {format(new Date(r.reminder_date + "T00:00:00"), "dd/MM/yyyy")}</>}
                      </span>
                      {objetivo && (
                        <span className="flex items-center gap-0.5 text-[10px] text-gray-400 italic truncate ml-1">
                          · <Target className="w-2.5 h-2.5 flex-shrink-0 text-gray-400" />
                          <span className="truncate">{objetivo}{objetivoRaw?.length > 80 ? "…" : ""}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right side */}
                  <div className="flex-shrink-0 flex flex-col items-end gap-1 ml-2">
                    {isConcluido ? (
                      <span className="text-xs font-semibold text-green-600">Concluído</span>
                    ) : isOverdue ? (
                      <span className="text-xs font-semibold text-red-600">{daysOver}d vencido</span>
                    ) : isTodayItem ? (
                      <span className="text-xs font-semibold text-amber-600">Hoje</span>
                    ) : (
                      <span className="text-xs text-gray-400">
                        {r.reminder_date ? format(new Date(r.reminder_date + "T00:00:00"), "dd/MM") : "—"}
                      </span>
                    )}
                    <Badge className={`text-[10px] px-1.5 py-0 ${
                      isConcluido ? "bg-green-100 text-green-700 border-green-200" :
                      isOverdue ? "bg-red-100 text-red-700 border-red-200" :
                      isTodayItem ? "bg-amber-100 text-amber-700 border-amber-200" :
                      "bg-gray-100 text-gray-500 border-gray-200"
                    }`}>
                      {isConcluido ? "Concluído" : isOverdue ? "Vencido" : isTodayItem ? "Hoje" : "Pendente"}
                    </Badge>
                  </div>
                </div>

                {/* Faixa de contexto — retentativa / aguardando */}
                {r.message && !isConcluido && (
                  <div className="mx-4 mb-2 flex items-center gap-2 bg-amber-50 border border-amber-100 rounded px-3 py-1.5">
                    <span className="text-xs flex-shrink-0">{r.canal_origem === "whatsapp" ? "💬" : "🔁"}</span>
                    <p className="text-[11px] text-amber-800 leading-relaxed line-clamp-1">{r.message}</p>
                  </div>
                )}

                {/* Faixa próximo passo */}
                {hasProximoPasso && !isConcluido && !r.message && (
                  <div className="mx-4 mb-2 flex items-center gap-2 bg-blue-50 border border-blue-100 rounded px-3 py-1.5">
                    <CalendarCheck className="w-3 h-3 text-blue-500 flex-shrink-0" />
                    <span className="text-[11px] font-semibold text-blue-700 flex-shrink-0">
                      {(() => {
                        const pp = ultimoConcluido.proximoPasso;
                        if (typeof pp === 'string') return PROXIMO_PASSO_LABELS[pp] || pp;
                        if (typeof pp === 'object' && pp !== null) return pp.descricao || JSON.stringify(pp);
                        return String(pp || '');
                      })()}
                    </span>
                    {ultimoConcluido.proxData && (
                      <span className="text-[10px] text-blue-500">
                        · {format(new Date(ultimoConcluido.proxData + "T00:00:00"), "dd/MM/yyyy")}
                        {ultimoConcluido.proxHora && ` às ${ultimoConcluido.proxHora}`}
                      </span>
                    )}
                    {ultimoConcluido.compromissos && (
                      <span className="text-[10px] text-blue-600 truncate ml-1">· {ultimoConcluido.compromissos}</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
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