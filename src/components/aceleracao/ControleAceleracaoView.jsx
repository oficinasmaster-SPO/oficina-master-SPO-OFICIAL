import React, { useState, Suspense, lazy, useMemo, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Calendar, CalendarRange, FileText, Users, Activity, Plus, Loader2, Lightbulb, List, Zap } from "lucide-react";
import RegistroAtendimentoMassaModal from "@/components/aceleracao/RegistroAtendimentoMassaModal";
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
const ConsultoriaGlobalTab = lazy(() => import("@/components/aceleracao/ConsultoriaGlobalTab"));


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

  const navigate = useNavigate();

  const handleTabChange = useCallback((newTab) => {
    if (newTab === "consultoria") {
      navigate("/ConsultoriaGlobal");
      return;
    }
    trackTabChange(prevTabRef.current, newTab);
    prevTabRef.current = newTab;
    markVisited(newTab);
    setActiveTab(newTab);
  }, [setActiveTab, trackTabChange, markVisited, navigate]);

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
        <div
          role="group"
          aria-label="Ações principais"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.7rem",
            padding: "0.525rem",
            borderRadius: "1.05rem",
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(12px)",
            border: "1px solid hsl(220 15% 82% / 0.6)",
            boxShadow: "0 8px 32px -6px hsl(220 30% 10% / 0.22), 0 2px 8px -2px hsl(220 30% 10% / 0.12)",
          }}
        >
          <style>{`
            @keyframes actionShine {
              0%       { transform: translateX(-120%); }
              60%, 100%{ transform: translateX(220%); }
            }
            .action-btn { position: relative; overflow: hidden; transition: all 300ms cubic-bezier(0.4,0,0.2,1); }
            .action-btn:hover { transform: translateY(-2px); }
            .action-btn:active { transform: translateY(0) scale(0.98); }
            .action-btn:focus-visible { outline: 2px solid hsl(222 89% 58%); outline-offset: 2px; }
            .action-btn::after {
              content: "";
              position: absolute; inset: 0;
              background: linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.45) 50%, transparent 70%);
              transform: translateX(-120%);
              pointer-events: none;
            }
            .action-btn:hover::after { animation: actionShine 1100ms cubic-bezier(0.2,0.8,0.2,1) forwards; }
            .action-btn-icon { transition: transform 300ms cubic-bezier(0.4,0,0.2,1); }
            .action-btn:hover .action-btn-icon { transform: scale(1.1); }
          `}</style>

          {/* Botão vermelho — Central de Follow-up */}
          <button
            onClick={() => navigate('/CentralFollowUp')}
            className="action-btn"
            style={{
              height: "2.45rem",
              padding: "0 1.225rem",
              borderRadius: "0.7rem",
              border: "none",
              background: "linear-gradient(135deg, hsl(0 88% 62%), hsl(0 78% 48%))",
              color: "#fff",
              fontSize: "0.7rem",
              fontWeight: 600,
              letterSpacing: "-0.01em",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.44rem",
              cursor: "pointer",
              boxShadow: "0 14px 28px -8px hsl(0 84% 50% / 0.55), 0 6px 12px -4px hsl(0 84% 50% / 0.35), inset 0 1px 0 hsl(0 0% 100% / 0.22)",
            }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = "0 22px 44px -10px hsl(0 84% 50% / 0.7), 0 10px 20px -6px hsl(0 84% 50% / 0.45), inset 0 1px 0 hsl(0 0% 100% / 0.30)"}
            onMouseLeave={e => e.currentTarget.style.boxShadow = "0 14px 28px -8px hsl(0 84% 50% / 0.55), 0 6px 12px -4px hsl(0 84% 50% / 0.35), inset 0 1px 0 hsl(0 0% 100% / 0.22)"}
          >
            <Zap className="action-btn-icon" size={14} strokeWidth={2.5} />
            Central de Follow-up
          </button>

          {/* Botão outline — Registro em Massa */}
          <button
            onClick={handleOpenMassRegistration}
            className="action-btn"
            style={{
              height: "2.45rem",
              padding: "0 1.225rem",
              borderRadius: "0.7rem",
              border: "1px solid hsl(214 32% 91%)",
              background: "#fff",
              color: "hsl(222 47% 18%)",
              fontSize: "0.7rem",
              fontWeight: 600,
              letterSpacing: "-0.01em",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.44rem",
              cursor: "pointer",
              boxShadow: "0 10px 22px -8px hsl(222 47% 30% / 0.28), 0 4px 8px -2px hsl(222 47% 30% / 0.14)",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = "hsl(222 89% 58%)";
              e.currentTarget.style.borderColor = "hsl(222 89% 58% / 0.5)";
              e.currentTarget.style.boxShadow = "0 18px 32px -10px hsl(222 89% 40% / 0.4), 0 6px 14px -4px hsl(222 89% 40% / 0.25)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = "hsl(222 47% 18%)";
              e.currentTarget.style.borderColor = "hsl(214 32% 91%)";
              e.currentTarget.style.boxShadow = "0 10px 22px -8px hsl(222 47% 30% / 0.28), 0 4px 8px -2px hsl(222 47% 30% / 0.14)";
            }}
          >
            <Users className="action-btn-icon" size={14} strokeWidth={2.25} />
            Registro em Massa
          </button>

          {/* Botão azul — Novo Atendimento */}
          <button
            onClick={() => handleOpenModal()}
            className="action-btn"
            style={{
              height: "2.45rem",
              padding: "0 1.225rem",
              borderRadius: "0.7rem",
              border: "none",
              background: "linear-gradient(135deg, hsl(222 92% 62%), hsl(224 84% 46%))",
              color: "#fff",
              fontSize: "0.7rem",
              fontWeight: 600,
              letterSpacing: "-0.01em",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.44rem",
              cursor: "pointer",
              boxShadow: "0 14px 28px -8px hsl(222 89% 50% / 0.55), 0 6px 12px -4px hsl(222 89% 50% / 0.35), inset 0 1px 0 hsl(0 0% 100% / 0.22)",
            }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = "0 22px 44px -10px hsl(222 89% 50% / 0.7), 0 10px 20px -6px hsl(222 89% 50% / 0.45), inset 0 1px 0 hsl(0 0% 100% / 0.30)"}
            onMouseLeave={e => e.currentTarget.style.boxShadow = "0 14px 28px -8px hsl(222 89% 50% / 0.55), 0 6px 12px -4px hsl(222 89% 50% / 0.35), inset 0 1px 0 hsl(0 0% 100% / 0.22)"}
          >
            <Plus className="action-btn-icon" size={14} strokeWidth={2.75} />
            Novo Atendimento
          </button>
        </div>
      </div>

      <RegistroAtendimentoMassaModal
        open={showMassRegistration}
        onClose={() => setShowMassRegistration(false)}
        user={user}
      />

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
              <List className="w-4 h-4" />
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
        <>
          <TabsContent value="visao-geral" forceMount className={`mt-0 ${activeTab !== "visao-geral" ? "hidden" : ""}`}>
            {visitedTabs.has("visao-geral") && (
              <TabErrorBoundary tabName="Visão Geral">
                <Suspense fallback={<TabSkeleton variant="overview" />}>
                  {loadingAtendimentos ? <TabSkeleton variant="overview" /> : <VisaoGeralTab state={state} />}
                </Suspense>
              </TabErrorBoundary>
            )}
          </TabsContent>

          <TabsContent value="atendimentos" forceMount className={`mt-0 ${activeTab !== "atendimentos" ? "hidden" : ""}`}>
            {visitedTabs.has("atendimentos") && (
              <TabErrorBoundary tabName="Atendimentos">
                <Suspense fallback={<TabSkeleton variant="table" />}>
                  {loadingAtendimentos ? <TabSkeleton variant="table" /> : <PainelAtendimentosTab state={state} />}
                </Suspense>
              </TabErrorBoundary>
            )}
          </TabsContent>

          <TabsContent value="cronograma" forceMount className={`mt-0 ${activeTab !== "cronograma" ? "hidden" : ""}`}>
            {visitedTabs.has("cronograma") && (
              <TabErrorBoundary tabName="Cronograma">
                <Suspense fallback={<TabSkeleton variant="table" />}>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <CronogramaGeral isTab={true} />
                  </div>
                </Suspense>
              </TabErrorBoundary>
            )}
          </TabsContent>

          <TabsContent value="pedidos" forceMount className={`mt-0 ${activeTab !== "pedidos" ? "hidden" : ""}`}>
            {visitedTabs.has("pedidos") && (
              <TabErrorBoundary tabName="Pedidos & Backlog">
                <Suspense fallback={<TabSkeleton />}>
                  <PedidosInternosTab user={user} />
                </Suspense>
              </TabErrorBoundary>
            )}
          </TabsContent>

          <TabsContent value="agenda-visual" forceMount className={`mt-0 ${activeTab !== "agenda-visual" ? "hidden" : ""}`}>
            {visitedTabs.has("agenda-visual") && (
              <TabErrorBoundary tabName="Agenda Visual">
                <Suspense fallback={<TabSkeleton variant="overview" />}>
                  <AgendaVisualTab state={state} />
                </Suspense>
              </TabErrorBoundary>
            )}
          </TabsContent>

          <TabsContent value="dashboard-operacional" forceMount className={`mt-0 ${activeTab !== "dashboard-operacional" ? "hidden" : ""}`}>
            {visitedTabs.has("dashboard-operacional") && (
              <TabErrorBoundary tabName="Dashboard Sprints">
                <Suspense fallback={<TabSkeleton variant="overview" />}>
                  <DashboardOperacionalTabRedesigned user={user} workshops={workshops} />
                </Suspense>
              </TabErrorBoundary>
            )}
          </TabsContent>

          <TabsContent value="consultoria" forceMount className={`mt-0 ${activeTab !== "consultoria" ? "hidden" : ""}`}>
            <TabErrorBoundary tabName="Consultoria Global">
              <Suspense fallback={<TabSkeleton variant="overview" />}>
                <ConsultoriaGlobalTab />
              </Suspense>
            </TabErrorBoundary>
          </TabsContent>
        </>
      </Tabs>
    </div>
  );
}