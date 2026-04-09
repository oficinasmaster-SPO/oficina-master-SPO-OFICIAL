import React, { useState, Suspense, lazy } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BarChart3, Calendar, FileText, ClipboardList, Users, Activity } from "lucide-react";
import RegistroAtendimentoMassaModal from "@/components/aceleracao/RegistroAtendimentoMassaModal";
import FiltrosControleAceleracao from "@/components/aceleracao/FiltrosControleAceleracao";
import RegistrarAtendimento from "@/pages/RegistrarAtendimento";
import WheelLoader from "@/components/ui/WheelLoader";

// Lazy tabs
const VisaoGeralTab = lazy(() => import("@/components/aceleracao/VisaoGeralTab"));
const PainelAtendimentosTab = lazy(() => import("@/components/aceleracao/PainelAtendimentosTab"));
const AgendaVisualTab = lazy(() => import("@/components/aceleracao/AgendaVisualTab"));
const CronogramaGeral = lazy(() => import("@/pages/CronogramaGeral"));
const PedidosInternosTab = lazy(() => import("@/components/aceleracao/PedidosInternosTab"));
const DashboardOperacionalTabRedesigned = lazy(() => import("@/components/aceleracao/DashboardOperacionalTabRedesigned"));

const TabFallback = () => (
  <div className="flex items-center justify-center py-16">
    <WheelLoader size="lg" />
  </div>
);

const TAB_TRIGGER_CLASS = "flex-shrink-0 data-[state=active]:bg-[#FF0000] data-[state=active]:text-white hover:bg-[#FF0000] hover:text-white transition-colors";

/**
 * View pura — sem lógica de negócio.
 * Recebe state (do container) + permissões RBAC validadas no backend.
 */
export default function ControleAceleracaoView({ state, permissions = {}, hasPermission, effectiveRole }) {
  const {
    user,
    activeTab, setActiveTab,
    isModalOpen, atendimentoId, openModal, closeModal,
    filtros, setFiltros, consultores
  } = state;

  // Helper local para check rápido
  const can = (perm) => hasPermission ? hasPermission(perm) : permissions[perm] === true;

  const [showMassRegistration, setShowMassRegistration] = useState(false);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Modal de atendimento (URL-driven) */}
      {isModalOpen && (
        <RegistrarAtendimento
          isModal={true}
          atendimentoId={atendimentoId}
          consultoresExternos={consultores}
          onClose={closeModal}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Controle da Aceleração</h1>
          <p className="text-gray-600 mt-2">Gestão completa de clientes, atendimentos e cronogramas</p>
        </div>
        <div className="flex gap-3">
          {can("aceleracao.mass_register") && (
            <Button
              onClick={() => setShowMassRegistration(true)}
              variant="outline"
              className="border-blue-600 text-blue-600 hover:bg-blue-50"
            >
              <Users className="w-4 h-4 mr-2" />
              Registro em Massa
            </Button>
          )}
          {can("aceleracao.create") && (
            <Button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-700">
              + Novo Atendimento
            </Button>
          )}
        </div>
      </div>

      <RegistroAtendimentoMassaModal
        open={showMassRegistration}
        onClose={() => setShowMassRegistration(false)}
        user={user}
      />

      {/* Filtros globais (ocultos na aba atendimentos que tem controles próprios) */}
      {activeTab !== "atendimentos" && (
        <FiltrosControleAceleracao
          consultores={consultores}
          filtros={filtros}
          onFiltrosChange={setFiltros}
        />
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex w-full justify-start overflow-x-auto bg-white shadow-md h-auto p-1 gap-1">
          <TabsTrigger value="visao-geral" className={TAB_TRIGGER_CLASS}>
            <BarChart3 className="w-4 h-4 mr-2" />Visão Geral
          </TabsTrigger>
          {can("aceleracao.atendimentos") && (
            <TabsTrigger value="atendimentos" className={TAB_TRIGGER_CLASS}>
              <ClipboardList className="w-4 h-4 mr-2" />Atendimentos
            </TabsTrigger>
          )}
          {can("aceleracao.cronograma") && (
            <TabsTrigger value="cronograma" className={TAB_TRIGGER_CLASS}>
              <Calendar className="w-4 h-4 mr-2" />Cronograma Geral
            </TabsTrigger>
          )}
          {can("aceleracao.pedidos") && (
            <TabsTrigger value="pedidos" className={TAB_TRIGGER_CLASS}>
              <FileText className="w-4 h-4 mr-2" />Pedidos & Backlog
            </TabsTrigger>
          )}
          {can("aceleracao.agenda") && (
            <TabsTrigger value="agenda-visual" className={TAB_TRIGGER_CLASS}>
              <Calendar className="w-4 h-4 mr-2" />Agenda Visual
            </TabsTrigger>
          )}
          {can("aceleracao.sprints") && (
            <TabsTrigger value="dashboard-operacional" className={TAB_TRIGGER_CLASS}>
              <Activity className="w-4 h-4 mr-2" />Dashboard Sprints
            </TabsTrigger>
          )}
        </TabsList>

        <Suspense fallback={<TabFallback />}>
          <TabsContent value="visao-geral">
            <VisaoGeralTab state={state} />
          </TabsContent>
          <TabsContent value="atendimentos">
            <PainelAtendimentosTab state={state} />
          </TabsContent>
          <TabsContent value="cronograma">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <CronogramaGeral isTab={true} />
            </div>
          </TabsContent>
          <TabsContent value="pedidos">
            <PedidosInternosTab user={user} />
          </TabsContent>
          <TabsContent value="agenda-visual">
            <AgendaVisualTab state={state} />
          </TabsContent>
          <TabsContent value="dashboard-operacional">
            <DashboardOperacionalTabRedesigned user={user} />
          </TabsContent>
        </Suspense>
      </Tabs>
    </div>
  );
}