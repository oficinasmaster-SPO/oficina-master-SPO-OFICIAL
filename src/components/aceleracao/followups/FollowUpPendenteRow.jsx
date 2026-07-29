import React, { memo } from "react";
import WorkshopAvatar from "./ds/WorkshopAvatar";
import OriginBadge from "./ds/OriginBadge";
import { ChannelDot } from "./ds/ChannelIcon";
import StatusBadge from "./ds/StatusBadge";
import { formatDate, formatDateTime } from "./ds/dateUtils";

const FollowUpPendenteRow = memo(({ reminder, today, seqFU, onSelect, isLast, meuId }) => {
  const consultor = reminder.consultor_principal_nome || reminder.consultor_nome || "—";
  const rowBorder = isLast ? "" : "border-b border-gray-100";

  return (
    <div
      onClick={() => onSelect?.(reminder)}
      className={`flex items-center px-4 py-3.5 ${rowBorder} hover:bg-gray-50/70 cursor-pointer transition-colors`}
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
          <WorkshopAvatar name={reminder.workshop_name} />
          <span className="text-sm font-semibold text-gray-900 truncate">
            {reminder.workshop_name || "Sem cliente"}
          </span>
          {meuId && reminder.consultor_principal_id &&
            reminder.consultor_principal_id !== meuId &&
            reminder.consultor_id !== meuId && (
            <span
              className="flex-shrink-0 text-[9px] font-medium text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded truncate max-w-[100px]"
              title={`Consultor: ${reminder.consultor_principal_nome || reminder.consultor_nome}`}
            >
              {reminder.consultor_principal_nome || reminder.consultor_nome}
            </span>
          )}
        </div>
      </div>

      {/* Tipo */}
      <div className="w-28 flex-shrink-0">
        <OriginBadge originType={reminder.origin_type} />
      </div>

      {/* Canal */}
      <div className="w-8 flex-shrink-0 flex justify-center">
        <ChannelDot canal={reminder.canal_origem} />
      </div>

      {/* Consultor */}
      <div className="w-44 flex-shrink-0">
        <span className="text-sm text-gray-700 truncate block">{consultor}</span>
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
        <StatusBadge reminder={reminder} today={today} />
      </div>
    </div>
  );
});

FollowUpPendenteRow.displayName = "FollowUpPendenteRow";

export default FollowUpPendenteRow;
