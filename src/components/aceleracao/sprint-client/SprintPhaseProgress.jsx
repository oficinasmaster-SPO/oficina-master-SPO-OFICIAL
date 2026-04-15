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
  return (
    <div className="flex items-center gap-1 w-full overflow-x-auto py-2">
      {phases.map((phase, idx) => {
        const config = statusConfig[phase.status] || statusConfig.not_started;
        const Icon = config.icon;
        const isLast = idx === phases.length - 1;

        return (
          <React.Fragment key={idx}>
            <div className="flex flex-col items-center min-w-[60px]">
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", config.bg)}>
                <Icon className={cn("w-4 h-4", config.color)} />
              </div>
              <span className="text-[10px] text-gray-600 mt-1 text-center leading-tight">
                {phase.name}
              </span>
            </div>
            {!isLast && (
              <div className={cn(
                "h-0.5 flex-1 min-w-[16px] mt-[-12px]",
                phase.status === "completed" ? "bg-green-400" : "bg-gray-200"
              )} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}