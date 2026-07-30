import React, { memo } from "react";
import WorkshopAvatar from "./ds/WorkshopAvatar";
import StatusBadge from "./ds/StatusBadge";
import OriginBadge from "./ds/OriginBadge";
import { ChannelDot } from "./ds/ChannelIcon";
import { getDaysOverdue, formatDate, formatDateTime } from "./ds/dateUtils";

const FollowUpPendenteRow = memo(({ reminder, today, seqFU, score, onSelect, isLast, meuId, stats }) => {
  const consultor = reminder.consultor_principal_nome || reminder.consultor_nome || "—";
  const isOtherConsultor =
    meuId &&
    reminder.consultor_principal_id &&
    reminder.consultor_principal_id !== meuId &&
    reminder.consultor_id !== meuId;

  const isOverdue = reminder.reminder_date < today;
  const isToday   = reminder.reminder_date === today;
  const days      = getDaysOverdue(reminder.reminder_date, today);

  // Borda esquerda por urgência
  const borderColor = isOverdue
    ? "border-l-red-500"
    : isToday
    ? "border-l-amber-400"
    : "border-l-gray-200";

  // Rótulo textual de status (acima do badge)
  const statusLabel = isOverdue
    ? days >= 3 ? `Urgente ${days}d` : `Vencido ${days}d`
    : isToday
    ? "Hoje"
    : null;

  const statusLabelColor = isOverdue ? "text-red-600" : "text-amber-600";

  return (
    <div
      onClick={() => onSelect?.(reminder)}
      className={`
        flex items-start gap-3 px-4 py-3
        border-l-[3px] ${borderColor}
        ${!isLast ? "border-b border-gray-100" : ""}
        hover:bg-gray-50/70 cursor-pointer transition-colors
      `}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 pt-0.5">
        <WorkshopAvatar name={reminder.workshop_name} size="md" />
      </div>

      {/* Corpo principal */}
      <div className="flex-1 min-w-0">

        {/* Linha 1: Nome + tags */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-gray-900 leading-tight">
            {seqFU != null ? `#${seqFU} ` : ""}{reminder.workshop_name || "Sem cliente"}
          </span>
          {isOtherConsultor && (
            <span
              className="text-[9px] font-medium text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded truncate max-w-[100px]"
              title={`Consultor: ${consultor}`}
            >
              {consultor}
            </span>
          )}
          <OriginBadge originType={reminder.origin_type} />
        </div>

        {/* Linha 2: Contadores FU */}
        {stats && (
          <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">
            {stats.total} FUs
            {" · "}
            <span className="text-emerald-600 font-medium">{stats.concluidos} ✓</span>
            {" · "}
            <span className="text-amber-600 font-medium">{stats.pendentes} pend.</span>
          </p>
        )}

        {/* Linha 3: Sequência */}
        {seqFU != null && stats && (
          <p className="text-[11px] text-blue-600 mt-0.5 leading-tight">
            Follow-up #{seqFU} de {stats.total}
          </p>
        )}

        {/* Linha 4: Datas + canal */}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {reminder.created_date && (
            <span className="text-[11px] text-gray-400">
              Criado: {formatDateTime(reminder.created_date)}
            </span>
          )}
          {reminder.reminder_date && (
            <span className="text-[11px] text-gray-400">
              · Agendado: {formatDate(reminder.reminder_date)}
            </span>
          )}
          {reminder.canal_origem && (
            <ChannelDot canal={reminder.canal_origem} />
          )}
        </div>
      </div>

      {/* Coluna direita: status */}
      <div className="flex-shrink-0 flex flex-col items-end gap-1 pt-0.5">
        {statusLabel && (
          <span className={`text-[11px] font-semibold ${statusLabelColor}`}>
            {statusLabel}
          </span>
        )}
        <StatusBadge reminder={reminder} today={today} />
      </div>
    </div>
  );
});

FollowUpPendenteRow.displayName = "FollowUpPendenteRow";
export default FollowUpPendenteRow;
