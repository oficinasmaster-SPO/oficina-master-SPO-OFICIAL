import React, { memo } from "react";
import { AlertCircle, Clock, User, Calendar, FileText } from "lucide-react";

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

function getStatusBadge(reminder, today) {
  if (reminder.is_completed) return null;
  if (reminder.reminder_date < today) {
    return { label: "URGENTE", className: "bg-red-500 text-white", icon: AlertCircle };
  }
  if (reminder.reminder_date === today) {
    return { label: "Hoje", className: "bg-amber-400 text-amber-900", icon: Clock };
  }
  return null;
}

const FollowUpCardV2 = memo(({ reminder, today, onClick }) => {
  const badge = getStatusBadge(reminder, today);
  const avatarColor = getAvatarColor(reminder.workshop_name);
  const initials = getInitials(reminder.workshop_name);
  const isOverdue = !reminder.is_completed && reminder.reminder_date < today;
  const isToday = !reminder.is_completed && reminder.reminder_date === today;
  const borderAccent = isOverdue
    ? "border-l-4 border-l-red-500"
    : isToday
      ? "border-l-4 border-l-amber-500"
      : "border-l-4 border-l-transparent";

  return (
    <button
      onClick={() => onClick?.(reminder)}
      className={`w-full flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 ${borderAccent} hover:bg-gray-50 transition-colors text-left`}
    >
      {/* Avatar */}
      <div className={`flex-shrink-0 w-10 h-10 rounded-full ${avatarColor} flex items-center justify-center text-white text-sm font-bold`}>
        {initials}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Linha 1: Nome do cliente + badge de urgência */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-900 truncate tracking-tight">
            {reminder.workshop_name || "Sem cliente"}
          </span>
          {badge && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${badge.className}`}>
              <badge.icon className="w-3 h-3" />
              {badge.label}
            </span>
          )}
        </div>
        {/* Linha 2: Metadados secundários discretos */}
        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-gray-400">
          <User className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">
            {reminder.consultor_principal_nome || reminder.consultor_nome || "Sem consultor"}
          </span>
          {reminder.reminder_date && (
            <>
              <span className="text-gray-300">·</span>
              <Calendar className="w-3 h-3 flex-shrink-0" />
              <span>{new Date(reminder.reminder_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>
            </>
          )}
          {reminder.ata_id && (
            <>
              <span className="text-gray-300">·</span>
              <FileText className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">ATA</span>
            </>
          )}
        </div>
      </div>
    </button>
  );
});

FollowUpCardV2.displayName = "FollowUpCardV2";

export default FollowUpCardV2;