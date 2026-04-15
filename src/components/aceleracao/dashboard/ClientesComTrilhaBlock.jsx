import React from "react";
import { Users, Sparkles, AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ClientesComTrilhaBlock({ clientes }) {
  return (
    <div className="rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50/50 to-white overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Clientes com trilha</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {clientes.length} cliente{clientes.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full">
          {clientes.length}
        </div>
      </div>

      {/* Lista */}
      <div className="px-3 pb-3 space-y-2">
        {clientes.length === 0 ? (
          <div className="text-center py-10 px-4">
            <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-400">Nenhum cliente com trilha</p>
            <p className="text-xs text-gray-400 mt-1">Crie trilhas na consultoria do cliente</p>
          </div>
        ) : (
          clientes.map(({ workshop, sprints, avgProgress, hasOverdue, hasPending, pendingCount }) => (
            <div
              key={workshop.id}
              className="bg-white rounded-xl border border-gray-100 p-4 hover:border-amber-200 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {workshop.name}
                    </p>
                    {hasOverdue && (
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs text-gray-400">
                      {sprints.length} sprint{sprints.length > 1 ? 's' : ''}
                    </span>
                    {hasPending && (
                      <span className="text-xs bg-green-50 text-green-700 font-medium px-2 py-0.5 rounded-full border border-green-200">
                        {pendingCount} pronto{pendingCount > 1 ? 's' : ''} para iniciar
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <span className="text-xs font-bold text-gray-700">{avgProgress}%</span>
                  <div className="w-14 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{ width: `${avgProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}