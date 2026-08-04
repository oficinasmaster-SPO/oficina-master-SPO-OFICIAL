import React, { useState, useMemo, useCallback, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Search, ChevronDown, ChevronRight,
  Clock, Play, CheckCircle2, Lock, LayoutList,
  SlidersHorizontal, X,
} from "lucide-react";
import Combobox from "@/components/ui/combobox";
import BacklogIssueRow from "./BacklogIssueRow";
import BacklogDetailDrawer from "./BacklogDetailDrawer";
import NovoTarefaModal from "./NovoTarefaModal";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import TarefaBacklogForm from "./TarefaBacklogForm";
import useEmployeeResolver from "@/hooks/useEmployeeResolver";
import { useWorkshopLogos } from "@/hooks/useWorkshopLogos";
import {
  TAREFA_STATUS_CONFIG,
  PRIORIDADE_OPTIONS,
  ORIGIN_OPTIONS,
} from "@/components/shared/backlogConstants";

// ── Grupos de status (ordem do board) ─────────────────────────────────────
const STATUS_GROUPS = [
  {
    key: "em_execucao",
    label: "Em Execução",
    icon: Play,
    iconClass: "text-blue-500",
    headerClass: "bg-blue-50 border-blue-200",
    badgeClass: "bg-blue-500",
  },
  {
    key: "aberta",
    label: "To Do",
    icon: LayoutList,
    iconClass: "text-gray-500",
    headerClass: "bg-gray-50 border-gray-200",
    badgeClass: "bg-gray-500",
  },
  {
    key: "aguardando_cliente",
    label: "Aguardando Cliente",
    icon: Clock,
    iconClass: "text-amber-500",
    headerClass: "bg-amber-50 border-amber-200",
    badgeClass: "bg-amber-500",
  },
  {
    key: "bloqueada",
    label: "Bloqueada",
    icon: Lock,
    iconClass: "text-red-500",
    headerClass: "bg-red-50 border-red-200",
    badgeClass: "bg-red-500",
  },
  {
    key: "concluida",
    label: "Concluída",
    icon: CheckCircle2,
    iconClass: "text-green-500",
    headerClass: "bg-green-50 border-green-200",
    badgeClass: "bg-green-500",
  },
];

// ── Cabeçalho de grupo colapsável ───────────────────────────────────────────
function GroupHeader({ group, count, collapsed, onToggle }) {
  const Icon = group.icon;
  return (
    <button
      onClick={onToggle}
      className={`flex w-full items-center gap-2 border-y px-3 py-2 text-left transition-colors hover:brightness-95 ${group.headerClass}`}
    >
      {collapsed
        ? <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />
        : <ChevronDown  className="h-3.5 w-3.5 text-gray-400 shrink-0" />}
      <Icon className={`h-3.5 w-3.5 shrink-0 ${group.iconClass}`} />
      <span className="text-xs font-semibold text-gray-700">{group.label}</span>
      <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white ${group.badgeClass}`}>
        {count}
      </span>
    </button>
  );
}

// ── KPI compacto ────────────────────────────────────────────────────────────
function KpiChip({ label, value, className = "" }) {
  return (
    <div className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 ${className}`}>
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm font-bold text-gray-900">{value}</span>
    </div>
  );
}

