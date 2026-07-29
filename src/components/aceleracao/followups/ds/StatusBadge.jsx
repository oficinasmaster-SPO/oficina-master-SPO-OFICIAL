import React from "react";
import { AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import { getDaysOverdue } from "./dateUtils";

function getStatusConfig(reminder, today) {
  if (reminder.is_completed) {
    return {
      label: "Concluído",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      Icon: CheckCircle2,
    };
  }

  const days = getDaysOverdue(reminder.reminder_date, today);

  if (reminder.reminder_date < today) {
    if (days >= 3) {
      return {
        label: `Urgente ${days}d`,
        className: "bg-red-50 text-red-700 border-red-200",
        Icon: AlertCircle,
      };
    }
    return {
      label: `Vencido ${days}d`,
      className: "bg-red-50 text-red-700 border-red-200",
      Icon: AlertCircle,
    };
  }

  if (reminder.reminder_date === today) {
    return {
      label: "Hoje",
      className: "bg-amber-50 text-amber-700 border-amber-200",
      Icon: Clock,
    };
  }

  return {
    label: "Pendente",
    className: "bg-gray-100 text-gray-600 border-gray-200",
    Icon: null,
  };
}

export default function StatusBadge({ reminder, today, className = "" }) {
  const { label, className: cfg, Icon } = getStatusConfig(reminder, today);

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${cfg} ${className}`}
    >
      {Icon && <Icon className="w-3 h-3" />}
      {label}
    </span>
  );
}

export { getStatusConfig };
