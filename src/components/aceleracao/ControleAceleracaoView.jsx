import React, { useState, Suspense, lazy, useMemo, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Calendar, CalendarRange, FileText, ClipboardList, Users, Activity, Plus, Loader2, Lightbulb } from "lucide-react";
import RegistroAtendimentoMassaModal from "@/components/aceleracao/RegistroAtendimentoMassaModal";
import FiltrosControleAceleracao from "@/components/aceleracao/FiltrosControleAceleracao";
import ActiveFiltersBar from "@/components/aceleracao/ActiveFiltersBar";
import TabSkeleton from "@/components/aceleracao/TabSkeleton";
import TabErrorBoundary from "@/components/aceleracao/TabErrorBoundary";
import RegistrarAtendimento from "@/pages/RegistrarAtendimento";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { useAceleracaoObservability } from "@/components/hooks/useAceleracaoObservability";

// Lazy tabs
const VisaoGeralTab = lazy(() => import("@/components/aceleracao/VisaoGeralTab"));
const PainelAtendimentosTab = lazy(() => import("@/components/aceleracao/PainelAtendimentosTab"));
const AgendaVisualTab = lazy(() => import("@/components/aceleracao/AgendaVisualTab"));
const CronogramaGeral = lazy(() => import("@/pages/CronogramaGeral"));
const PedidosInternosTab = lazy(() => import("@/components/aceleracao/PedidosInternosTab"));
const DashboardOperacionalTabRedesigned = lazy(() => import("@/components/aceleracao/DashboardOperacionalTabRedesigned"));

const TAB_BASE = "flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200";
const TAB_ACTIVE = "data-[state=active]:bg-[#FF0000] data-[state=active]:text-white data-[state=active]:shadow-md";
const TAB_HOVER = "hover:bg-gray-100 data-[state=active]:hover:bg-[#FF0000]";
const TAB_CLASS = `${TAB_BASE} ${TAB_ACTIVE} ${TAB_HOVER}`;

function TabBadge({ count, active }) {
  if (count === undefined || count === null) return null;
  return (
    <span className={`
      ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none
      ${active 
        ? "bg-white/25 text-white" 
        : "bg-gray-200 text-gray-600"}
    `}>
      {count > 999 ? "999+" : count}
    </span>
  );
}

/**
 * View pura — sem lógica de negócio.
 * UX: skeleton loaders, filtros ativos visíveis, contadores nas tabs, feedback visual.
 */
