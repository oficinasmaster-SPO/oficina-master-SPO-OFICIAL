import React from "react";
import { ProgressRing } from "./ds/ProgressRing";
import { calcHealthScore, HealthScoreBar } from "./ds/HealthScore";

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
        <div className="flex flex-col items-center gap-1.5">
          <ProgressRing value={fuProgress} size={64} strokeWidth={6}>
            <span className="text-[11px] font-bold text-gray-700 tabular-nums">
              {currentStep}<span className="text-gray-400">/{totalSteps}</span>
            </span>
          </ProgressRing>
          <span className="text-[10px] text-gray-400 font-medium">Follow-ups</span>
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <ProgressRing value={healthScore} size={64} strokeWidth={6} label={`Saúde ${healthScore}%`}>
            <span className={`text-[11px] font-bold tabular-nums ${
              healthScore >= 70 ? "text-green-700" : healthScore >= 40 ? "text-amber-700" : "text-red-700"
            }`}>
              {healthScore}
            </span>
          </ProgressRing>
          <span className="text-[10px] text-gray-400 font-medium">Saúde</span>
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <ProgressRing
            value={Math.min(100, atas.length * 10)}
            size={64}
            strokeWidth={6}
            color="#6366f1"
            label={`${atas.length} ATAs`}
          >
            <span className="text-[11px] font-bold text-indigo-700 tabular-nums">{atas.length}</span>
          </ProgressRing>
          <span className="text-[10px] text-gray-400 font-medium">ATAs</span>
        </div>
      </div>

      {/* Overdue pill */}
      {isOverdue && daysOver > 0 && (
        <div className="flex items-center justify-center">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-3 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            Vencido há {daysOver} dia{daysOver !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Health bar */}
      <HealthScoreBar score={healthScore} />

      {/* FU progress bar */}
      <div className="space-y-1">
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

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-gray-100">
          <div className="text-center">
            <p className="text-sm font-bold text-green-600">{stats.concluidos}</p>
            <p className="text-[10px] text-gray-400">Concluídos</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-amber-600">{stats.pendentes}</p>
            <p className="text-[10px] text-gray-400">Pendentes</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-indigo-600">{atas.length}</p>
            <p className="text-[10px] text-gray-400">Reuniões</p>
          </div>
        </div>
      )}
    </div>
  );
}
