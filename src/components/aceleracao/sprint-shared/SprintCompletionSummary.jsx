import React from "react";
import { Trophy, CheckCircle, Calendar, Clock, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function SprintCompletionSummary({ sprint }) {
  if (!sprint || sprint.status !== "completed") return null;

  const phases = sprint.phases || [];
  const totalTasks = phases.reduce((s, p) => s + (p.tasks?.length || 0), 0);
  const doneTasks = phases.reduce((s, p) => s + (p.tasks?.filter(t => t.status === "done").length || 0), 0);

  const startDate = sprint.start_date
    ? new Date(sprint.start_date).toLocaleDateString("pt-BR")
    : "—";
  const endDate = sprint.end_date
    ? new Date(sprint.end_date).toLocaleDateString("pt-BR")
    : "—";

  // Calculate duration
  let durationDays = null;
  if (sprint.start_date) {
    const lastPhase = [...phases].reverse().find(p => p.completion_date);
    const endRef = lastPhase?.completion_date || sprint.end_date;
    if (endRef) {
      durationDays = Math.ceil(
        (new Date(endRef) - new Date(sprint.start_date)) / (1000 * 60 * 60 * 24)
      );
    }
  }

  return (
    <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 border-2 border-green-200 rounded-xl p-6 text-center space-y-4">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <Trophy className="w-8 h-8 text-green-600" />
      </div>

      <div>
        <h3 className="text-lg font-bold text-green-900">Sprint Concluído!</h3>
        <p className="text-sm text-green-700 mt-1">{sprint.title}</p>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <Badge className="bg-green-100 text-green-700 gap-1">
          <CheckCircle className="w-3 h-3" />
          {phases.length} fases concluídas
        </Badge>
        <Badge className="bg-green-100 text-green-700 gap-1">
          <Star className="w-3 h-3" />
          {doneTasks}/{totalTasks} tarefas
        </Badge>
        {durationDays && (
          <Badge className="bg-green-100 text-green-700 gap-1">
            <Clock className="w-3 h-3" />
            {durationDays} dias
          </Badge>
        )}
      </div>

      <div className="flex justify-center gap-6 text-xs text-green-600 pt-2">
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" /> Início: {startDate}
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" /> Fim: {endDate}
        </span>
      </div>

      {sprint.objective && (
        <p className="text-sm text-green-800 bg-green-100/60 rounded-lg p-3 mx-auto max-w-md">
          <strong>Objetivo:</strong> {sprint.objective}
        </p>
      )}
    </div>
  );
}