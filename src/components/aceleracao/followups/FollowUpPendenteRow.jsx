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

const ORIGIN_LABELS = {
  ata: "FUAta",
  suporte: "FUSp",
  suporte_checkin: "FUSp",
  tarefa_backlog: "Tarefa",
  pedido_interno: "Pedido",
  sprint: "Sprint",
  manual: "Manual",
  guarda_chuva: "Guarda-chuva",
};

const ORIGIN_BADGE_STYLES = {
  FUAta: "bg-purple-50 text-purple-700",
  FUSp: "bg-blue-50 text-blue-700",
  Tarefa: "bg-orange-50 text-orange-700",
  Pedido: "bg-cyan-50 text-cyan-700",
  Sprint: "bg-emerald-50 text-emerald-700",
  Manual: "bg-gray-100 text-gray-600",
  "Guarda-chuva": "bg-amber-50 text-amber-700",
};

function formatDateTime(dateStr) {
  if (!dateStr) return "—";
  try {
    const s = typeof dateStr === "string" ? dateStr : dateStr.toISOString();
    return format(new Date(s), "dd/MM/yyyy, HH:mm");
  } catch {
    return "—";
  }
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
    return { label: "Concluído", className: "bg-emerald-50 text-emerald-700" };
  }
  const daysOverdue = getDaysOverdue(reminder.reminder_date, today);
  if (reminder.reminder_date < today) {
    if (daysOverdue >= 3) {
      return {
        label: `Urgente ${daysOverdue}d`,
        className: "bg-red-50 text-red-700",
        urgent: true,
        days: daysOverdue,
      };
    }
    return {
      label: `Vencido ${daysOverdue}d`,
      className: "bg-red-50 text-red-700",
      days: daysOverdue,
    };
  }
  if (reminder.reminder_date === today) {
    return { label: "Hoje", className: "bg-amber-50 text-amber-700" };
  }
  return { label: "Pendente", className: "bg-gray-100 text-gray-600" };
}

const FollowUpPendenteRow = memo(({ reminder, today, seqFU, onSelect, isLast }) => {
  const status = getStatusInfo(reminder, today);
  const isOverdue = !reminder.is_completed && reminder.reminder_date < today;
  const isToday = !reminder.is_completed && reminder.reminder_date === today;

  const avatarColor = getAvatarColor(reminder.workshop_name);
  const initials = getInitials(reminder.workshop_name);

  const originLabel = ORIGIN_LABELS[reminder.origin_type] || "Manual";
  const originBadgeClass = ORIGIN_BADGE_STYLES[originLabel] || ORIGIN_BADGE_STYLES.Manual;

  const consultor = reminder.consultor_principal_nome || reminder.consultor_nome || "—";

  const rowBorder = isLast ? "" : "border-b border-gray-100";
  const hoverClass = "hover:bg-gray-50/70 cursor-pointer";

  return (
    <div
      onClick={() => onSelect?.(reminder)}
      className={`flex items-center px-4 py-3.5 ${rowBorder} ${hoverClass} transition-colors min-w-[1100px]`}
    >
      {/* # Sequencial */}
      <div className="w-10 flex-shrink-0 text-center">
        <span className="text-xs font-medium text-gray-400">
          #{seqFU ?? "—"}
        </span>
      </div>

      {/* Cliente */}
      <div className="flex-1 min-w-[180px] flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-full ${avatarColor} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
            {initials}
          </div>
          <span className="text-sm font-semibold text-gray-900 truncate">
            {reminder.workshop_name || "Sem cliente"}
          </span>
        </div>
      </div>

      {/* Tipo */}
      <div className="w-28 flex-shrink-0">
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${originBadgeClass}`}>
          {originLabel}
        </span>
      </div>

      {/* Consultor */}
      <div className="w-44 flex-shrink-0">
        <span className="text-sm text-gray-700 truncate block">
          {consultor}
        </span>
      </div>

      {/* Data */}
      <div className="w-36 flex-shrink-0">
        <span className="text-sm text-gray-600">
          {formatDate(reminder.reminder_date)}
        </span>
      </div>

      {/* Criado em */}
      <div className="w-36 flex-shrink-0">
        <span className="text-sm text-gray-500">
          {formatDateTime(reminder.created_date)}
        </span>
      </div>

      {/* Status */}
      <div className="w-28 flex-shrink-0 text-right ml-auto">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${status.className}`}>
          {isOverdue && <AlertCircle className="w-3 h-3 mr-1" />}
          {isToday && <Clock className="w-3 h-3 mr-1" />}
          {status.label}
        </span>
      </div>
    </div>
  );
});

FollowUpPendenteRow.displayName = "FollowUpPendenteRow";

export default FollowUpPendenteRow;