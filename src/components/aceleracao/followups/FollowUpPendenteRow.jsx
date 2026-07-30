import React, { memo } from "react";
import { AlertCircle, Clock } from "lucide-react";
import { format } from "date-fns";

const AVATAR_COLORS = [
  "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500",
  "bg-pink-500", "bg-indigo-500", "bg-teal-500", "bg-orange-500",
  "bg-cyan-500", "bg-rose-500",
];

function getInitials(name) {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarColor(name) {
  if (!name) return AVATAR_COLORS[0];
  const sum = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    const s = typeof dateStr === "string" ? dateStr : dateStr.toISOString();
    return format(new Date(s.includes("T") ? s : s + "T12:00:00"), "dd/MM/yyyy");
  } catch {
    return "—";
  }
}

function getDaysOverdue(reminderDate, today) {
  if (!reminderDate) return 0;
  const todayMid = new Date(today + "T00:00:00");
  const remMid = new Date(reminderDate + "T00:00:00");
  return Math.round((todayMid - remMid) / (1000 * 60 * 60 * 24));
}

function getStatusInfo(reminder, today) {
  if (reminder.is_completed) {
    return { label: "Concluído", className: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  }
  const days = getDaysOverdue(reminder.reminder_date, today);
  if (reminder.reminder_date < today) {
    if (days >= 3) {
      return { label: `Urgente ${days}d`, className: "bg-red-100 text-red-700 border-red-300", urgent: true, days };
    }
    return { label: `${days}d vencido`, className: "bg-red-50 text-red-600 border-red-200", days };
  }
  if (reminder.reminder_date === today) {
    return { label: "Hoje", className: "bg-amber-50 text-amber-700 border-amber-200" };
  }
  return { label: "Pendente", className: "bg-gray-100 text-gray-500 border-gray-200" };
}

const ORIGIN_TAG = {
  guarda_chuva:    { label: "💝 Encantamento",  cls: "bg-pink-50 text-pink-700 border-pink-200" },
  suporte_checkin: { label: "🛟 Check-in Suporte", cls: "bg-orange-50 text-orange-700 border-orange-200" },
  suporte:         { label: "🛟 Suporte",        cls: "bg-amber-50 text-amber-700 border-amber-200" },
  ata:             { label: "📋 FU Ata",         cls: "bg-purple-50 text-purple-700 border-purple-200" },
  pedido_interno:  { label: "📥 Pedido",         cls: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  sprint:          { label: "🏃 Sprint",          cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  tarefa_backlog:  { label: "✅ Tarefa",          cls: "bg-blue-50 text-blue-700 border-blue-200" },
};

const FollowUpPendenteRow = memo(({ reminder, today, seqFU, stats, onSelect, isLast, meuId }) => {
  const status = getStatusInfo(reminder, today);
  const isOverdue = !reminder.is_completed && reminder.reminder_date < today;
  const isToday = !reminder.is_completed && reminder.reminder_date === today;

  const avatarColor = getAvatarColor(reminder.workshop_name);
  const initials = getInitials(reminder.workshop_name);
  const consultor = reminder.consultor_principal_nome || reminder.consultor_nome || null;
  const isDelegated = meuId && reminder.consultor_principal_id && reminder.consultor_principal_id !== meuId && reminder.consultor_id !== meuId;

  // Ticket reference for suporte_checkin
  const ticketRef = reminder.suporte_ticket_id || reminder.ticket_reference || reminder.ticket_id || null;
  const ataCodigo = reminder.ata_codigo || null;

  // Note preview
  const noteText = reminder.notas || reminder.notes || reminder.observacoes || reminder.last_note || null;

  // Origin tag
  const originTag = ORIGIN_TAG[reminder.origin_type] || null;

  // Left border accent
  const borderAccent = isOverdue
    ? "border-l-4 border-l-red-500"
    : isToday
    ? "border-l-4 border-l-amber-400"
    : "border-l-4 border-l-gray-200";

  const rowBg = isOverdue
    ? "bg-red-50/20 hover:bg-red-50/40"
    : isToday
    ? "bg-amber-50/20 hover:bg-amber-50/40"
    : "bg-white hover:bg-gray-50/70";

  const separator = isLast ? "" : "border-b border-gray-100";

  // Date display (right side)
  const dateDisplay = (() => {
    if (!reminder.reminder_date) return "—";
    const days = getDaysOverdue(reminder.reminder_date, today);
    if (reminder.reminder_date === today) return "Hoje";
    if (isOverdue) return days >= 3 ? `${days}d vencido` : `${days}d vencido`;
    try {
      return format(new Date(reminder.reminder_date + "T12:00:00"), "dd/MM");
    } catch {
      return "—";
    }
  })();

  return (
    <div
      onClick={() => onSelect?.(reminder)}
      className={`flex gap-3 px-4 py-3.5 cursor-pointer transition-colors ${borderAccent} ${rowBg} ${separator}`}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 pt-0.5">
        <div className={`w-10 h-10 rounded-full ${avatarColor} flex items-center justify-center text-white text-sm font-bold`}>
          {initials}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-1">

        {/* Line 1: workshop name + delegated indicator */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-bold text-gray-900 truncate">
            {seqFU != null ? `#${seqFU} ` : ""}{reminder.workshop_name || "Sem cliente"}
          </span>
          {isDelegated && (
            <span className="flex-shrink-0 text-[9px] font-medium text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded truncate max-w-[120px]">
              {reminder.consultor_principal_nome || reminder.consultor_nome}
            </span>
          )}
        </div>

        {/* Line 2: FU counter */}
        {stats && (
          <div className="text-[11px] text-gray-400">
            <span className="font-medium text-gray-600">{stats.total}</span> FUs
            {" · "}
            <span className="font-medium text-emerald-600">{stats.concluidos}</span> ✓
            {" · "}
            <span className={`font-medium ${stats.pendentes > 0 ? "text-amber-600" : "text-gray-400"}`}>{stats.pendentes}</span> pend.
          </div>
        )}

        {/* Line 3: FU sequence + consultor + ATA + time */}
        <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-gray-500">
          {seqFU != null && stats && (
            <span>Follow-up <span className="font-medium text-gray-700">#{seqFU}</span> de <span className="font-medium text-gray-700">{stats.total}</span></span>
          )}
          {consultor && (
            <>
              <span className="text-gray-300">·</span>
              <span className="truncate max-w-[180px]">{consultor}</span>
            </>
          )}
          {ataCodigo && (
            <>
              <span className="text-gray-300">·</span>
              <span className="font-mono text-gray-600">{ataCodigo}</span>
            </>
          )}
        </div>

        {/* Line 4: Origin tag + ticket ref */}
        {(originTag || ticketRef) && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {originTag && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${originTag.cls}`}>
                {originTag.label}
              </span>
            )}
            {ticketRef && (
              <span className="text-[10px] text-gray-400 font-mono truncate max-w-[200px]">{ticketRef}</span>
            )}
          </div>
        )}

        {/* Line 5: Created + Scheduled dates */}
        <div className="text-[11px] text-gray-400">
          {reminder.created_date && (
            <span>Criado: <span className="text-gray-500">{formatDate(reminder.created_date)}</span></span>
          )}
          {reminder.created_date && reminder.reminder_date && (
            <span className="text-gray-300"> · </span>
          )}
          {reminder.reminder_date && (
            <span>Agendado: <span className="text-gray-500">{formatDate(reminder.reminder_date)}</span></span>
          )}
        </div>

        {/* Note preview */}
        {noteText && (
          <div className="mt-1 px-2.5 py-1.5 bg-amber-50 border-l-2 border-amber-300 rounded-r-md">
            <p className="text-[11px] text-amber-800 leading-relaxed line-clamp-2">{noteText}</p>
          </div>
        )}
      </div>

      {/* Right side: date + status */}
      <div className="flex-shrink-0 flex flex-col items-end gap-1.5 pt-0.5">
        <span className={`text-xs font-semibold ${isOverdue ? "text-red-600" : isToday ? "text-amber-600" : "text-gray-500"}`}>
          {dateDisplay}
        </span>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${status.className}`}>
          {status.urgent && <AlertCircle className="w-2.5 h-2.5" />}
          {isToday && !isOverdue && <Clock className="w-2.5 h-2.5" />}
          {status.label}
        </span>
      </div>
    </div>
  );
});

FollowUpPendenteRow.displayName = "FollowUpPendenteRow";

export default FollowUpPendenteRow;
