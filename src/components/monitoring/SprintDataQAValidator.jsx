import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";

export default function SprintDataQAValidator({ workshopId }) {
  const [selectedSprintId, setSelectedSprintId] = useState(null);

  const { data: sprints = [] } = useQuery({
    queryKey: ["qa-sprints", workshopId],
    queryFn: async () => {
      if (!workshopId) return [];
      return await base44.entities.ConsultoriaSprint.filter(
        { workshop_id: workshopId },
        "sprint_number"
      );
    },
    enabled: !!workshopId,
  });

  const selectedSprint = sprints.find(s => s.id === selectedSprintId) || sprints[0];

  if (!selectedSprint) {
    return (
      <Card className="border-2 border-yellow-300">
        <CardContent className="py-6 text-center">
          <AlertTriangle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
          <p className="text-gray-600">Nenhuma sprint encontrada</p>
        </CardContent>
      </Card>
    );
  }

  const phases = selectedSprint.phases || [];
  const planningPhase = phases.find(p => p.name === "Planning");
  const tasks = planningPhase?.tasks || [];

  const tasksWithInstructions = tasks.filter(t => t.instructions);
  const tasksWithLinks = tasks.filter(t => t.link_url);
  const tasksWithoutData = tasks.filter(t => !t.instructions && !t.link_url);

  const issuesFound = tasksWithoutData.length > 0;

  return (
    <div className="space-y-4">
      {/* Sprint Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Sprint Selecionada</CardTitle>
        </CardHeader>
        <CardContent>
          <select
            value={selectedSprintId || ""}
            onChange={(e) => setSelectedSprintId(e.target.value || null)}
            className="w-full border rounded p-2"
          >
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} (Sprint {s.sprint_number})
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {/* QA Status Summary */}
      <Card className={issuesFound ? "border-2 border-red-300" : "border-2 border-green-300"}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">QA Status - Fase Planning</CardTitle>
            {issuesFound ? (
              <Badge className="bg-red-600">❌ Problemas Detectados</Badge>
            ) : (
              <Badge className="bg-green-600">✅ Tudo OK</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 p-3 rounded text-center">
              <p className="text-2xl font-bold text-blue-600">{tasks.length}</p>
              <p className="text-xs text-gray-600">Total de Tarefas</p>
            </div>
            <div className="bg-green-50 p-3 rounded text-center">
              <p className="text-2xl font-bold text-green-600">{tasksWithInstructions.length}</p>
              <p className="text-xs text-gray-600">Com Instruções</p>
            </div>
            <div className="bg-blue-50 p-3 rounded text-center">
              <p className="text-2xl font-bold text-blue-600">{tasksWithLinks.length}</p>
              <p className="text-xs text-gray-600">Com Links</p>
            </div>
          </div>

          {issuesFound && (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <div className="flex gap-2 items-start">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-red-900">⚠️ {tasksWithoutData.length} tarefa(s) SEM dados:</p>
                  <ul className="mt-2 space-y-1">
                    {tasksWithoutData.map((t, i) => (
                      <li key={i} className="text-red-800 text-xs">
                        • {t.description}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Tasks List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Detalhamento de Tarefas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {tasks.map((task, idx) => {
              const hasInstructions = !!task.instructions;
              const hasLink = !!task.link_url;
              const isComplete = hasInstructions && hasLink;

              return (
                <div
                  key={idx}
                  className={`border rounded p-3 ${
                    isComplete
                      ? "border-green-200 bg-green-50"
                      : "border-red-200 bg-red-50"
                  }`}
                >
                  <div className="flex items-start gap-2 mb-2">
                    {isComplete ? (
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <p className="text-sm font-medium flex-1">{task.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 ml-6 text-xs">
                    <div>
                      <span className="text-gray-600">Instruções: </span>
                      {hasInstructions ? (
                        <span className="text-green-700 font-semibold">✓ Sim</span>
                      ) : (
                        <span className="text-red-700 font-semibold">✗ Não</span>
                      )}
                    </div>
                    <div>
                      <span className="text-gray-600">Link: </span>
                      {hasLink ? (
                        <a
                          href={task.link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-700 font-semibold underline"
                        >
                          ✓ Sim
                        </a>
                      ) : (
                        <span className="text-red-700 font-semibold">✗ Não</span>
                      )}
                    </div>
                  </div>

                  {hasInstructions && (
                    <div className="ml-6 mt-2 text-xs bg-white p-2 rounded border-l-2 border-blue-400">
                      <p className="text-gray-600 font-semibold mb-1">Preview Instruções:</p>
                      <p className="text-gray-700 line-clamp-2">
                        {task.instructions.substring(0, 100)}...
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}