import React from "react";
import { Zap, ArrowRight, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { differenceInDays } from "date-fns";

function ProgressBar({ value }) {
  return (
    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${
          value >= 80 ? 'bg-green-500' : value >= 40 ? 'bg-blue-500' : 'bg-amber-500'
        }`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export default function SprintsEmAndamentoBlock({ sprints, workshopMap, onSprintClick }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Zap className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Em execução</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {sprints.length} sprint{sprints.length > 1 ? 's' : ''} ativo{sprints.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full">
          {sprints.length}
        </div>
      </div>

      {/* Lista */}
      <div className="px-3 pb-3 space-y-2">
        {sprints.length === 0 ? (
          <div className="text-center py-10 px-4">
            <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
              <Zap className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-400">Nenhum sprint em execução</p>
            <p className="text-xs text-gray-400 mt-1">Inicie um sprint na trilha do cliente</p>
          </div>
        ) : (
          sprints.map(sprint => {
            const workshop = workshopMap[sprint.workshop_id];
            const progress = sprint.progress_percentage || 0;
            const daysRemaining = sprint.end_date
              ? differenceInDays(new Date(sprint.end_date), new Date())
              : null;
            const isAtRisk = daysRemaining !== null && daysRemaining <= 3 && daysRemaining >= 0;

            return (
              <div
                key={sprint.id}
                className="bg-gray-50/50 rounded-xl border border-gray-100 p-4 hover:border-blue-200 hover:bg-blue-50/30 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {workshop?.name || 'Cliente'}
                    </p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{sprint.title}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onSprintClick(sprint)}
                    className="text-xs gap-1 flex-shrink-0 rounded-lg h-8 border-gray-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors"
                  >
                    Continuar <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {/* Progress + meta info */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 font-medium">Progresso</span>
                    <span className="font-bold text-gray-700">{progress}%</span>
                  </div>
                  <ProgressBar value={progress} />
                  <div className="flex items-center justify-between">
                    {daysRemaining !== null && (
                      <div className={`flex items-center gap-1 text-xs ${
                        isAtRisk ? 'text-amber-600 font-semibold' : 'text-gray-400'
                      }`}>
                        {isAtRisk ? <AlertCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {daysRemaining <= 0
                          ? 'Vence hoje'
                          : `${daysRemaining} dia${daysRemaining > 1 ? 's' : ''} restante${daysRemaining > 1 ? 's' : ''}`
                        }
                      </div>
                    )}
                    {isAtRisk && (
                      <span className="text-xs bg-amber-50 text-amber-700 font-medium px-2 py-0.5 rounded-full border border-amber-200">
                        Risco
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}