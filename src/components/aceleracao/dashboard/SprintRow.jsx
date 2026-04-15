import React from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { differenceInDays } from "date-fns";

const STATUS_CONFIG = {
  pending: { label: "Pendente", color: "bg-gray-100 text-gray-600", dot: "bg-gray-400" },
  in_progress: { label: "Em andamento", color: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  completed: { label: "Concluído", color: "bg-green-100 text-green-700", dot: "bg-green-500" },
  overdue: { label: "Atrasado", color: "bg-red-100 text-red-700", dot: "bg-red-500" }
};

export default function SprintRow({ sprint, workshop, onClick }) {
  const daysRemaining = sprint.end_date
    ? differenceInDays(new Date(sprint.end_date), new Date())
    : null;

  const statusCfg = STATUS_CONFIG[sprint.status] || STATUS_CONFIG.pending;

  return (
    <div
      onClick={() => onClick?.(sprint)}
      className="flex items-center gap-3 py-3 border-b last:border-0 hover:bg-blue-50/50 px-4 transition-colors cursor-pointer"
    >
      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusCfg.dot}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{sprint.title}</p>
        <p className="text-xs text-gray-500 truncate">{workshop?.name || sprint.workshop_id}</p>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="flex flex-col items-end gap-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500 w-8 text-right">{sprint.progress_percentage || 0}%</span>
            <Progress value={sprint.progress_percentage || 0} className="w-20 h-1.5" />
          </div>
          {daysRemaining !== null && (
            <span className={`text-xs ${
              daysRemaining < 0 ? 'text-red-500 font-semibold' 
              : daysRemaining <= 7 ? 'text-orange-500' 
              : 'text-gray-400'
            }`}>
              {daysRemaining < 0 ? `${Math.abs(daysRemaining)}d atrasado` : `${daysRemaining}d restantes`}
            </span>
          )}
        </div>
        <Badge className={`text-xs ${statusCfg.color}`}>{statusCfg.label}</Badge>
      </div>
    </div>
  );
}