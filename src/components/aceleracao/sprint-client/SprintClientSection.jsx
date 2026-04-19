import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Rocket, Loader2 } from "lucide-react";
import SprintClientCard from "./SprintClientCard";
import SprintClientModal from "./SprintClientModal";
import SprintCompletionSummary from "../sprint-shared/SprintCompletionSummary";

export default function SprintClientSection({ workshopId, user, workshop }) {
  const [selectedSprintId, setSelectedSprintId] = useState(null);
  const queryClient = useQueryClient();

  const { data: sprints = [], isLoading } = useQuery({
    queryKey: ["sprints-client", workshopId],
    queryFn: async () => {
      const result = await base44.entities.ConsultoriaSprint.filter(
        { workshop_id: workshopId },
        "sprint_number"
      );
      return Array.isArray(result) ? result : [];
    },
    enabled: !!workshopId,
    staleTime: 0, // Sempre buscar dados frescos
    refetchInterval: 5000, // Refetch a cada 5 segundos
  });

  // Sincronizar com mudanças em tempo real do banco
  useEffect(() => {
    if (!workshopId) return;
    
    const unsubscribe = base44.entities.ConsultoriaSprint.subscribe((event) => {
      if (event.data?.workshop_id === workshopId) {
        queryClient.refetchQueries({ queryKey: ['sprints-client', workshopId] });
      }
    });

    return unsubscribe;
  }, [workshopId, queryClient]);

  // Always derive selectedSprint from fresh query data
  const selectedSprint = selectedSprintId ? sprints.find(s => s.id === selectedSprintId) || null : null;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  if (sprints.length === 0) return null;

  const activeSprints = sprints.filter(s => s.status === "in_progress" || s.status === "overdue" || s.status === "pending");
  const completedSprints = sprints.filter(s => s.status === "completed");

  return (
    <>
      <Card className="border-2 border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <Rocket className="w-5 h-5" />
            Sprints de Aceleração
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Active sprints first */}
           {activeSprints.length > 0 && (
             <div>
               <h4 className="text-sm font-semibold text-gray-600 mb-2">Em execução</h4>
              <div className="grid gap-3">
                {activeSprints.map(sprint => (
                  <SprintClientCard
                    key={sprint.id}
                    sprint={sprint}
                    onOpen={() => setSelectedSprintId(sprint.id)}
                  />
                ))}
              </div>
            </div>
          )}



          {/* Completed */}
          {completedSprints.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-600 mb-2">Concluídos</h4>
              <div className="grid gap-3">
                {completedSprints.map(sprint => (
                  <div key={sprint.id} className="space-y-2">
                    <SprintCompletionSummary sprint={sprint} />
                    <SprintClientCard
                      sprint={sprint}
                      onOpen={() => setSelectedSprintId(sprint.id)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      <SprintClientModal
        sprint={selectedSprint}
        user={user}
        workshop={workshop}
        open={!!selectedSprintId}
        onClose={() => setSelectedSprintId(null)}
      />
    </>
  );
}