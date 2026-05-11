import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock, CheckCircle2, StickyNote, ArrowRight, User, CalendarCheck, MessageCircle, Phone, Mail, MapPin, Video } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import FollowUpCompletedDetailDrawer from "@/components/aceleracao/FollowUpCompletedDetailDrawer";
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
    queryKey: ["follow-up-concluidos-list-index"],
    queryFn: () => base44.entities.FollowUpConcluido.list("-completedAt", 500),
    staleTime: 3 * 60 * 1000,
  });
  // índice por workshop_id: último concluído por workshop
  const byWorkshop = {};
  data.forEach(c => {
    const wid = c.workshop_id;
    if (!wid) return;
    if (!byWorkshop[wid] || new Date(c.completedAt) > new Date(byWorkshop[wid].completedAt)) {
      byWorkshop[wid] = c;
    }
  });
  return byWorkshop;
}

export default function FollowUpList({ reminders, today, isLoading, onSelect, filterPill, onFilterPill }) {
  const [selectedCompleted, setSelectedCompleted] = useState(null);
  const concluidosIndex = useConcluidosIndex();

  const PILLS = [
    { id: "todos",     label: "Todos" },
    { id: "atrasados", label: "Vencidos" },
    { id: "hoje",      label: "Hoje" },
    { id: "urgentes",  label: "Urgentes" },
    { id: "concluidos", label: "Concluídos" },
  ];

  const filtered = reminders.filter(r => {
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

            return (
              <button
                key={r.id}
                onClick={() => isConcluido ? setSelectedCompleted(r) : onSelect(r)}
                className={`w-full text-left rounded-lg border bg-white hover:bg-gray-50 transition-all flex flex-col gap-0 group ${
                  isConcluido ? "border-green-200 bg-green-50" : isOverdue ? "border-l-4 border-l-red-500 border-t-red-100 border-r-red-100 border-b-red-100" : "border-gray-200"
                }`}
              >
                <div className="flex items-center gap-3 px-4 py-3">
                {/* Avatar */}
                <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${getAvatarColor(name)}`}>
                  {getInitials(name)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-base text-gray-800 truncate">{name}</span>
                    {/* Ícone de canal — follow-up criado via "Aguardando resposta" */}
                    {r.canal_origem && (() => {
                      const map = {
                        whatsapp:   { icon: MessageCircle, bg: "bg-green-500",  title: "Aguardando resposta WhatsApp" },
                        ligacao:    { icon: Phone,          bg: "bg-blue-500",   title: "Aguardando retorno de ligação" },
                        email:      { icon: Mail,           bg: "bg-indigo-500", title: "Aguardando resposta por e-mail" },
                        presencial: { icon: MapPin,         bg: "bg-gray-500",   title: "Aguardando retorno presencial" },
                        meet:       { icon: Video,          bg: "bg-purple-500", title: "Aguardando retorno via Meet" },
                      };
                      const cfg = map[r.canal_origem];
                      if (!cfg) return null;
                      const Icon = cfg.icon;
                      return (
                        <span title={cfg.title} className={`flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full ${cfg.bg}`}>
                          <Icon className="w-3 h-3 text-white" />
                        </span>
                      );
                    })()}
                    {isUrgent && (
                      <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wide text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                        Urgente
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 mt-0.5 space-y-0.5">
                    <div>
                      Follow-up {r.sequence_number}/4
                      {r.consultor_nome && <> · <span className="text-gray-400">{r.consultor_nome}</span></>}
                    </div>
                    <div className="text-xs text-gray-400">
                      {r.created_date && <>Criado: {format(new Date(r.created_date), "dd/MM/yyyy")}</> }
                      {r.created_date && r.reminder_date && " · "}
                      {r.reminder_date && <>Agendado: {format(new Date(r.reminder_date + "T00:00:00"), "dd/MM/yyyy")}</>}
                    </div>
                  </div>
                </div>

                {/* Right side */}
                <div className="flex-shrink-0 flex flex-col items-end gap-1">
                  {isConcluido ? (
                    <span className="text-xs font-semibold text-green-600">Concluído</span>
                  ) : isOverdue ? (
                    <span className="text-xs font-semibold text-red-600">
                      {daysOver}d vencido
                    </span>
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

                {/* Contexto da retentativa — message do reminder (nao_atendeu / aguardando) */}
                {r.message && !isConcluido && (
                  <div className="mx-4 mb-1.5 flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5">
                    <span className="text-sm flex-shrink-0">{r.canal_origem === "whatsapp" ? "💬" : "🔁"}</span>
                    <p className="text-[11px] text-amber-800 leading-relaxed line-clamp-2">{r.message}</p>
                  </div>
                )}

                {/* Próximo passo acordado no último atendimento */}
                {hasProximoPasso && !isConcluido && !(r.message) && (
                  <div className="mx-4 mb-2.5 flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                    <CalendarCheck className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-semibold text-blue-700">
                          {PROXIMO_PASSO_LABELS[ultimoConcluido.proximoPasso] || ultimoConcluido.proximoPasso}
                        </span>
                        {ultimoConcluido.proxData && (
                          <span className="text-[10px] text-blue-500">
                            · {format(new Date(ultimoConcluido.proxData + "T00:00:00"), "dd/MM/yyyy")}
                            {ultimoConcluido.proxHora && ` às ${ultimoConcluido.proxHora}`}
                          </span>
                        )}
                      </div>
                      {ultimoConcluido.compromissos && (
                        <p className="text-[10px] text-blue-600 truncate mt-0.5">{ultimoConcluido.compromissos}</p>
                      )}
                    </div>
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
      />
    </div>
  );
}