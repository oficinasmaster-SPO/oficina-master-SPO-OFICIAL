import React, { memo } from "react";
import { PlayCircle, FileWarning } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import WorkshopAvatar from "./ds/WorkshopAvatar";
import StatusBadge from "./ds/StatusBadge";
import OriginBadge from "./ds/OriginBadge";
import { getDaysOverdue, formatDate, formatDateTime } from "./ds/dateUtils";

// Returns Tailwind bg color class for the meeting-risk dot overlay on the avatar
function riscoToDotColor(risco) {
  if (!risco || risco.nivel === "sem_dados") return null;
  const { nivel, atrasadas = 0 } = risco;
  if (nivel === "critico" || nivel === "nunca" || atrasadas > 0) return "bg-red-500";
  if (nivel === "atencao") return "bg-amber-400";
  if (nivel === "ok") return "bg-emerald-400";
  return null;
}

const FollowUpPendenteRow = memo(({
  reminder, today, seqFU, score, onSelect, isLast, stats, isSelected, risco, onIniciarAtendimento, plano, logo_url, workshopConsultorPrincipal,
}) => {
  // S1: Consultor principal — fonte canônica é o Workshop (Gestão de Tenants).
  // Fallback: campo no reminder → campo genérico consultor_nome.
  const consultorPrincipal = workshopConsultorPrincipal || reminder.consultor_principal_nome || reminder.consultor_nome || null;
  // Consultor executor = último que realizou o atendimento. Qualquer consultor pode atender.
  const consultorExecutor = reminder.consultor_executor_nome || null;

  const isOverdue = reminder.reminder_date < today;
  const isToday   = reminder.reminder_date === today;

  const borderColor = isSelected
    ? "border-l-blue-500"
    : isOverdue
    ? "border-l-red-500"
    : isToday
    ? "border-l-amber-400"
    : "border-l-gray-200";

  const pct = stats && stats.total > 0
    ? Math.round((stats.concluidos / stats.total) * 100)
    : 0;

  const dotColor = riscoToDotColor(risco);

  return (
    <div
      onClick={() => onSelect?.(reminder)}
      className={`
        group flex items-center border-l-[3px] ${borderColor}
        ${!isLast ? "border-b border-gray-100" : ""}
        ${isSelected
          ? "bg-blue-50/60 hover:bg-blue-50/80"
          : "hover:bg-gray-50/60"
        }
        cursor-pointer transition-colors
      `}
    >
      {/* ── CLIENTE ── flex-1 */}
      <div className="flex-1 min-w-[240px] px-4 py-2.5 flex items-center gap-2.5 min-w-0">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex-shrink-0 relative cursor-help">
                <WorkshopAvatar name={reminder.workshop_name} size="md" logo_url={logo_url} />
                {dotColor && (
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${dotColor}`}
                  />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[260px] bg-white border border-black rounded-lg px-3 py-2 text-xs text-gray-900 shadow-md z-[99999]">
              <div className="space-y-1">
                <p className="font-semibold text-gray-900">Bolinha de risco de reuniões:</p>
                <p className="flex items-center gap-1.5"><span className="inline-block w-2 h-2 rounded-full bg-red-500" /> Crítico — sem reuniões ou atrasadas</p>
                <p className="flex items-center gap-1.5"><span className="inline-block w-2 h-2 rounded-full bg-amber-400" /> Atenção — última reunião há muitos dias</p>
                <p className="flex items-center gap-1.5"><span className="inline-block w-2 h-2 rounded-full bg-emerald-400" /> OK — reuniões em dia</p>
                <p className="text-gray-400">Sem bolinha — sem dados suficientes</p>

              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate leading-tight">
            {reminder.workshop_name || "Sem cliente"}
          </p>
          {(plano || consultorPrincipal) && (
            <p className="text-[11px] text-gray-400 truncate mt-0.5 leading-tight">
              {plano && (
                <span className="text-gray-500 font-medium">{plano}</span>
              )}
              {plano && consultorPrincipal && (
                <span className="text-gray-300 mx-1">|</span>
              )}
              {consultorPrincipal && (
                <span className="text-gray-500 truncate">{consultorPrincipal}</span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* ── CONSULTOR (último que atendeu) ── 140px */}
      <div className="w-[140px] flex-shrink-0 px-2 py-2.5 overflow-hidden">
        {consultorExecutor ? (
          <span className="block w-full text-sm font-bold truncate leading-tight text-gray-900" title={consultorExecutor}>
            {consultorExecutor}
          </span>
        ) : (
          <span className="text-gray-300 text-sm">—</span>
        )}
      </div>

      {/* ── SEQ. ── 72px */}
      <div className="w-[72px] flex-shrink-0 px-2 py-2.5">
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
      <div className="w-[200px] flex-shrink-0 px-2 py-2.5 flex flex-wrap gap-1">
        <OriginBadge originType={reminder.origin_type} />
      </div>

      {/* ── FOLLOW-UPS ── 148px */}
      <div className="w-[148px] flex-shrink-0 px-2 py-2.5">
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
      <div className="w-[176px] flex-shrink-0 px-2 py-2.5 space-y-0.5">
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
      <div className="w-[112px] flex-shrink-0 px-3 py-2.5 flex items-center justify-end gap-2">
        {onIniciarAtendimento && (
          <button
            onClick={e => { e.stopPropagation(); onIniciarAtendimento(reminder); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 p-1 rounded-md hover:bg-red-50 text-red-400 hover:text-red-600"
            title="Iniciar atendimento"
          >
            <PlayCircle className="w-3.5 h-3.5" />
          </button>
        )}
        <StatusBadge reminder={reminder} today={today} />
      </div>
    </div>
  );
});

FollowUpPendenteRow.displayName = "FollowUpPendenteRow";
export default FollowUpPendenteRow;