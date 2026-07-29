import React, { memo } from "react";
import WorkshopAvatar from "./ds/WorkshopAvatar";
import StatusBadge from "./ds/StatusBadge";
import OriginBadge from "./ds/OriginBadge";
import { ChannelDot } from "./ds/ChannelIcon";
import { PriorityBadge } from "./ds/PriorityScore";
import { formatDate, formatDateTime } from "./ds/dateUtils";

const FollowUpPendenteRow = memo(({ reminder, today, seqFU, score, onSelect, isLast, meuId }) => {
  const consultor = reminder.consultor_principal_nome || reminder.consultor_nome || "—";
  const rowBorder = isLast ? "" : "border-b border-gray-100";
  const isOtherConsultor =
    meuId &&
    reminder.consultor_principal_id &&
    reminder.consultor_principal_id !== meuId &&
    reminder.consultor_id !== meuId;

  return (
    <div
      onClick={() => onSelect?.(reminder)}
      className={`flex items-center px-3 py-2 ${rowBorder} hover:bg-gray-50/70 cursor-pointer transition-colors`}
    >
      {/* Prioridade */}
      <div className="w-10 flex-shrink-0 flex flex-col items-center gap-0.5">
        <PriorityBadge score={score} />
        <span className="text-[9px] text-gray-300 tabular-nums">#{seqFU ?? "—"}</span>
      </div>

      {/* Cliente */}
      <div className="flex-1 min-w-[180px] flex-shrink-0">
        <div className="flex items-center gap-2">
          <WorkshopAvatar name={reminder.workshop_name} size="sm" />
          <span className="text-sm font-semibold text-gray-900 truncate">
            {reminder.workshop_name || "Sem cliente"}
          </span>
          {isOtherConsultor && (
            <span
              className="flex-shrink-0 text-[9px] font-medium text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded truncate max-w-[100px]"
              title={`Consultor: ${consultor}`}
            >
              {consultor}
            </span>
          )}
        </div>
      </div>

      {/* Tipo */}
      <div className="w-28 flex-shrink-0">
        <OriginBadge originType={reminder.origin_type} />
      </div>

      {/* Canal */}
      <div className="w-10 flex-shrink-0 flex items-center justify-center">
        <ChannelDot canal={reminder.canal_origem} />
      </div>

      {/* Consultor */}
      <div className="w-40 flex-shrink-0">
        <span className="text-sm text-gray-700 truncate block">{consultor}</span>
      </div>

      {/* Data */}
      <div className="w-32 flex-shrink-0">
        <span className="text-sm text-gray-600">{formatDate(reminder.reminder_date)}</span>
      </div>

      {/* Criado em */}
      <div className="w-36 flex-shrink-0">
        <span className="text-sm text-gray-500">{formatDateTime(reminder.created_date)}</span>
      </div>

      {/* Status */}
      <div className="w-28 flex-shrink-0 text-right ml-auto">
        <StatusBadge reminder={reminder} today={today} />
      </div>
    </div>
  );
});

FollowUpPendenteRow.displayName = "FollowUpPendenteRow";
export default FollowUpPendenteRow;
