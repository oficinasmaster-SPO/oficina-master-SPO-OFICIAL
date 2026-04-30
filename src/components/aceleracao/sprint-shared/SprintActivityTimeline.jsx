import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle, Send, RotateCcw, Clock, Plus, FileText,
  MessageSquare, User, ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Builds a timeline of events from a sprint's phases data.
 * Each event has: type, date, phase_name, description, actor
 */
function buildTimeline(sprint) {
  const events = [];
  const phases = sprint?.phases || [];

  phases.forEach((phase) => {
    const history = phase.review_history || [];

    if (history.length > 0) {
      // Use review_history for all submission/review events (new format)
      history.forEach((entry) => {
        const typeMap = {
          submitted: "submitted",
          approved: "approved",
          returned: "returned",
        };
        const descMap = {
          submitted: "Fase enviada para revisão",
          approved: "Fase aprovada pelo consultor",
          returned: "Fase devolvida para correção",
        };
        events.push({
          type: typeMap[entry.action] || entry.action,
          date: entry.date,
          phase_name: phase.name,
          description: descMap[entry.action] || entry.action,
          actor: entry.actor || "consultor",
          feedback: entry.feedback,
        });
      });
    } else {
      // Fallback for legacy data without review_history
      if (phase.submitted_for_review_at) {
        events.push({
          type: "submitted",
          date: phase.submitted_for_review_at,
          phase_name: phase.name,
          description: "Fase enviada para revisão",
          actor: "oficina",
        });
      }

      if (phase.reviewed_at) {
        const wasApproved = phase.status === "completed";
        events.push({
          type: wasApproved ? "approved" : "returned",
          date: phase.reviewed_at,
          phase_name: phase.name,
          description: wasApproved
            ? "Fase aprovada pelo consultor"
            : "Fase devolvida para correção",
          actor: "consultor",
          feedback: phase.review_feedback,
        });
      }
    }

    // Phase completed without review (direct completion by consultant)
    if (phase.completion_date && !phase.reviewed_at && !(history.some(h => h.action === "approved"))) {
      events.push({
        type: "completed",
        date: phase.completion_date,
        phase_name: phase.name,
        description: "Fase concluída",
        actor: "consultor",
      });
    }

    // Tasks completed
    (phase.tasks || []).forEach((task) => {
      if (task.completed_at) {
        events.push({
          type: "task_done",
          date: task.completed_at,
          phase_name: phase.name,
          description: task.description,
          actor: task.completed_by_role || "desconhecido",
        });
      }
    });
  });

  // Sort newest first
  events.sort((a, b) => new Date(b.date) - new Date(a.date));
  return events;
}

const PHASE_NAMES = {
  Planning: "Planejamento",
  Execution: "Execução",
  Monitoring: "Monitoramento",
  Review: "Revisão",
  Retrospective: "Retrospectiva",
};

const EVENT_CONFIG = {
  submitted: { icon: Send, color: "text-amber-600", bg: "bg-amber-100", label: "Enviada" },
  approved: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-100", label: "Aprovada" },
  returned: { icon: RotateCcw, color: "text-orange-600", bg: "bg-orange-100", label: "Devolvida" },
  completed: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-100", label: "Concluída" },
  task_done: { icon: Plus, color: "text-blue-600", bg: "bg-blue-100", label: "Tarefa" },
};

export default function SprintActivityTimeline({ sprint, maxItems = 10 }) {
  const events = buildTimeline(sprint).slice(0, maxItems);

  if (!events.length) {
    return (
      <div className="text-center py-6 text-gray-400 text-sm">
        Nenhuma atividade registrada ainda.
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {events.map((event, idx) => {
        const config = EVENT_CONFIG[event.type] || EVENT_CONFIG.task_done;
        const Icon = config.icon;
        const isLast = idx === events.length - 1;
        const dateStr = new Date(event.date).toLocaleDateString("pt-BR", {
          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
        });

        return (
          <div key={idx} className="flex gap-3">
            {/* Vertical line + icon */}
            <div className="flex flex-col items-center">
              <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0", config.bg)}>
                <Icon className={cn("w-3.5 h-3.5", config.color)} />
              </div>
              {!isLast && <div className="w-px flex-1 bg-gray-200 my-1" />}
            </div>

            {/* Content */}
            <div className="pb-4 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                 <span className="text-xs font-semibold text-gray-800">{PHASE_NAMES[event.phase_name] || event.phase_name}</span>
                 <Badge variant="outline" className="text-[10px] py-0">
                   {event.actor === "oficina" ? "Oficina" : "Consultor"}
                 </Badge>
               </div>
              <p className="text-sm text-gray-700 mt-0.5 truncate">{event.description}</p>
              {event.feedback && (
                <p className="text-xs text-orange-700 italic mt-1 bg-orange-50 rounded px-2 py-1 border border-orange-100">
                  "{event.feedback}"
                </p>
              )}
              <p className="text-[10px] text-gray-400 mt-1">{dateStr}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}