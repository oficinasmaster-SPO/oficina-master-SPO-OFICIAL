import React, { memo } from "react";
import { AlertCircle, Clock, User } from "lucide-react";

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

  return (
    <button
      onClick={() => onClick?.(reminder)}
      className="w-full flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 hover:bg-gray-50 transition-colors text-left"
    >
      {/* Avatar */}
      <div className={`flex-shrink-0 w-10 h-10 rounded-full ${avatarColor} flex items-center justify-center text-white text-sm font-bold`}>
        {initials}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800 truncate">
            {reminder.workshop_name || "Sem cliente"}
          </span>
          {badge && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.className}`}>
              <badge.icon className="w-3 h-3" />
              {badge.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <User className="w-3 h-3 text-gray-400 flex-shrink-0" />
          <span className="text-xs text-gray-500 truncate">
            {reminder.consultor_principal_nome || reminder.consultor_nome || "Sem consultor"}
          </span>
        </div>
      </div>

      {/* Date */}
      <div className="flex-shrink-0 text-right">
        <span className="text-xs text-gray-400">
          {reminder.reminder_date
            ? new Date(reminder.reminder_date + "T00:00:00").toLocaleDateString("pt-BR")
            : "—"}
        </span>
      </div>
    </button>
  );
});

FollowUpCardV2.displayName = "FollowUpCardV2";

export default FollowUpCardV2;