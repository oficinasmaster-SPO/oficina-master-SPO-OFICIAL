import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, AlertTriangle } from "lucide-react";

export default function ClientesComTrilhaBlock({ clientes }) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <span>Clientes com Trilha</span>
            <p className="text-xs font-normal text-gray-500 mt-0.5">{clientes.length} cliente{clientes.length > 1 ? 's' : ''}</p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-2">
        {clientes.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhum cliente com trilha ativa</p>
          </div>
        ) : (
          clientes.map(({ workshop, sprints, avgProgress, hasOverdue }) => (
            <div
              key={workshop.id}
              className="flex items-center gap-3 py-3 border-b last:border-0 px-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{workshop.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-400">
                    {sprints.length} sprint{sprints.length > 1 ? 's' : ''}
                  </span>
                  {hasOverdue && (
                    <span className="text-xs text-red-500 font-semibold flex items-center gap-0.5">
                      <AlertTriangle className="w-3 h-3" /> atrasado
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="text-xs font-semibold text-gray-700">{avgProgress}%</span>
                <Progress value={avgProgress} className="w-16 h-1.5" />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}