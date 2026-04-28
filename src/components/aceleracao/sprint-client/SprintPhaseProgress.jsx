import React from "react";
import { CheckCircle, Circle, Clock, Send, ClipboardList, Zap, Eye, Star, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

const statusConfig = {
  not_started: { color: "text-gray-400", bg: "bg-gray-100", border: "border-gray-300", ring: "", label: "Não iniciada" },
  in_progress: { color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-400", ring: "ring-2 ring-blue-200", label: "Em andamento" },
  pending_review: { color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-400", ring: "ring-2 ring-amber-200", label: "Aguardando revisão" },
  completed: { color: "text-green-600", bg: "bg-green-50", border: "border-green-400", ring: "", label: "Concluída" },
};

const phaseIcons = {
  Planning: ClipboardList,
  Execution: Zap,
  Monitoring: Eye,
  Review: Star,
  Retrospective: RotateCcw,
};

const phaseLabels = { Planning: "Planejamento", Execution: "Execução", Monitoring: "Monitoramento", Review: "Revisão", Retrospective: "Retrospectiva" };

export default function SprintPhaseProgress({ phases = [], currentPhaseIdx = -1, onPhaseClick }) {
  return (
    <div className="flex items-end w-full py-3">
      {phases.map((phase, idx) => {
        const config = statusConfig[phase.status] || statusConfig.not_started;
        const Icon = phaseIcons[phase.name] || Circle;
        const isLast = idx === phases.length - 1;
        const isActive = idx === currentPhaseIdx;
        const isCompleted = phase.status === "completed";

        return (
          <React.Fragment key={idx}>
            <div
              className={cn(
                "flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group transition-transform duration-150",
                isActive && "scale-110",
                !isActive && "hover:scale-105"
              )}
              onClick={() => onPhaseClick?.(idx)}
            >
              <span className={cn(
                "text-[10px] text-center leading-tight max-w-[72px] font-medium transition-colors",
                isActive ? "text-blue-700" : "text-gray-500 group-hover:text-gray-700"
              )}>
                {phaseLabels[phase.name] || phase.name}
              </span>
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-200",
                config.bg, config.border,
                isActive && config.ring,
                isActive && "shadow-md",
                !isActive && "group-hover:shadow-sm"
              )}>
                {isCompleted ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <Icon className={cn("w-4 h-4 transition-colors", isActive ? config.color : "text-gray-400 group-hover:text-gray-600")} />
                )}
              </div>
            </div>
            {!isLast && (
              <div className={cn(
                "h-0.5 flex-1 self-end mb-5 rounded-full transition-colors",
                isCompleted ? "bg-green-400" : idx < currentPhaseIdx ? "bg-blue-300" : "bg-gray-200"
              )} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}