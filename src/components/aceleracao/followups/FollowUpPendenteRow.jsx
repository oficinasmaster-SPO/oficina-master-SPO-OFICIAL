import React, { memo } from "react";
import { AlertCircle, Clock, User, Calendar, FileText, Phone, Mail } from "lucide-react";
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

// Mapeia origin_type → label curto para badge
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
  FUAta: "bg-purple-50 text-purple-700 border-purple-100",
  FUSp: "bg-blue-50 text-blue-700 border-blue-100",
  Tarefa: "bg-orange-50 text-orange-700 border-orange-100",
  Pedido: "bg-cyan-50 text-cyan-700 border-cyan-100",
  Sprint: "bg-emerald-50 text-emerald-700 border-emerald-100",
  Manual: "bg-slate-50 text-slate-600 border-slate-200",
  "Guarda-chuva": "bg-amber-50 text-amber-700 border-amber-100",
};

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
    return { label: "Concluído", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" };
  }
  const daysOverdue = getDaysOverdue(reminder.reminder_date, today);
  if (reminder.reminder_date < today) {
    if (daysOverdue >= 3) {
      return {
        label: `Urgente ${daysOverdue}d`,
        className: "bg-red-50 text-red-700 border border-red-200",
        urgent: true,
        days: daysOverdue,
      };
    }
    return {
      label: `Vencido ${daysOverdue}d`,
      className: "bg-red-50 text-red-700 border border-red-200",
      days: daysOverdue,
    };
  }
  if (reminder.reminder_date === today) {
    return { label: "Hoje", className: "bg-amber-50 text-amber-700 border border-amber-200" };
  }
  return { label: "Pendente", className: "bg-slate-100 text-slate-700 border border-slate-200" };
}

const FollowUpPendenteRow = memo(({ reminder, today, seqFU, onSelect }) => {
  const status = getStatusInfo(reminder, today);
  const isOverdue = !reminder.is_completed && reminder.reminder_date < today;
  const isToday = !reminder.is_completed && reminder.reminder_date === today;

  const borderAccent = isOverdue
    ? "border-l-4 border-l-red-500"
    : isToday
      ? "border-l-4 border-l-amber-400"
      : "border-l-4 border-l-emerald-500";

  const avatarColor = getAvatarColor(reminder.workshop_name);
  const initials = getInitials(reminder.workshop_name);

  const originLabel = ORIGIN_LABELS[reminder.origin_type] || "Manual";
  const originBadgeClass = ORIGIN_BADGE_STYLES[originLabel] || ORIGIN_BADGE_STYLES.Manual;

  const consultor = reminder.consultor_principal_nome || reminder.consultor_nome || "Sem consultor";
  const originCode = reminder.ata_id || reminder.suporte_id || reminder.origem_descricao || "";

  return (
    <tr
      onClick={() => onSelect?.(reminder)}
      className={`group transition-colors hover:bg-slate-50/80 cursor-pointer ${borderAccent}`}
    >
      {/* Coluna 1: # Sequencial */}
      <td className="py-2 px-4 w-12 text-center align-middle">
        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
          #{seqFU ?? "—"}
        </span>
      </td>

      {/* Coluna 2: Cliente (Avatar + Nome) */}
      <td className="py-2 px-4 align-middle min-w-0">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-full ${avatarColor} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate leading-tight">
              {reminder.workshop_name || "Sem cliente"}
            </p>
            <p className="text-[11px] text-slate-500 truncate leading-tight">
              FU #{seqFU ?? "—"} de {seqFU ?? "—"}
            </p>
          </div>
        </div>
      </td>

      {/* Coluna 3: Tipo / Origem + Consultor */}
      <td className="py-2 px-4 align-middle min-w-0">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${originBadgeClass}`}>
              {originLabel}
            </span>
            {originCode && (
              <span className="text-[11px] text-slate-600 font-medium truncate">
                {String(originCode).substring(0, 25)}
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
            <User className="w-3 h-3 text-slate-400 flex-shrink-0" />
            <span className="truncate">{consultor}</span>
          </div>
        </div>
      </td>

      {/* Coluna 4: Datas compactas */}
      <td className="py-2 px-4 align-middle">
        <div className="flex flex-col text-[11px] text-slate-600 gap-0.5">
          <div className="flex items-center gap-1">
            <span className="text-slate-400">Criado:</span>
            <span>{formatDate(reminder.created_date)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span className="font-semibold text-slate-900">{formatDate(reminder.reminder_date)}</span>
          </div>
        </div>
      </td>

      {/* Coluna 5: Status / Alerta */}
      <td className="py-2 px-4 text-right align-middle">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${status.className}`}>
          {isOverdue && <AlertCircle className="w-3 h-3 mr-1" />}
          {isToday && <Clock className="w-3 h-3 mr-1" />}
          {status.label}
        </span>
      </td>
    </tr>
  );
});

FollowUpPendenteRow.displayName = "FollowUpPendenteRow";

export default FollowUpPendenteRow;