export default function ControleAceleracaoView({ state }) {
  const {
    user,
    activeTab, setActiveTab,
    isModalOpen, atendimentoId, openModal, closeModal,
    filtros, setFiltros, consultores,
    workshops, atendimentos, atendimentosPeriodo, loadingAtendimentos
  } = state;

  const [showMassRegistration, setShowMassRegistration] = useState(false);

  // Track visited tabs — lazy-mount on first visit, keep mounted after
  const [visitedTabs, setVisitedTabs] = useState(() => new Set([activeTab]));
  const markVisited = useCallback((tab) => {
    setVisitedTabs(prev => prev.has(tab) ? prev : new Set(prev).add(tab));
  }, []);

  // Observability
  const { trackTabChange, trackFilterChange, trackAtendimentoOpen, trackMassRegistrationOpen } = useAceleracaoObservability(user);
  const prevTabRef = useRef(activeTab);

  const handleTabChange = useCallback((newTab) => {
    trackTabChange(prevTabRef.current, newTab);
    prevTabRef.current = newTab;
    markVisited(newTab);
    setActiveTab(newTab);
  }, [setActiveTab, trackTabChange, markVisited]);

  const queryClient = useQueryClient();

  const handleCloseModal = useCallback(() => {
    closeModal();
    // Refresh attendance list to reflect any changes made in the modal (auto-save, etc.)
    // Invalida com prefixo para cobrir todas as variações da chave
    queryClient.invalidateQueries({ queryKey: ['atendimentos-acelerador'] });
    queryClient.invalidateQueries({ queryKey: ['consultoria-atendimentos'] });
    queryClient.invalidateQueries({ queryKey: ['meeting-minutes'] });
  }, [closeModal, queryClient]);

  const handleOpenModal = useCallback((id) => {
    trackAtendimentoOpen(id);
    openModal(id);
  }, [openModal, trackAtendimentoOpen]);

  const handleOpenMassRegistration = useCallback(() => {
    trackMassRegistrationOpen();
    setShowMassRegistration(true);
  }, [trackMassRegistrationOpen]);

  const handleFiltrosChange = useCallback((newFiltros) => {
    trackFilterChange(newFiltros);
    setFiltros(newFiltros);
  }, [setFiltros, trackFilterChange]);

  // Tab counts
  const counts = useMemo(() => {
    const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    const atrasados = (atendimentosPeriodo || []).filter(a => {
      if (a.status === 'realizado' || a.status === 'concluido') return false;
      const d = new Date(a.data_agendada).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
      return d < hoje;
    }).length;
    return {
      atendimentos: atendimentosPeriodo?.length || 0,
      atrasados,
    };
  }, [atendimentosPeriodo]);

  // Check if any filter is active (non-default)
  const hasActiveFilters =
    (filtros.consultorId && filtros.consultorId !== "todos") ||
    (filtros.preset && filtros.preset !== "mes_atual");

  const handleClearFilter = useCallback((filterKey) => {
    const hoje = new Date();
    if (filterKey === "consultorId") {
      setFiltros({ ...filtros, consultorId: "todos" });
    } else if (filterKey === "preset") {
      setFiltros({
        ...filtros,
        preset: "mes_atual",
        dataInicio: format(startOfMonth(hoje), "yyyy-MM-dd"),
        dataFim: format(endOfMonth(hoje), "yyyy-MM-dd"),
      });
    }
  }, [filtros, setFiltros]);

  const handleClearAllFilters = useCallback(() => {
    const hoje = new Date();
    setFiltros({
      consultorId: "todos",
      preset: "mes_atual",
      dataInicio: format(startOfMonth(hoje), "yyyy-MM-dd"),
      dataFim: format(endOfMonth(hoje), "yyyy-MM-dd"),
    });
  }, [setFiltros]);

  return (
    <div className="w-full space-y-5">
      {/* Modal */}
      {isModalOpen && (
        <RegistrarAtendimento
          isModal={true}
          atendimentoId={atendimentoId}
          consultoresExternos={consultores}
          onClose={handleCloseModal}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Controle da Aceleração</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Gestão de clientes, atendimentos e cronogramas
            {loadingAtendimentos && (
              <span className="inline-flex items-center gap-1 ml-2 text-blue-600">
                <Loader2 className="w-3 h-3 animate-spin" />
                Atualizando...
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleOpenMassRegistration}
            variant="outline"
            size="sm"
            className="border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300"
          >
            <Users className="w-4 h-4 mr-1.5" />
            Registro em Massa
          </Button>
          <Button
            onClick={() => handleOpenModal()}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Novo Atendimento
          </Button>
        </div>
      </div>

      <RegistroAtendimentoMassaModal
        open={showMassRegistration}
        onClose={() => setShowMassRegistration(false)}
        user={user}
      />

      {/* Filtros — hidden on all current tabs */}
      <div className="hidden">
        <FiltrosControleAceleracao
          consultores={consultores}
          filtros={filtros}
          onFiltrosChange={handleFiltrosChange}
        />
      </div>

      {/* Active Filters Bar — sempre visível quando há filtros */}
      {hasActiveFilters && (
        <ActiveFiltersBar
          filtros={filtros}
          consultores={consultores}
          onClearFilter={handleClearFilter}
          onClearAll={handleClearAllFilters}
        />
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-5">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1.5">
          <TabsList className="flex w-full justify-start overflow-x-auto bg-transparent h-auto gap-1 scrollbar-hide">
            <TabsTrigger value="visao-geral" className={TAB_CLASS}>
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Visão Geral</span>
              <span className="sm:hidden">Geral</span>
              {counts.atrasados > 0 && <TabBadge count={counts.atrasados} active={activeTab === "visao-geral"} />}
            </TabsTrigger>
            <TabsTrigger value="atendimentos" className={TAB_CLASS}>
              <ClipboardList className="w-4 h-4" />
              <span className="hidden sm:inline">Atendimentos</span>
              <span className="sm:hidden">Atend.</span>
              <TabBadge count={counts.atendimentos} active={activeTab === "atendimentos"} />
            </TabsTrigger>
            <TabsTrigger value="cronograma" className={TAB_CLASS}>
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Cronograma Geral</span>
              <span className="sm:hidden">Crono.</span>
            </TabsTrigger>
            <TabsTrigger value="pedidos" className={TAB_CLASS}>
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Pedidos & Backlog</span>
              <span className="sm:hidden">Pedidos</span>
            </TabsTrigger>
            <TabsTrigger value="agenda-visual" className={TAB_CLASS}>
              <CalendarRange className="w-4 h-4" />
              <span className="hidden sm:inline">Agenda Visual</span>
              <span className="sm:hidden">Agenda</span>
            </TabsTrigger>
            <TabsTrigger value="dashboard-operacional" className={TAB_CLASS}>
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard Sprints</span>
              <span className="sm:hidden">Sprints</span>
            </TabsTrigger>
            <TabsTrigger value="consultoria" className={TAB_CLASS}>
              <Lightbulb className="w-4 h-4" />
              <span className="hidden sm:inline">Consultoria</span>
              <span className="sm:hidden">Cons.</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Content — forceMount + hidden on all tabs; lazy-mount on first visit */}
        <Suspense fallback={<TabSkeleton variant="overview" />}>
          <TabsContent value="visao-geral" forceMount className={`mt-0 ${activeTab !== "visao-geral" ? "hidden" : ""}`}>
            <TabErrorBoundary tabName="Visão Geral">
              {loadingAtendimentos ? (
                <TabSkeleton variant="overview" />
              ) : (
                <VisaoGeralTab state={state} />
              )}
            </TabErrorBoundary>
          </TabsContent>

          <TabsContent value="atendimentos" forceMount className={`mt-0 ${activeTab !== "atendimentos" ? "hidden" : ""}`}>
            <TabErrorBoundary tabName="Atendimentos">
              {loadingAtendimentos ? (
                <TabSkeleton variant="table" />
              ) : (
                <PainelAtendimentosTab state={state} />
              )}
            </TabErrorBoundary>
          </TabsContent>

          <TabsContent value="cronograma" forceMount className={`mt-0 ${activeTab !== "cronograma" ? "hidden" : ""}`}>
            {visitedTabs.has("cronograma") && (
              <TabErrorBoundary tabName="Cronograma">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <CronogramaGeral isTab={true} />
                </div>
              </TabErrorBoundary>
            )}
          </TabsContent>

          <TabsContent value="pedidos" forceMount className={`mt-0 ${activeTab !== "pedidos" ? "hidden" : ""}`}>
            {visitedTabs.has("pedidos") && (
              <TabErrorBoundary tabName="Pedidos & Backlog">
                <PedidosInternosTab user={user} />
              </TabErrorBoundary>
            )}
          </TabsContent>

          <TabsContent value="agenda-visual" forceMount className={`mt-0 ${activeTab !== "agenda-visual" ? "hidden" : ""}`}>
            {visitedTabs.has("agenda-visual") && (
              <TabErrorBoundary tabName="Agenda Visual">
                <AgendaVisualTab state={state} />
              </TabErrorBoundary>
            )}
          </TabsContent>

          <TabsContent value="dashboard-operacional" forceMount className={`mt-0 ${activeTab !== "dashboard-operacional" ? "hidden" : ""}`}>
            <TabErrorBoundary tabName="Dashboard Sprints">
              <DashboardOperacionalTabRedesigned user={user} workshops={workshops} />
            </TabErrorBoundary>
          </TabsContent>

          <TabsContent value="consultoria" forceMount className={`mt-0 ${activeTab !== "consultoria" ? "hidden" : ""}`}>
            {visitedTabs.has("consultoria") && (
              <TabErrorBoundary tabName="Consultoria Global">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <VisaoGeralTab state={state} mode="global" />
                </div>
              </TabErrorBoundary>
            )}
          </TabsContent>
        </Suspense>
      </Tabs>
    </div>
  );
}