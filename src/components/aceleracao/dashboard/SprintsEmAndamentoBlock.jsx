import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap } from "lucide-react";
import SprintRow from "./SprintRow";

export default function SprintsEmAndamentoBlock({ sprints, workshopMap, onSprintClick }) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <Zap className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <span>Sprints em Execução</span>
            <p className="text-xs font-normal text-gray-500 mt-0.5">{sprints.length} sprint{sprints.length > 1 ? 's' : ''} ativos</p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-2">
        {sprints.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhum sprint em andamento</p>
            <p className="text-xs mt-1">Inicie um sprint na aba de trilhas do cliente</p>
          </div>
        ) : (
          sprints.map(sprint => (
            <SprintRow
              key={sprint.id}
              sprint={sprint}
              workshop={workshopMap[sprint.workshop_id]}
              onClick={onSprintClick}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}