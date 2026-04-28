import React from "react";
import { CheckCircle, Circle, Clock, Send } from "lucide-react";
import { cn } from "@/lib/utils";

const statusConfig = {
  not_started: { icon: Circle, color: "text-gray-400", bg: "bg-gray-100", label: "Não iniciada" },
  in_progress: { icon: Clock, color: "text-blue-600", bg: "bg-blue-100", label: "Em andamento" },
  pending_review: { icon: Send, color: "text-amber-600", bg: "bg-amber-100", label: "Aguardando revisão" },
  completed: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-100", label: "Concluída" },
};

export default function SprintPhaseProgress({ phases = [] }) {
  const phaseLabels = { Planning: "Planejamento", Execution: "Execução", Monitoring: "Monitoramento", Review: "Revisão", Retrospective: "Retrospectiva" };

  return (
    <div className="flex items-end w-full py-3 px-2">
      {phases.map((phase, idx) => {
        const config = statusConfig[phase.status] || statusConfig.not_started;
        const Icon = config.icon;
        const isLast = idx === phases.length - 1;

        return (
          <React.Fragment key={idx}>
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <span className="text-[10px] text-gray-500 text-center leading-tight max-w-[64px]">
                {phaseLabels[phase.name] || phase.name}
              </span>
              <div className={cn("w-9 h-9 rounded-full flex items-center justify-center border-2", config.bg,
                phase.status === "completed" ? "border-green-400" :
                phase.status === "in_progress" ? "border-blue-400" :
                phase.status === "pending_review" ? "border-amber-400" : "border-gray-300"
              )}>
                <Icon className={cn("w-4 h-4", config.color)} />
              </div>
            </div>
            {!isLast && (
              <div className={cn(
                "h-0.5 flex-1 self-end mb-[18px]",
                phase.status === "completed" ? "bg-green-400" : "bg-gray-200"
              )} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}