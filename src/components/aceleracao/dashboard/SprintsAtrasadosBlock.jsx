import React from "react";
import { AlertTriangle, ArrowRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { differenceInDays } from "date-fns";

export default function SprintsAtrasadosBlock({ sprints, workshopMap, onSprintClick }) {
  if (!sprints.length) return null;

  return (
    <div className="rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-white overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-red-900">Precisa de atenção</h3>
            <p className="text-xs text-red-600/70 mt-0.5">
              {sprints.length} sprint{sprints.length > 1 ? 's' : ''} em atraso
            </p>
          </div>
        </div>
        <div className="bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full">
          {sprints.length}
        </div>
      </div>

      {/* Lista */}
      <div className="px-3 pb-3 space-y-2">
        {sprints.map(sprint => {
          const workshop = workshopMap[sprint.workshop_id];
          const daysOverdue = sprint.end_date
            ? Math.abs(differenceInDays(new Date(sprint.end_date), new Date()))
            : 0;

          return (
            <div
              key={sprint.id}
              className="bg-white rounded-xl border border-red-100 p-4 hover:border-red-300 hover:shadow-sm transition-all group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {workshop?.name || 'Cliente'}
                  </p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{sprint.title}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <Clock className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-xs font-semibold text-red-600">
                      {daysOverdue} dia{daysOverdue !== 1 ? 's' : ''} de atraso
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => onSprintClick(sprint)}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs gap-1 flex-shrink-0 rounded-lg h-8 opacity-90 group-hover:opacity-100 transition-opacity"
                >
                  Resolver <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}