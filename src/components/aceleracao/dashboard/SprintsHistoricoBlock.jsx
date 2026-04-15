import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Calendar, Trophy, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function SprintsHistoricoBlock({ sprints = [], workshopMap = {}, onSprintClick }) {
  if (!sprints.length) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-green-600" />
          <h3 className="text-sm font-bold text-gray-900">Histórico de Sprints Concluídos</h3>
        </div>
        <Badge variant="outline" className="text-xs text-green-700 border-green-200 bg-green-50">
          {sprints.length} concluído{sprints.length > 1 ? "s" : ""}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-px bg-gray-100">
        {sprints.map((sprint) => {
          const workshop = workshopMap[sprint.workshop_id];
          const completedPhases = (sprint.phases || []).filter(p => p.status === "completed").length;
          const totalPhases = (sprint.phases || []).length;
          const totalTasks = (sprint.phases || []).reduce((sum, p) => sum + (p.tasks?.length || 0), 0);
          const doneTasks = (sprint.phases || []).reduce((sum, p) => sum + (p.tasks?.filter(t => t.status === "done").length || 0), 0);
          
          const completionDate = sprint.phases?.reduce((latest, p) => {
            if (p.completion_date && (!latest || new Date(p.completion_date) > new Date(latest))) {
              return p.completion_date;
            }
            return latest;
          }, null);

          return (
            <div
              key={sprint.id}
              onClick={() => onSprintClick?.(sprint)}
              className="bg-white p-4 hover:bg-green-50/50 transition-colors cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <p className="text-sm font-semibold text-gray-900 truncate">{sprint.title}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-green-500 flex-shrink-0 transition-colors" />
              </div>

              <p className="text-xs text-gray-500 mb-3 truncate pl-6">{workshop?.name || "—"}</p>

              <div className="pl-6 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Fases concluídas</span>
                  <span className="font-medium text-green-700">{completedPhases}/{totalPhases}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Tarefas feitas</span>
                  <span className="font-medium text-green-700">{doneTasks}/{totalTasks}</span>
                </div>
                {(sprint.start_date || completionDate) && (
                  <div className="flex items-center gap-1 text-xs text-gray-400 pt-1">
                    <Calendar className="w-3 h-3" />
                    {sprint.start_date && format(new Date(sprint.start_date), "dd MMM", { locale: ptBR })}
                    {sprint.start_date && completionDate && " → "}
                    {completionDate && format(new Date(completionDate), "dd MMM yyyy", { locale: ptBR })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}