import React, { memo } from "react";
import WorkshopAvatar from "./ds/WorkshopAvatar";
import StatusBadge from "./ds/StatusBadge";
import { formatDate, formatDateTime } from "./ds/dateUtils";

// Tag de origem — rótulo + cor por origin_type
function originTag(origin_type, suporte_id) {
  switch (origin_type) {
    case "guarda_chuva":
      return { label: "💝 Encantamento", cls: "bg-pink-50 text-pink-700 border-pink-200" };
    case "suporte_checkin":
      return {
        label: suporte_id ? `🛟 Check-in ${suporte_id}` : "🛟 Check-in Suporte",
        cls: "bg-orange-50 text-orange-700 border-orange-200",
      };
    case "suporte":
      return { label: "🛟 Suporte", cls: "bg-orange-50 text-orange-700 border-orange-200" };
    case "ata":
      return { label: "📋 FU Ata", cls: "bg-purple-50 text-purple-700 border-purple-200" };
    default:
      return null;
  }
}

const FollowUpPendenteRow = memo(({ reminder, today, seqFU, score, onSelect, isLast, meuId, stats = null }) => {
  const consultor = reminder.consultor_principal_nome || reminder.consultor_nome || "—";
  const isOverdue = !reminder.is_completed && reminder.reminder_date < today;
  const isTodayRow = reminder.reminder_date === today;
  const borderColor = isOverdue
    ? "border-l-red-500"
    : isTodayRow
      ? "border-l-amber-400"
      : "border-l-gray-200";
  const rowBorder = isLast ? "" : "border-b border-gray-100";
  const isOtherConsultor =
    meuId &&
    reminder.consultor_principal_id &&
    reminder.consultor_principal_id !== meuId &&
    reminder.consultor_id !== meuId;

  const total = stats?.total ?? null;
  const concluidos = stats?.concluidos ?? null;
  const pendentes = stats?.pendentes ?? null;
  const seqDisplay = seqFU ?? reminder.sequence_number ?? "?";
  const totalSeq = total ?? "?";

  const tag = originTag(reminder.origin_type, reminder.suporte_id);
  const nota = reminder.notas || reminder.notes || "";

  let dateLabel = formatDate(reminder.reminder_date);
  if (isOverdue) dateLabel = "Vencido";
  else if (isTodayRow) dateLabel = "Hoje";

  return (
    <div
      onClick={() => onSelect?.(reminder)}
      className={`flex gap-3 px-3 py-3 border-l-4 ${borderColor} ${rowBorder} bg-white hover:bg-gray-50/70 cursor-pointer transition-colors`}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 pt-0.5">
        <WorkshopAvatar name={reminder.workshop_name} size="sm" />
      </div>

      {/* Conteúdo vertical */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Linha 1: #N NomeCliente + delegação */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-900 truncate">
            #{seqDisplay} {reminder.workshop_name || "Sem cliente"}
          </span>
          {isOtherConsultor && (
            <span
              className="flex-shrink-0 text-[9px] font-medium text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded truncate max-w-[120px]"
              title={`Consultor: ${consultor}`}
            >
              {consultor}
            </span>
          )}
        </div>

        {/* Linha 2: contador do cliente */}
        {stats && (
          <div className="text-[11px] text-gray-500">
            {total ?? 0} FUs · {concluidos ?? 0} ✓ · {pendentes ?? 0} pend.
          </div>
        )}

        {/* Linha 3: sequência + consultor */}
        <div className="text-[11px] text-gray-500">
          Follow-up #{seqDisplay} de {totalSeq} · {consultor}
        </div>

        {/* Linha 4: tag de origem */}
        {tag && (
          <div>
            <span
              className={`inline-flex items-center text-[10px] font-medium border px-1.5 py-0.5 rounded ${tag.cls}`}
            >
              {tag.label}
            </span>
          </div>
        )}

        {/* Linha 5: criado / agendado */}
        <div className="text-[11px] text-gray-400">
          Criado: {formatDateTime(reminder.created_date)} · Agendado: {formatDate(reminder.reminder_date)}
        </div>

        {/* Linha 6: preview de nota */}
        {nota && (
          <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1 line-clamp-2">
            {nota}
          </div>
        )}
      </div>

      {/* Coluna direita: data + status */}
      <div className="flex-shrink-0 flex flex-col items-end justify-start gap-1 pt-0.5 min-w-[80px]">
        <span
          className={`text-xs font-semibold ${isOverdue ? "text-red-600" : isTodayRow ? "text-amber-600" : "text-gray-500"}`}
        >
          {dateLabel}
        </span>
        <StatusBadge reminder={reminder} today={today} />
      </div>
    </div>
  );
});

FollowUpPendenteRow.displayName = "FollowUpPendenteRow";
export default FollowUpPendenteRow;