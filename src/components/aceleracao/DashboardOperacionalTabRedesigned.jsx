import { useState } from "react";
import { RefreshCw, Zap, AlertTriangle, Check, Clock, BarChart2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import useDashboardSprints from "./hooks/useDashboardSprints";
import SprintsAtrasadosBlock from "./dashboard/SprintsAtrasadosBlock";
import SprintsEmAndamentoBlock from "./dashboard/SprintsEmAndamentoBlock";
import ClientesComTrilhaBlock from "./dashboard/ClientesComTrilhaBlock";
import SprintPhaseDetailModalRedesigned from "./SprintPhaseDetailModalRedesigned";

function StatCard({ icon: Icon, label, value, color, bgIcon }) {
  return (
    <div className="flex items-center gap-3 bg-white rounded-xl border p-4">
      <div className={`w-10 h-10 rounded-lg ${bgIcon} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <p className="text-xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

export default function DashboardOperacionalTabRedesigned({ user, workshops = [] }) {
  const [selectedSprint, setSelectedSprint] = useState(null);
  const [selectedPhaseIndex, setSelectedPhaseIndex] = useState(0);

  const {
    sprintsAtrasados,
    sprintsEmAndamento,
    clientesComTrilha,
    workshopMap,
    stats,
    isLoading,
    refetch
  } = useDashboardSprints(workshops);

  const handleSprintClick = (sprint) => {
    setSelectedSprint(sprint);
    setSelectedPhaseIndex(0);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Painel de Execução</h2>
          <p className="text-sm text-gray-500">Gerencie sprints em andamento e identifique atrasos</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 border rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Atualizar
        </button>
      </div>

      {/* Stats resumidos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Zap} label="Total" value={stats.total} color="text-blue-600" bgIcon="bg-blue-50" />
        <StatCard icon={Clock} label="Em Andamento" value={stats.em_andamento} color="text-blue-500" bgIcon="bg-blue-50" />
        <StatCard icon={AlertTriangle} label="Atrasados" value={stats.atrasados} color="text-red-500" bgIcon="bg-red-50" />
        <StatCard icon={Check} label="Concluídos" value={stats.concluidos} color="text-green-500" bgIcon="bg-green-50" />
      </div>

      {/* Bloco 1: Sprints em Atraso */}
      <SprintsAtrasadosBlock
        sprints={sprintsAtrasados}
        workshopMap={workshopMap}
        onSprintClick={handleSprintClick}
      />

      {/* Bloco 2 + 3: Andamento e Clientes lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SprintsEmAndamentoBlock
            sprints={sprintsEmAndamento}
            workshopMap={workshopMap}
            onSprintClick={handleSprintClick}
          />
        </div>
        <ClientesComTrilhaBlock clientes={clientesComTrilha} />
      </div>

      {/* Modal de fase */}
      {selectedSprint && (
        <SprintPhaseDetailModalRedesigned
          sprint={selectedSprint}
          phaseIndex={selectedPhaseIndex}
          onClose={() => setSelectedSprint(null)}
          onSaved={() => {
            refetch();
            setSelectedSprint(null);
          }}
          onNavigateToPhase={(idx) => setSelectedPhaseIndex(idx)}
        />
      )}
    </div>
  );
}