import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Rocket, ArrowRight, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { createPageUrl } from "@/utils";
import { useAdminMode } from "@/components/hooks/useAdminMode";

const phaseStatusLabels = {
  not_started: "Não iniciada",
  in_progress: "Em andamento",
  pending_review: "Aguardando revisão",
  completed: "Concluída",
};

const phaseStatusColors = {
  not_started: "bg-gray-100 text-gray-600",
  in_progress: "bg-blue-100 text-blue-700",
  pending_review: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
};

export default function SprintAtivaWidget({ workshopId }) {
  const { getAdminUrl } = useAdminMode();
  const queryClient = useQueryClient();

  // Subscribe em tempo real para atualizar imediatamente quando sprint for criada/atualizada
  useEffect(() => {
    if (!workshopId) return;
    const unsubscribe = base44.entities.ConsultoriaSprint.subscribe((event) => {
      if (event.data?.workshop_id === workshopId) {
        queryClient.invalidateQueries({ queryKey: ["active-sprint-widget", workshopId] });
      }
    });
    return unsubscribe;
  }, [workshopId, queryClient]);

  const { data: activeSprint } = useQuery({
    queryKey: ["active-sprint-widget", workshopId],
    queryFn: async () => {
      const sprints = await base44.entities.ConsultoriaSprint.filter(
        { workshop_id: workshopId, status: { $in: ["in_progress", "pending"] } },
        "-updated_date",
        1
      );
      return Array.isArray(sprints) && sprints.length > 0 ? sprints[0] : null;
    },
    enabled: !!workshopId,
    staleTime: 15 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  if (!activeSprint) return null;

  const phases = activeSprint.phases || [];
  const completedPhases = phases.filter((p) => p.status === "completed").length;
  const currentPhase = phases.find(
    (p) => p.status === "in_progress" || p.status === "pending_review"
  );
  const pendingReviewCount = phases.filter((p) => p.status === "pending_review").length;

  return (
    <Card className="mb-6 border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 hover:shadow-xl transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <Rocket className="w-5 h-5" />
          Sprint Ativo — Aceleração
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900">{activeSprint.title}</h3>
            {activeSprint.objective && (
              <p className="text-sm text-gray-600 mt-1">{activeSprint.objective}</p>
            )}

            <div className="flex flex-wrap items-center gap-2 mt-3">
              {/* Progress */}
              <Badge variant="outline" className="gap-1 text-gray-700">
                <CheckCircle className="w-3 h-3" />
                {completedPhases}/{phases.length} fases
              </Badge>

              {/* Current phase */}
              {currentPhase && (
                <Badge className={phaseStatusColors[currentPhase.status]}>
                  {currentPhase.name}: {phaseStatusLabels[currentPhase.status]}
                </Badge>
              )}

              {/* Pending reviews */}
              {pendingReviewCount > 0 && (
                <Badge className="bg-amber-100 text-amber-700 gap-1">
                  <Clock className="w-3 h-3" />
                  {pendingReviewCount} aguardando revisão
                </Badge>
              )}

              {/* Progress bar */}
              <div className="w-full mt-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-orange-500 to-amber-500 h-full rounded-full transition-all"
                      style={{ width: `${activeSprint.progress_percentage || 0}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-gray-600">
                    {Math.round(activeSprint.progress_percentage || 0)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Link to={getAdminUrl(createPageUrl("PainelClienteAceleracao"))} className="shrink-0">
            <Button className="bg-orange-600 hover:bg-orange-700 text-white gap-2">
              Acessar Sprint
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}