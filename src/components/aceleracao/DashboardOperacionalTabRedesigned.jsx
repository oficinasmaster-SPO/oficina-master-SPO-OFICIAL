import { useState } from "react";
import { RefreshCw, Zap, AlertTriangle, Check, Clock, Activity, Send, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import useDashboardSprints from "./hooks/useDashboardSprints";
import SprintsAtrasadosBlock from "./dashboard/SprintsAtrasadosBlock";
import SprintsEmAndamentoBlock from "./dashboard/SprintsEmAndamentoBlock";
import SprintsPendingReviewBlock from "./dashboard/SprintsPendingReviewBlock";
import ClientesComTrilhaBlock from "./dashboard/ClientesComTrilhaBlock";
import SprintPhaseDetailModalRedesigned from "./SprintPhaseDetailModalRedesigned";
import SprintCreateForm from "./sprint-consultant/SprintCreateForm";

function StatPill({ icon: Icon, label, value, color, bgColor }) {
  return (
    <div className={`flex items-center gap-2.5 ${bgColor} rounded-xl px-4 py-3 border border-transparent`}>
      <Icon className={`w-4 h-4 ${color} flex-shrink-0`} />
      <span className="text-xs text-gray-600 font-medium">{label}</span>
      <span className={`text-sm font-bold ${color} ml-auto`}>{value}</span>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-100 rounded-lg w-48" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-14 bg-gray-100 rounded-xl" />
        ))}
      </div>
      <div className="h-48 bg-gray-50 rounded-2xl border border-gray-100" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-64 bg-gray-50 rounded-2xl border border-gray-100" />
        <div className="h-64 bg-gray-50 rounded-2xl border border-gray-100" />
      </div>
    </div>
  );
}

export default function DashboardOperacionalTabRedesigned({ user, workshops = [] }) {
  const [selectedSprint, setSelectedSprint] = useState(null);
  const [selectedPhaseIndex, setSelectedPhaseIndex] = useState(0);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const {
    sprintsAtrasados,
    sprintsEmAndamento,
    sprintsPendingReview,
    clientesComTrilha,
    workshopMap,
    stats,
    isLoading,
    refetch
  } = useDashboardSprints(workshops);

  const handleSprintClick = (sprint) => {
    // If sprint has a pending_review phase, open directly on it
    const pendingIdx = (sprint.phases || []).findIndex(p => p.status === "pending_review");
    setSelectedSprint(sprint);
    setSelectedPhaseIndex(pendingIdx >= 0 ? pendingIdx : 0);
  };

  if (isLoading) return <LoadingSkeleton />;

  const hasAnyData = stats.total > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-gray-900">Painel de Execução</h2>
            {stats.total > 0 && (
              <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                {stats.total} sprint{stats.total > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400 mt-0.5">O que precisa da sua atenção agora</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setShowCreateForm(true)}
            className="bg-orange-600 hover:bg-orange-700 gap-1.5 text-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Novo Sprint
          </Button>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 hover:border-gray-300 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Atualizar
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatPill icon={Activity} label="Total" value={stats.total} color="text-gray-700" bgColor="bg-gray-50" />
        <StatPill icon={Clock} label="Em andamento" value={stats.em_andamento} color="text-blue-600" bgColor="bg-blue-50/60" />
        <StatPill icon={Send} label="P/ Revisar" value={stats.pendingReview} color="text-amber-600" bgColor={stats.pendingReview > 0 ? "bg-amber-50/80" : "bg-gray-50"} />
        <StatPill icon={AlertTriangle} label="Atrasados" value={stats.atrasados} color="text-red-600" bgColor={stats.atrasados > 0 ? "bg-red-50/80" : "bg-gray-50"} />
        <StatPill icon={Check} label="Concluídos" value={stats.concluidos} color="text-green-600" bgColor="bg-green-50/60" />
      </div>

      {!hasAnyData ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl">
          <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-base font-semibold text-gray-400">Nenhum sprint encontrado</p>
          <p className="text-sm text-gray-400 mt-1">Crie trilhas e inicie sprints nos clientes</p>
        </div>
      ) : (
        <>
          {/* BLOCO 0 — Pendentes de Revisão (prioridade máxima) */}
          <SprintsPendingReviewBlock
            sprints={sprintsPendingReview}
            workshopMap={workshopMap}
            onSprintClick={(sprint) => handleSprintClick(sprint)}
          />

          {/* BLOCO 1 — Atrasados */}
          <SprintsAtrasadosBlock
            sprints={sprintsAtrasados}
            workshopMap={workshopMap}
            onSprintClick={handleSprintClick}
          />

          {/* BLOCO 2 + 3 — Execução + Clientes */}
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
        </>
      )}

      {/* Create Sprint Modal */}
      <SprintCreateForm
        open={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        workshops={workshops}
        user={user}
        onCreated={() => refetch()}
      />

      {/* Sprint Detail Modal */}
      {selectedSprint && (
        <SprintPhaseDetailModalRedesigned
          sprint={selectedSprint}
          phaseIndex={selectedPhaseIndex}
          onClose={() => {
            setSelectedSprint(null);
            setSelectedPhaseIndex(0);
            refetch();
          }}
          onSaved={() => {
            setSelectedSprint(null);
            setSelectedPhaseIndex(0);
            refetch();
          }}
          onNavigateToPhase={(idx) => setSelectedPhaseIndex(idx)}
        />
      )}
    </div>
  );
}