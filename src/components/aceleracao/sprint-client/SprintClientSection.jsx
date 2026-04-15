import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Rocket, Loader2 } from "lucide-react";
import SprintClientCard from "./SprintClientCard";
import SprintClientModal from "./SprintClientModal";

export default function SprintClientSection({ workshopId, user, workshop }) {
  const [selectedSprint, setSelectedSprint] = useState(null);

  const { data: sprints = [], isLoading } = useQuery({
    queryKey: ["sprints-client", workshopId],
    queryFn: async () => {
      const result = await base44.entities.ConsultoriaSprint.filter(
        { workshop_id: workshopId },
        "-updated_date"
      );
      return Array.isArray(result) ? result : [];
    },
    enabled: !!workshopId,
    staleTime: 3 * 60 * 1000,
  });

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

  const activeSprints = sprints.filter(s => s.status === "in_progress" || s.status === "overdue");
  const completedSprints = sprints.filter(s => s.status === "completed");
  const pendingSprints = sprints.filter(s => s.status === "pending");

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
              <h4 className="text-sm font-semibold text-gray-600 mb-2">Em andamento</h4>
              <div className="grid gap-3">
                {activeSprints.map(sprint => (
                  <SprintClientCard
                    key={sprint.id}
                    sprint={sprint}
                    onOpen={() => setSelectedSprint(sprint)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Pending */}
          {pendingSprints.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-600 mb-2">Próximos</h4>
              <div className="grid gap-3">
                {pendingSprints.map(sprint => (
                  <SprintClientCard
                    key={sprint.id}
                    sprint={sprint}
                    onOpen={() => setSelectedSprint(sprint)}
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
                  <SprintClientCard
                    key={sprint.id}
                    sprint={sprint}
                    onOpen={() => setSelectedSprint(sprint)}
                  />
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
        open={!!selectedSprint}
        onClose={() => setSelectedSprint(null)}
      />
    </>
  );
}