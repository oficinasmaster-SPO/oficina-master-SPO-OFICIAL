import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import SprintRow from "./SprintRow";

export default function SprintsAtrasadosBlock({ sprints, workshopMap, onSprintClick }) {
  if (!sprints.length) return null;

  return (
    <Card className="border-red-300 bg-red-50/60 shadow-sm">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-bold text-red-700 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <div>
            <span>{sprints.length} Sprint{sprints.length > 1 ? 's' : ''} em Atraso</span>
            <p className="text-xs font-normal text-red-500 mt-0.5">Requerem ação imediata</p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-2">
        {sprints.map(sprint => (
          <SprintRow
            key={sprint.id}
            sprint={sprint}
            workshop={workshopMap[sprint.workshop_id]}
            onClick={onSprintClick}
          />
        ))}
      </CardContent>
    </Card>
  );
}