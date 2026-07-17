import React, { useState, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Search, ChevronDown, ChevronRight,
  AlertCircle, Clock, Play, CheckCircle2, Lock, LayoutList,
  SlidersHorizontal, X,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import BacklogIssueRow from "./BacklogIssueRow";
import BacklogDetailDrawer from "./BacklogDetailDrawer";
import TarefaBacklogForm from "./TarefaBacklogForm";
import TarefaBacklogModal from "./TarefaBacklogModal";
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

  // Form / detalhe
  const [showForm, setShowForm]         = useState(false);
  const [editingTarefa, setEditingTarefa] = useState(null);
  const [selectedTarefa, setSelectedTarefa] = useState(null);

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
    onSuccess: () => queryClient.invalidateQueries(["tarefas-backlog"]),
  });

  // ── Listas derivadas ──────────────────────────────────────────────────────
  const consultoresUnicos = useMemo(
    () => [...new Set(tarefas.map((t) => t.assignee_name).filter(Boolean))].sort(),
    [tarefas]
  );
  const clientesUnicos = useMemo(
    () => [...new Set(tarefas.map((t) => t.workshop_nome).filter(Boolean))].sort(),
    [tarefas]
  );

  const hoje = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  }, []);

  const ativos = tarefas.filter((t) => t.status !== "concluida");

  const filteredAll = useMemo(() => {
    return tarefas.filter((t) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        t.titulo?.toLowerCase().includes(q) ||
        t.workshop_nome?.toLowerCase().includes(q) ||
        t.assignee_name?.toLowerCase().includes(q);
      const matchConsultor  = filterConsultor  === "all" || t.assignee_name  === filterConsultor;
      const matchCliente    = filterCliente    === "all" || t.workshop_nome   === filterCliente;
      const matchPrioridade = filterPrioridade === "all" || t.prioridade      === filterPrioridade;
      const matchOrigem     = filterOrigem     === "all" || t.origin_type     === filterOrigem;
      return matchSearch && matchConsultor && matchCliente && matchPrioridade && matchOrigem;
    });
  }, [tarefas, search, filterConsultor, filterCliente, filterPrioridade, filterOrigem]);

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

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleView = useCallback((tarefa) => setSelectedTarefa(tarefa), []);
  const handleEdit = useCallback((tarefa) => {
    setSelectedTarefa(null);
    setEditingTarefa(tarefa);
    setShowForm(true);
  }, []);
  const handleFormClose = useCallback(() => {
    setShowForm(false);
    setEditingTarefa(null);
    queryClient.invalidateQueries(["tarefas-backlog"]);
  }, [queryClient]);

  // Sincroniza o selectedTarefa com dados frescos após mutação
  const freshSelected = useMemo(() => {
    if (!selectedTarefa) return null;
    return tarefas.find((t) => t.id === selectedTarefa.id) || selectedTarefa;
  }, [selectedTarefa, tarefas]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">

      {/* ── Modal de criação/edição ── */}
      <TarefaBacklogModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditingTarefa(null); }}
      >
        <TarefaBacklogForm
          tarefa={editingTarefa}
          user={user}
          workshops={workshops}
          workshopId={workshopId}
          onCancel={() => { setShowForm(false); setEditingTarefa(null); }}
          onSuccess={handleFormClose}
        />
      </TarefaBacklogModal>

      {/* ── Drawer de detalhe ── */}
      {freshSelected && (
        <BacklogDetailDrawer
          tarefa={freshSelected}
          user={user}
          onClose={() => setSelectedTarefa(null)}
          onEdit={handleEdit}
        />
      )}

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
              onClick={() => setShowForm(true)}
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
            <Select value={filterConsultor} onValueChange={setFilterConsultor}>
              <SelectTrigger className="h-7 w-[160px] text-xs"><SelectValue placeholder="Consultor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Todos consultores</SelectItem>
                {consultoresUnicos.map((c) => (
                  <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterCliente} onValueChange={setFilterCliente}>
              <SelectTrigger className="h-7 w-[160px] text-xs"><SelectValue placeholder="Cliente" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Todos clientes</SelectItem>
                {clientesUnicos.map((c) => (
                  <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterPrioridade} onValueChange={setFilterPrioridade}>
              <SelectTrigger className="h-7 w-[140px] text-xs"><SelectValue placeholder="Prioridade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Toda prioridade</SelectItem>
                {PRIORIDADE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterOrigem} onValueChange={setFilterOrigem}>
              <SelectTrigger className="h-7 w-[150px] text-xs"><SelectValue placeholder="Origem" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Toda origem</SelectItem>
                {ORIGIN_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <span className="w-[70px] shrink-0">Código</span>
          <span className="flex-1">Título</span>
          <span className="w-5 shrink-0 text-center">P</span>
          <span className="w-[72px] shrink-0 text-right">Prazo</span>
          <span className="w-8 shrink-0 text-center">Resp.</span>
          <span className="w-[130px] shrink-0 text-right">Status</span>
        </div>
      </div>

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
                          onView={handleView}
                          isSelected={selectedTarefa?.id === tarefa.id}
                        />
                      ))
                    )}
                  </>
                )}
              </div>
            );
          })
        )}

        {!isLoading && filteredAll.length === 0 && !isLoading && (
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
  );
}
