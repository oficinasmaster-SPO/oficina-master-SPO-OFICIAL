import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle, Clock, Send, Rocket } from "lucide-react";
import SprintPhaseProgress from "./SprintPhaseProgress";

const statusConfig = {
  pending: { label: "Pendente", color: "bg-gray-100 text-gray-600" },
  in_progress: { label: "Em andamento", color: "bg-blue-100 text-blue-700" },
  completed: { label: "Concluído", color: "bg-green-100 text-green-700" },
  overdue: { label: "Atrasado", color: "bg-red-100 text-red-700" },
};

export default function SprintClientCard({ sprint, onOpen }) {
  const config = statusConfig[sprint.status] || statusConfig.pending;
  const phases = sprint.phases || [];
  const pendingReviews = phases.filter(p => p.status === "pending_review").length;

  return (
    <Card className="hover:shadow-md transition-shadow border-2 hover:border-blue-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Rocket className="w-4 h-4 text-orange-500 shrink-0" />
              <h3 className="font-semibold text-gray-900 truncate">{sprint.title}</h3>
            </div>
            {sprint.objective && (
              <p className="text-sm text-gray-500 line-clamp-1">{sprint.objective}</p>
            )}
          </div>
          <Badge className={config.color}>{config.label}</Badge>
        </div>

        {/* Phase progress */}
        <SprintPhaseProgress phases={phases} />

        {/* Stats row */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-green-500" />
              {Math.round(sprint.progress_percentage || 0)}%
            </span>
            {pendingReviews > 0 && (
              <span className="flex items-center gap-1 text-amber-600">
                <Send className="w-3 h-3" />
                {pendingReviews} em revisão
              </span>
            )}
            {sprint.end_date && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(sprint.end_date).toLocaleDateString("pt-BR")}
              </span>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={onOpen} className="gap-1 shrink-0">
            Abrir <ArrowRight className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}