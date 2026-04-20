import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, FileText, Bell, CheckCircle2, Clock, 
  ChevronDown, ChevronUp, User
} from "lucide-react";

const TYPE_CONFIG = {
  atendimento: {
    icon: Calendar,
    color: "bg-blue-100 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
    label: "Atendimento"
  },
  ata: {
    icon: FileText,
    color: "bg-purple-100 text-purple-700 border-purple-200",
    dot: "bg-purple-500",
    label: "ATA"
  },
  followup: {
    icon: Bell,
    color: "bg-amber-100 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
    label: "Follow-up"
  }
};

function TimelineItem({ item }) {
  const [expanded, setExpanded] = useState(false);
  const config = TYPE_CONFIG[item.type];
  const Icon = config.icon;

  return (
    <div className="flex gap-4">
      {/* Dot + line */}
      <div className="flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full mt-1.5 shrink-0 ${config.dot}`} />
        <div className="w-px flex-1 bg-gray-200 mt-1" />
      </div>

      {/* Content */}
      <div className="pb-5 flex-1 min-w-0">
        <div className="border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow bg-white">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`p-1.5 rounded-lg border ${config.color}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm text-gray-900 truncate">{item.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.dateLabel}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {item.statusBadge && (
                <Badge className={`text-xs ${item.statusBadge.color}`}>
                  {item.statusBadge.label}
                </Badge>
              )}
              {item.detail && (
                <button onClick={() => setExpanded(!expanded)} className="text-gray-400 hover:text-gray-600">
                  {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>

          {item.meta && (
            <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500">
              {item.meta.map((m, i) => (
                <span key={i} className="flex items-center gap-1">
                  {m.icon && <m.icon className="w-3 h-3" />}
                  {m.text}
                </span>
              ))}
            </div>
          )}

          {expanded && item.detail && (
            <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-600 whitespace-pre-line">
              {item.detail}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ClientHistoricoTimeline({ client, atendimentos = [] }) {
  const workshopId = client?.id;

  const { data: atas = [] } = useQuery({
    queryKey: ["atas-timeline", workshopId],
    queryFn: () => base44.entities.MeetingMinutes.filter({ workshop_id: workshopId }, "-meeting_date", 50),
    enabled: !!workshopId
  });

  const { data: followups = [] } = useQuery({
    queryKey: ["followups-timeline", workshopId],
    queryFn: () => base44.entities.FollowUpReminder.filter({ workshop_id: workshopId }, "-reminder_date", 50),
    enabled: !!workshopId
  });

  // Montar itens unificados
  const items = [];

  // Atendimentos
  atendimentos.filter(a => a.workshop_id === workshopId).forEach(a => {
    const date = new Date(a.data_realizada || a.data_agendada);
    items.push({
      type: "atendimento",
      date,
      dateLabel: format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }),
      title: a.tipo_atendimento || "Atendimento",
      statusBadge: a.status === "realizado"
        ? { label: "Realizado", color: "bg-green-100 text-green-700" }
        : a.status === "cancelado"
        ? { label: "Cancelado", color: "bg-red-100 text-red-700" }
        : { label: a.status, color: "bg-gray-100 text-gray-700" },
      meta: [
        a.consultor_nome && { icon: User, text: a.consultor_nome },
      ].filter(Boolean),
      detail: a.objetivo || null
    });
  });

  // ATAs
  atas.forEach(ata => {
    const date = new Date(ata.meeting_date + "T" + (ata.meeting_time || "00:00"));
    items.push({
      type: "ata",
      date,
      dateLabel: format(date, "dd/MM/yyyy", { locale: ptBR }) + (ata.meeting_time ? ` às ${ata.meeting_time}` : ""),
      title: `ATA${ata.code ? ` · ${ata.code}` : ""}${ata.tipo_aceleracao ? ` — ${ata.tipo_aceleracao}` : ""}`,
      statusBadge: ata.status === "finalizada"
        ? { label: "Finalizada", color: "bg-green-100 text-green-700" }
        : { label: "Rascunho", color: "bg-gray-100 text-gray-600" },
      meta: [
        ata.consultor_name && { icon: User, text: ata.consultor_name },
        ata.proximos_passos_list?.length && { icon: CheckCircle2, text: `${ata.proximos_passos_list.length} próximos passos` },
      ].filter(Boolean),
      detail: ata.pautas || null
    });
  });

  // Follow-ups
  followups.forEach(fu => {
    const date = new Date(fu.reminder_date + "T00:00:00");
    items.push({
      type: "followup",
      date,
      dateLabel: format(date, "dd/MM/yyyy", { locale: ptBR }),
      title: `Follow-up #${fu.sequence_number || ""}`,
      statusBadge: fu.is_completed
        ? { label: "Concluído", color: "bg-green-100 text-green-700" }
        : date < new Date()
        ? { label: "Pendente", color: "bg-red-100 text-red-700" }
        : { label: "Agendado", color: "bg-amber-100 text-amber-700" },
      meta: [
        fu.days_since_meeting && { icon: Clock, text: `${fu.days_since_meeting} dias após atendimento` },
        fu.consultor_nome && { icon: User, text: fu.consultor_nome },
      ].filter(Boolean),
      detail: fu.message || null
    });
  });

  // Ordenar por data decrescente
  items.sort((a, b) => b.date - a.date);

  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p className="text-sm">Nenhum histórico encontrado para este cliente</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Legenda */}
      <div className="flex flex-wrap gap-3 mb-5">
        {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
          <span key={key} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
        ))}
        <span className="text-xs text-gray-400 ml-auto">{items.length} eventos</span>
      </div>

      {/* Timeline */}
      <div>
        {items.map((item, idx) => (
          <TimelineItem key={idx} item={item} />
        ))}
      </div>
    </div>
  );
}