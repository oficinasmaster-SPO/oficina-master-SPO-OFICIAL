import React, { useState, Suspense, lazy } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, BarChart3, Calendar, FileText, ClipboardList, Users, Activity } from "lucide-react";
import RegistroAtendimentoMassaModal from "@/components/aceleracao/RegistroAtendimentoMassaModal";
import FiltrosControleAceleracao from "@/components/aceleracao/FiltrosControleAceleracao";
import RegistrarAtendimento from "./RegistrarAtendimento";
import useControleAceleracaoState from "@/components/hooks/useControleAceleracaoState";
import WheelLoader from "@/components/ui/WheelLoader";

// Lazy-load heavy tabs — only loaded when user clicks them
const VisaoGeralTab = lazy(() => import("@/components/aceleracao/VisaoGeralTab"));
const PainelAtendimentosTab = lazy(() => import("@/components/aceleracao/PainelAtendimentosTab"));
const AgendaVisualTab = lazy(() => import("@/components/aceleracao/AgendaVisualTab"));
const CronogramaGeral = lazy(() => import("./CronogramaGeral"));
const PedidosInternosTab = lazy(() => import("@/components/aceleracao/PedidosInternosTab"));
const DashboardOperacionalTabRedesigned = lazy(() => import("@/components/aceleracao/DashboardOperacionalTabRedesigned"));

const TabFallback = () => (
  <div className="flex items-center justify-center py-16">
    <WheelLoader size="lg" />
  </div>
);

export default function ControleAceleracao() {
  const [showMassRegistration, setShowMassRegistration] = useState(false);

  const state = useControleAceleracaoState();
  const {
    user, loadingUser,
    activeTab, setActiveTab,
    isModalOpen, atendimentoId, openModal, closeModal,
    filtros, setFiltros, consultores
  } = state;

  if (loadingUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user || (user.role !== 'admin' && user.job_role !== 'acelerador')) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Acesso Restrito</h2>
          <p className="text-gray-600">Esta área é restrita a consultores e aceleradores.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {isModalOpen && (
        <RegistrarAtendimento 
          isModal={true}
          atendimentoId={atendimentoId}
          consultoresExternos={consultores}
          onClose={closeModal}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Controle da Aceleração</h1>
          <p className="text-gray-600 mt-2">Gestão completa de clientes, atendimentos e cronogramas</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setShowMassRegistration(true)}
            variant="outline"
            className="border-blue-600 text-blue-600 hover:bg-blue-50"
          >
            <Users className="w-4 h-4 mr-2" />
            Registro em Massa
          </Button>
          <Button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-700">
            + Novo Atendimento
          </Button>
        </div>
      </div>

      <RegistroAtendimentoMassaModal
        open={showMassRegistration}
        onClose={() => setShowMassRegistration(false)}
        user={user}
      />

      {activeTab !== 'atendimentos' && (
        <FiltrosControleAceleracao
          consultores={consultores}
          filtros={filtros}
          onFiltrosChange={setFiltros}
        />
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex w-full justify-start overflow-x-auto bg-white shadow-md h-auto p-1 gap-1">
          <TabsTrigger value="visao-geral" className="flex-shrink-0 data-[state=active]:bg-[#FF0000] data-[state=active]:text-white hover:bg-[#FF0000] hover:text-white transition-colors">
            <BarChart3 className="w-4 h-4 mr-2" />Visão Geral
          </TabsTrigger>
          <TabsTrigger value="atendimentos" className="flex-shrink-0 data-[state=active]:bg-[#FF0000] data-[state=active]:text-white hover:bg-[#FF0000] hover:text-white transition-colors">
            <ClipboardList className="w-4 h-4 mr-2" />Atendimentos
          </TabsTrigger>
          <TabsTrigger value="cronograma" className="flex-shrink-0 data-[state=active]:bg-[#FF0000] data-[state=active]:text-white hover:bg-[#FF0000] hover:text-white transition-colors">
            <Calendar className="w-4 h-4 mr-2" />Cronograma Geral
          </TabsTrigger>
          <TabsTrigger value="pedidos" className="flex-shrink-0 data-[state=active]:bg-[#FF0000] data-[state=active]:text-white hover:bg-[#FF0000] hover:text-white transition-colors">
            <FileText className="w-4 h-4 mr-2" />Pedidos & Backlog
          </TabsTrigger>
          <TabsTrigger value="agenda-visual" className="flex-shrink-0 data-[state=active]:bg-[#FF0000] data-[state=active]:text-white hover:bg-[#FF0000] hover:text-white transition-colors">
            <Calendar className="w-4 h-4 mr-2" />Agenda Visual
          </TabsTrigger>
          <TabsTrigger value="dashboard-operacional" className="flex-shrink-0 data-[state=active]:bg-[#FF0000] data-[state=active]:text-white hover:bg-[#FF0000] hover:text-white transition-colors">
            <Activity className="w-4 h-4 mr-2" />Dashboard Sprints
          </TabsTrigger>
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