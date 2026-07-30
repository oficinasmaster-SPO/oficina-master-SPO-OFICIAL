import React from "react";
import { ProgressRing } from "./ds/ProgressRing";
import { calcHealthScore, HealthScoreBar } from "./ds/HealthScore";
import InfoTooltip from "./ds/InfoTooltip";

const TOOLTIPS = {
  followups: "Posição sequencial do follow-up atual sobre o total de follow-ups do cliente (ex: 14/22). Calculado ordenando todos os FollowUpReminders do workshop por data.",
  saude: "Score de saúde do cliente (0–100). Inicia em 50: +25 se ≥5 ATAs, +20 se último contato há ≤7 dias, -5/-10/-20 se follow-up vencido.",
  atas: "Total de ATAs (MeetingMinutes) do cliente, consultadas diretamente filtrando por workshop_id.",
  saudeBar: "Saúde do cliente (0–100). Inicia em 50; sobe com ATAs e contato recente, desce com follow-up vencido. Rótulo: saudável / em risco / crítico.",
  progresso: "Progresso do programa = (nº do follow-up atual − 1) ÷ total de follow-ups do cliente.",
  concluidos: "Número de follow-ups já concluídos do cliente (stats.concluidos).",
  pendentes: "Número de follow-ups ainda pendentes do cliente (stats.pendentes).",
  reunioes: "Número de reuniões/ATAs realizadas com o cliente (atas.length).",
  vencido: "Follow-up vencido há N dias. Calculado por differenceInDays(hoje, reminder.reminder_date).",
};

export default function OverviewCockpit({
  reminder,
  allFollowUps = [],
  atas = [],
  concluidos = [],
  today,
  currentStep,
  totalSteps,
  daysOver,
  isOverdue,
  stats,
}) {
  const fuProgress = totalSteps > 0 ? Math.round(((currentStep - 1) / totalSteps) * 100) : 0;
  const healthScore = calcHealthScore({ reminder, allFollowUps, atas, concluidos, today });

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
      <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Situação do Cliente</h3>

      {/* Rings row */}
      <div className="flex items-center justify-around">
        <InfoTooltip content={TOOLTIPS.followups}>
          <div className="flex flex-col items-center gap-1.5 cursor-help">
            <ProgressRing value={fuProgress} size={64} strokeWidth={6}>
              <span className="text-[11px] font-bold text-gray-700 tabular-nums">
                {currentStep}<span className="text-gray-400">/{totalSteps}</span>
              </span>
            </ProgressRing>
            <span className="text-[10px] text-gray-400 font-medium">Follow-ups</span>
          </div>
        </InfoTooltip>

        <InfoTooltip content={TOOLTIPS.saude}>
          <div className="flex flex-col items-center gap-1.5 cursor-help">
            <ProgressRing value={healthScore} size={64} strokeWidth={6}>
              <span className="text-[11px] font-bold tabular-nums" style={{
                color: healthScore >= 70 ? "#15803d" : healthScore >= 40 ? "#b45309" : "#dc2626"
              }}>
                {healthScore}
              </span>
            </ProgressRing>
            <span className="text-[10px] text-gray-400 font-medium">Saúde</span>
          </div>
        </InfoTooltip>

        <InfoTooltip content={TOOLTIPS.atas}>
          <div className="flex flex-col items-center gap-1.5 cursor-help">
            <ProgressRing
              value={Math.min(100, atas.length * 20)}
              size={64}
              strokeWidth={6}
              color="#6366f1"
            >
              <span className="text-[11px] font-bold text-indigo-700 tabular-nums">{atas.length}</span>
            </ProgressRing>
            <span className="text-[10px] text-gray-400 font-medium">ATAs</span>
          </div>
        </InfoTooltip>
      </div>

      {/* Overdue pill */}
      {isOverdue && daysOver > 0 && (
        <div className="flex items-center justify-center">
          <InfoTooltip content={TOOLTIPS.vencido}>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-3 py-1 rounded-full cursor-help">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              Vencido há {daysOver} dia{daysOver !== 1 ? "s" : ""}
            </span>
          </InfoTooltip>
        </div>
      )}

      {/* Health bar */}
      <InfoTooltip content={TOOLTIPS.saudeBar}>
        <div className="cursor-help">
          <HealthScoreBar score={healthScore} />
        </div>
      </InfoTooltip>

      {/* FU progress bar */}
      <InfoTooltip content={TOOLTIPS.progresso}>
        <div className="space-y-1 cursor-help">
          <div className="flex justify-between text-[11px]">
            <span className="text-gray-500">Progresso do programa</span>
            <span className="font-semibold text-gray-600">{fuProgress}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${fuProgress}%` }}
            />
          </div>
        </div>
      </InfoTooltip>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-gray-100">
          <InfoTooltip content={TOOLTIPS.concluidos}>
            <div className="text-center cursor-help">
              <p className="text-sm font-bold text-green-600">{stats.concluidos}</p>
              <p className="text-[10px] text-gray-400">Concluídos</p>
            </div>
          </InfoTooltip>
          <InfoTooltip content={TOOLTIPS.pendentes}>
            <div className="text-center cursor-help">
              <p className="text-sm font-bold text-amber-600">{stats.pendentes}</p>
              <p className="text-[10px] text-gray-400">Pendentes</p>
            </div>
          </InfoTooltip>
          <InfoTooltip content={TOOLTIPS.reunioes}>
            <div className="text-center cursor-help">
              <p className="text-sm font-bold text-indigo-600">{atas.length}</p>
              <p className="text-[10px] text-gray-400">Reuniões</p>
            </div>
          </InfoTooltip>
        </div>
      )}
    </div>
  );
}