import React from "react";
import { Send, ArrowRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function SprintsPendingReviewBlock({ sprints, workshopMap, onSprintClick }) {
  if (!sprints.length) return null;

  return (
    <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-white overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <Send className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-amber-900">Aguardando sua revisão</h3>
            <p className="text-xs text-amber-600/70 mt-0.5">
              {sprints.length} sprint{sprints.length > 1 ? "s" : ""} com fases para revisar
            </p>
          </div>
        </div>
        <div className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">
          {sprints.length}
        </div>
      </div>

      {/* List */}
      <div className="px-3 pb-3 space-y-2">
        {sprints.map(({ sprint, pendingPhases, workshop }) => (
          <div
            key={sprint.id}
            className="bg-white rounded-xl border border-amber-100 p-4 hover:border-amber-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {workshop?.name || "Cliente"}
                </p>
                <p className="text-xs text-gray-500 truncate mt-0.5">{sprint.title}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {pendingPhases.map((p, idx) => (
                    <Badge key={idx} className="bg-amber-100 text-amber-700 text-xs gap-1">
                      <Clock className="w-3 h-3" />
                      {p.name}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => onSprintClick(sprint)}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1 flex-shrink-0 rounded-lg h-8"
              >
                Revisar <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}