// ── Componente principal ────────────────────────────────────────────────────
export default function BacklogBoard({ workshopId, user }) {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  // Painel: null | 'detail' | 'form'
  const [panelMode, setPanelMode] = useState(null);
  const [selectedTarefa, setSelectedTarefa] = useState(null);
  const [editingTarefa, setEditingTarefa] = useState(null);
  const [showNovoTarefaModal, setShowNovoTarefaModal] = useState(false);

  // Filtros inline
  const [search, setSearch]             = useState("");
  const [filterConsultor, setFilterConsultor] = useState("all");
  const [filterCliente, setFilterCliente]     = useState("all");
  const [filterPrioridade, setFilterPrioridade] = useState("all");
  const [filterOrigem, setFilterOrigem]       = useState("all");
  const [showFilters, setShowFilters]   = useState(false);

  // Grupos colapsados
  const [collapsed, setCollapsed] = useState({ concluida: true });
  const toggleGroup = useCallback(
    (key) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] })),
    []
  );

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: tarefas = [], isLoading } = useQuery({
    queryKey: ["tarefas-backlog", workshopId],
    queryFn: async () => {
      const all = workshopId
        ? await base44.entities.TarefaBacklog.filter({ workshop_id: workshopId }, "-prazo", 300)
        : await base44.entities.TarefaBacklog.list("-prazo", 300);
      return all || [];
    },
  });

  const { data: workshops = [] } = useQuery({
    queryKey: ["workshops-backlog"],
    queryFn: async () => (await base44.entities.Workshop.list("name", 200)) || [],
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TarefaBacklog.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tarefas-backlog"] }),
  });

  // ── Resolvers canônicos (nomes/fotos/logos) ──────────────────────────────
  const { getName, getPhoto } = useEmployeeResolver();
  const workshopIds = useMemo(
    () => [...new Set(tarefas.map((t) => t.workshop_id).filter(Boolean))],
    [tarefas]
  );
  const logosByWorkshop = useWorkshopLogos(workshopIds);

  // ── Listas derivadas ──────────────────────────────────────────────────────
  const consultoresUnicos = useMemo(
    () => [...new Set(tarefas.map((t) => getName(t.assignee_id, t.assignee_name)).filter(Boolean))].sort(),
    [tarefas, getName]
  );
  const clientesUnicos = useMemo(
    () => [...new Set(tarefas.map((t) => t.workshop_nome).filter(Boolean))].sort(),
    [tarefas]
  );

  const hoje = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  }, []);

  const ativos = useMemo(() => tarefas.filter((t) => t.status !== "concluida"), [tarefas]);

  const filteredAll = useMemo(() => {
    return tarefas.filter((t) => {
      const resolvedName = getName(t.assignee_id, t.assignee_name);
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        t.titulo?.toLowerCase().includes(q) ||
        t.workshop_nome?.toLowerCase().includes(q) ||
        resolvedName?.toLowerCase().includes(q) ||
        t.assignee_name?.toLowerCase().includes(q);
      const matchConsultor  = filterConsultor  === "all" || resolvedName === filterConsultor;
      const matchCliente    = filterCliente    === "all" || t.workshop_nome   === filterCliente;
      const matchPrioridade = filterPrioridade === "all" || t.prioridade      === filterPrioridade;
      const matchOrigem     = filterOrigem     === "all" || t.origin_type     === filterOrigem;
      return matchSearch && matchConsultor && matchCliente && matchPrioridade && matchOrigem;
    });
  }, [tarefas, search, filterConsultor, filterCliente, filterPrioridade, filterOrigem, getName]);

  // Agrupar por status
  const grouped = useMemo(() => {
    const map = {};
    STATUS_GROUPS.forEach((g) => { map[g.key] = []; });
    filteredAll.forEach((t) => {
      if (map[t.status]) map[t.status].push(t);
    });
    // ordenar cada grupo: vencidas primeiro, depois por prazo
    Object.keys(map).forEach((key) => {
      map[key].sort((a, b) => {
        const vA = a.prazo && new Date(a.prazo) < hoje ? 0 : 1;
        const vB = b.prazo && new Date(b.prazo) < hoje ? 0 : 1;
        if (vA !== vB) return vA - vB;
        if (a.prazo && b.prazo) return new Date(a.prazo) - new Date(b.prazo);
        return 0;
      });
    });
    return map;
  }, [filteredAll, hoje]);

  // KPIs
  const kpis = useMemo(() => ({
    total:    ativos.length,
    criticas: ativos.filter((t) => t.prioridade === "critica").length,
    vencidas: ativos.filter((t) => t.prazo && new Date(t.prazo) < hoje).length,
    aguardando: ativos.filter((t) => t.status === "aguardando_cliente").length,
  }), [ativos, hoje]);

  const hasFilters = search || filterConsultor !== "all" || filterCliente !== "all" || filterPrioridade !== "all" || filterOrigem !== "all";

  const clearFilters = () => {
    setSearch(""); setFilterConsultor("all"); setFilterCliente("all");
    setFilterPrioridade("all"); setFilterOrigem("all");
  };

  // Linha cheia (colunas Cliente/Consultor/Abertura) só em desktop sem painel aberto
  const fullRow = !isMobile && panelMode === null;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleView = useCallback((tarefa) => {
    setSelectedTarefa(tarefa);
    setPanelMode("detail");
  }, []);
  const handleNew = useCallback(() => {
    setEditingTarefa(null);
    setShowNovoTarefaModal(true);
  }, []);
  const handleEdit = useCallback((tarefa) => {
    setEditingTarefa(tarefa);
    setPanelMode("form");
  }, []);
  const handlePanelClose = useCallback(() => {
    setSelectedTarefa(null);
    setEditingTarefa(null);
    setPanelMode(null);
  }, []);
  const handleFormCancel = useCallback(() => {
    if (editingTarefa) {
      setSelectedTarefa(editingTarefa);
      setPanelMode("detail");
    } else {
      setPanelMode(null);
      setSelectedTarefa(null);
    }
  }, [editingTarefa]);
  const handleFormSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["tarefas-backlog"] });
    if (editingTarefa) {
      setSelectedTarefa(editingTarefa);
      setPanelMode("detail");
    } else {
      setPanelMode(null);
      setSelectedTarefa(null);
    }
    setEditingTarefa(null);
  }, [queryClient, editingTarefa]);

  // Sincroniza o selectedTarefa com dados frescos após mutação
  const freshSelected = useMemo(() => {
    if (!selectedTarefa) return null;
    return tarefas.find((t) => t.id === selectedTarefa.id) || selectedTarefa;
  }, [selectedTarefa, tarefas]);

  // ── Navegação por teclado ─────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") { handlePanelClose(); return; }
      if (panelMode !== "detail" || !selectedTarefa) return;
      const idx = filteredAll.findIndex((t) => t.id === selectedTarefa.id);
      if (e.key === "ArrowDown" && idx < filteredAll.length - 1) handleView(filteredAll[idx + 1]);
      if (e.key === "ArrowUp" && idx > 0) handleView(filteredAll[idx - 1]);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [selectedTarefa, filteredAll, panelMode, handleView, handlePanelClose]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">

      {/* ── Toolbar ── */}
      <div className="shrink-0 border-b border-gray-200 bg-white px-4 py-3 space-y-2">
        {/* Linha 1: busca + filtros + botão */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar tarefas..."
              className="h-8 pl-8 text-sm"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            className={`h-8 gap-1.5 text-xs ${showFilters ? "bg-blue-50 border-blue-300 text-blue-700" : ""}`}
            onClick={() => setShowFilters((v) => !v)}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filtros
            {hasFilters && (
              <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[9px] font-bold text-white">
                •
              </span>
            )}
          </Button>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 gap-1 text-xs text-gray-500">
              <X className="h-3 w-3" /> Limpar
            </Button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-gray-400">{filteredAll.length} tarefas</span>
            <Button
              size="sm"
              onClick={handleNew}
              className="h-8 gap-1.5 bg-blue-600 hover:bg-blue-700 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              Nova tarefa
            </Button>
          </div>
        </div>

        {/* Linha 2: filtros expandidos */}
        {showFilters && (
          <div className="flex flex-wrap gap-2">
            <div className="w-[170px]">
              <Combobox
                value={filterConsultor}
                onChange={setFilterConsultor}
                options={[{ value: "all", label: "Todos consultores" }, ...consultoresUnicos.map((c) => ({ value: c, label: c }))]}
                clearValue="all"
                placeholder="Consultor"
                searchPlaceholder="Pesquisar consultor..."
                emptyText="Nenhum consultor."
              />
            </div>
            <div className="w-[170px]">
              <Combobox
                value={filterCliente}
                onChange={setFilterCliente}
                options={[{ value: "all", label: "Todos clientes" }, ...clientesUnicos.map((c) => ({ value: c, label: c }))]}
                clearValue="all"
                placeholder="Cliente"
                searchPlaceholder="Pesquisar cliente..."
                emptyText="Nenhum cliente."
              />
            </div>
            <div className="w-[150px]">
              <Combobox
                value={filterPrioridade}
                onChange={setFilterPrioridade}
                options={[{ value: "all", label: "Toda prioridade" }, ...PRIORIDADE_OPTIONS]}
                clearValue="all"
                placeholder="Prioridade"
                searchPlaceholder="Pesquisar prioridade..."
                emptyText="Nenhuma prioridade."
              />
            </div>
            <div className="w-[160px]">
              <Combobox
                value={filterOrigem}
                onChange={setFilterOrigem}
                options={[{ value: "all", label: "Toda origem" }, ...ORIGIN_OPTIONS]}
                clearValue="all"
                placeholder="Origem"
                searchPlaceholder="Pesquisar origem..."
                emptyText="Nenhuma origem."
              />
            </div>
          </div>
        )}

        {/* Linha 3: KPIs compactos */}
        <div className="flex flex-wrap gap-2">
          <KpiChip label="Ativos" value={kpis.total} className="border-gray-200" />
          {kpis.criticas > 0 && (
            <KpiChip label="Críticas" value={kpis.criticas} className="border-red-200 bg-red-50" />
          )}
          {kpis.vencidas > 0 && (
            <KpiChip label="Vencidas" value={kpis.vencidas} className="border-amber-200 bg-amber-50" />
          )}
          {kpis.aguardando > 0 && (
            <KpiChip label="Aguardando" value={kpis.aguardando} className="border-amber-200 bg-amber-50" />
          )}
        </div>
      </div>

      {/* ── Cabeçalho das colunas ── */}
      <div className="shrink-0 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-3 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          <span className="w-6 shrink-0" />
          <span className="w-[64px] shrink-0">Código</span>
          <span className="flex-1 min-w-0">Chamado</span>
          {fullRow && <span className="w-[150px] shrink-0">Cliente</span>}
          {fullRow && <span className="w-[150px] shrink-0">Consultor</span>}
          {fullRow && <span className="w-[80px] shrink-0">Abertura</span>}
          <span className="w-5 shrink-0 text-center">P</span>
          <span className="w-[72px] shrink-0 text-right">Prazo</span>
          <span className="w-[120px] shrink-0 text-right">Status</span>
        </div>
      </div>

      {/* ── Split container ── */}
      <div className="flex min-h-0 flex-1">
        <div className={`flex flex-col min-h-0 transition-all duration-200 ${panelMode && !isMobile ? 'w-[55%]' : 'w-full'}`}>
      {/* ── Lista agrupada ── */}
      <div className="min-h-0 flex-1 overflow-y-auto bg-white">
        {isLoading ? (
          <div className="space-y-0">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-gray-100 px-3 py-3 animate-pulse">
                <div className="h-5 w-5 rounded bg-gray-200" />
                <div className="h-3 w-16 rounded bg-gray-200" />
                <div className="h-3 flex-1 rounded bg-gray-100" />
                <div className="h-5 w-16 rounded-full bg-gray-100" />
              </div>
            ))}
          </div>
        ) : (
          STATUS_GROUPS.map((group) => {
            const items = grouped[group.key] || [];
            if (items.length === 0 && group.key !== "aberta") return null;
            return (
              <div key={group.key}>
                <GroupHeader
                  group={group}
                  count={items.length}
                  collapsed={!!collapsed[group.key]}
                  onToggle={() => toggleGroup(group.key)}
                />
                {!collapsed[group.key] && (
                  <>
                    {items.length === 0 ? (
                      <div className="px-4 py-3 text-xs text-gray-400 italic">
                        Nenhuma tarefa
                      </div>
                    ) : (
                      items.map((tarefa) => (
                        <BacklogIssueRow
                          key={tarefa.id}
                          tarefa={tarefa}
                          consultorName={getName(tarefa.assignee_id, tarefa.assignee_name)}
                          consultorPhoto={getPhoto(tarefa.assignee_id)}
                          logoUrl={logosByWorkshop[tarefa.workshop_id]}
                          onView={handleView}
                          isSelected={panelMode === "detail" && selectedTarefa?.id === tarefa.id}
                          fullRow={fullRow}
                        />
                      ))
                    )}
                  </>
                )}
              </div>
            );
          })
        )}

        {!isLoading && filteredAll.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-gray-400">Nenhuma tarefa encontrada</p>
            {hasFilters && (
              <button onClick={clearFilters} className="mt-1 text-xs text-blue-500 hover:underline">
                Limpar filtros
              </button>
            )}
          </div>
        )}
      </div>
        </div>
        {panelMode && (
          <div className="hidden md:flex w-[45%] border-l border-gray-200 flex-col min-h-0 overflow-hidden">
            {panelMode === "form" ? (
              <TarefaBacklogForm
                inline
                tarefa={editingTarefa}
                user={user}
                workshops={workshops}
                workshopId={workshopId}
                onCancel={handleFormCancel}
                onSuccess={handleFormSuccess}
              />
            ) : freshSelected ? (
              <BacklogDetailDrawer
                tarefa={freshSelected}
                user={user}
                onClose={handlePanelClose}
                onEdit={handleEdit}
              />
            ) : null}
          </div>
        )}
      </div>

      {/* Mobile sheet */}
      <Sheet open={panelMode !== null && isMobile} onOpenChange={(open) => { if (!open) handlePanelClose(); }}>
        <SheetContent side="bottom" className="h-[85dvh] p-0">
          {panelMode === "form" ? (
            <div className="h-full">
              <TarefaBacklogForm
                inline
                tarefa={editingTarefa}
                user={user}
                workshops={workshops}
                workshopId={workshopId}
                onCancel={handleFormCancel}
                onSuccess={handleFormSuccess}
              />
            </div>
          ) : freshSelected ? (
            <BacklogDetailDrawer
              tarefa={freshSelected}
              user={user}
              onClose={handlePanelClose}
              onEdit={handleEdit}
              hideCloseButton
            />
          ) : null}
        </SheetContent>
      </Sheet>

      {showNovoTarefaModal && (
        <NovoTarefaModal
          user={user}
          workshopId={workshopId}
          workshops={workshops}
          onClose={() => setShowNovoTarefaModal(false)}
        />
      )}
    </div>
  );
}