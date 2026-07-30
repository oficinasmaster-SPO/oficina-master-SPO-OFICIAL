import React, { memo } from "react";
import WorkshopAvatar from "./ds/WorkshopAvatar";
import StatusBadge from "./ds/StatusBadge";
import OriginBadge from "./ds/OriginBadge";
import { getDaysOverdue, formatDate, formatDateTime } from "./ds/dateUtils";

// Limpa o prefixo automático de sprint para exibir só o conteúdo relevante
function cleanNotesPreview(notes) {
  if (!notes) return null;
  return notes.replace(/^Follow-up automático da sprint:\s*/i, "").trim() || null;
}

const FollowUpPendenteRow = memo(({ reminder, today, seqFU, score, onSelect, isLast, meuId, stats }) => {
  const consultor = reminder.consultor_principal_nome || reminder.consultor_nome || null;
  const isOtherConsultor =
    meuId &&
    reminder.consultor_principal_id &&
    reminder.consultor_principal_id !== meuId &&
    reminder.consultor_id !== meuId;

  const isOverdue = reminder.reminder_date < today;
  const isToday   = reminder.reminder_date === today;
  const days      = getDaysOverdue(reminder.reminder_date, today);

  const borderColor = isOverdue
    ? "border-l-red-500"
    : isToday
    ? "border-l-amber-400"
    : "border-l-gray-200";

  const notesPreview = cleanNotesPreview(reminder.notes);

  // Progresso: concluidos / total
  const pct = stats && stats.total > 0
    ? Math.round((stats.concluidos / stats.total) * 100)
    : 0;

  return (
    <div
      onClick={() => onSelect?.(reminder)}
      className={`
        flex items-center border-l-[3px] ${borderColor}
        ${!isLast ? "border-b border-gray-100" : ""}
        hover:bg-gray-50/60 cursor-pointer transition-colors
      `}
    >
      {/* ── CLIENTE ── flex-1 */}
      <div className="flex-1 min-w-[240px] px-4 py-3 flex items-center gap-2.5 min-w-0">
        <div className="flex-shrink-0">
          <WorkshopAvatar name={reminder.workshop_name} size="md" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate leading-tight">
            {reminder.workshop_name || "Sem cliente"}
          </p>
          {(notesPreview || isOtherConsultor) && (
            <p className="text-[11px] text-gray-400 truncate mt-0.5 leading-tight">
              {isOtherConsultor && consultor && (
                <span className="text-blue-500 font-medium mr-1">{consultor} ·</span>
              )}
              {notesPreview}
            </p>
          )}
        </div>
      </div>

      {/* ── SEQ. ── 72px */}
      <div className="w-[72px] flex-shrink-0 px-2 py-3">
        {seqFU != null && stats ? (
          <span className="text-[12px] font-bold text-blue-600 tabular-nums">
            #{seqFU}/{stats.total}
          </span>
        ) : seqFU != null ? (
          <span className="text-[12px] font-bold text-blue-600 tabular-nums">#{seqFU}</span>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </div>

      {/* ── ORIGEM ── 200px */}
      <div className="w-[200px] flex-shrink-0 px-2 py-3 flex flex-wrap gap-1">
        <OriginBadge originType={reminder.origin_type} />
      </div>

      {/* ── FOLLOW-UPS ── 148px */}
      <div className="w-[148px] flex-shrink-0 px-2 py-3">
        {stats ? (
          <>
            <p className="text-[11px] text-gray-600 tabular-nums leading-tight">
              {stats.total}
              {" · "}
              <span className="text-emerald-600 font-semibold">{stats.concluidos} ✓</span>
              {" · "}
              <span className="text-amber-600 font-semibold">{stats.pendentes}</span>
            </p>
            <div className="mt-1.5 w-full h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-1 rounded-full bg-emerald-500 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </>
        ) : (
          <span className="text-gray-300 text-[11px]">—</span>
        )}
      </div>

      {/* ── DATAS ── 176px */}
      <div className="w-[176px] flex-shrink-0 px-2 py-3 space-y-0.5">
        {reminder.created_date && (
          <p className="text-[11px] text-gray-400 leading-tight">
            Criado {formatDateTime(reminder.created_date)}
          </p>
        )}
        {reminder.reminder_date && (
          <p className="text-[11px] text-gray-400 leading-tight">
            Agend. {formatDate(reminder.reminder_date)}
          </p>
        )}
      </div>

      {/* ── STATUS ── 112px */}
      <div className="w-[112px] flex-shrink-0 px-3 py-3 flex justify-end">
        <StatusBadge reminder={reminder} today={today} />
      </div>
    </div>
  );
});

FollowUpPendenteRow.displayName = "FollowUpPendenteRow";
export default FollowUpPendenteRow;
