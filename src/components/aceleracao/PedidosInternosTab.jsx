/**
 * PedidosInternosTab — Shell fixo com toolbar + lista rolável
 *
 * Layout (REFACTOR_BRIEF.md):
 * ┌─ Header fixo (shrink-0) ──────────────────────────────────────────────┐
 * │  Tabs (Pedidos | Backlog) + Métricas rápidas + CTA                   │
 * │  Toolbar: Escopo (dropdown) + Search + Filtro Status                 │
 * │  Column Headers (Solicitante | Título | Cliente | P | Status | SLA)  │
 * ├───────────────────────────────────────────────────────────────────────┤
 * │  Lista agrupada (flex-1 overflow-y-auto)                             │
 * └───────────────────────────────────────────────────────────────────────┘
 */
import React, { useState, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Plus, Search, X, User, ChevronDown, Inbox, Send as SendIcon, Users,
} from "lucide-react";
import PedidoInternoForm from "./PedidoInternoForm";
import BacklogBoard from "./BacklogBoard";
import PedidoInternoModal from "./PedidoInternoModal";
import PedidoInternoList, { ColumnHeaders } from "./PedidoInternoList";
import PedidoInternoDetail from "./PedidoInternoDetail";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { PEDIDO_STATUS_OPTIONS } from "@/components/shared/backlogConstants";

/* ═══════════════════════════════════════════════════════════════════════════
   SCOPE SELECTOR — combobox/dropdown (spec: NÃO botões inline)
   ═══════════════════════════════════════════════════════════════════════════ */
const SCOPE_OPTIONS = [
  { key: "todos",        label: "Todos os pedidos", icon: Users,    description: "Ver tudo" },
  { key: "para_mim",     label: "Para mim",         icon: Inbox,    description: "Pedidos atribuídos a mim" },
  { key: "meus_pedidos", label: "Meus pedidos",     icon: SendIcon, description: "Pedidos que eu criei" },
];

function ScopeSelector({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const current = SCOPE_OPTIONS.find(o => o.key === value) || SCOPE_OPTIONS[0];
  const Icon = current.icon;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex h-8 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors min-w-[160px]">
          <Icon className="h-3.5 w-3.5 text-gray-400" />
          {current.label}
          <ChevronDown className="ml-auto h-3 w-3 text-gray-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[220px] p-1" sideOffset={4}>
        {SCOPE_OPTIONS.map(opt => {
          const OptIcon = opt.icon;
          const active = opt.key === value;
          return (
            <button
              key={opt.key}
              onClick={() => { onChange(opt.key); setOpen(false); }}
              className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-xs transition-colors
                ${active ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"}`}
            >
              <OptIcon className={`h-3.5 w-3.5 ${active ? "text-blue-500" : "text-gray-400"}`} />
              <div className="flex-1">
                <p className="font-medium">{opt.label}</p>
                <p className="text-[10px] text-gray-400">{opt.description}</p>
              </div>
              {active && <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   METRIC DOTS — indicadores rápidos
   ═══════════════════════════════════════════════════════════════════════════ */
function MetricDot({ color, count, label }) {
  if (count === 0) return null;
  return (
    <span className="flex items-center gap-1.5 text-xs text-gray-600">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      <span className="font-bold tabular-nums">{count}</span>
      <span className="text-gray-400 hidden sm:inline">{label}</span>
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
export default function PedidosInternosTab({ workshopId, user }) {
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [editingPedido, setEditingPedido]   = useState(null);
  const [showNewForm, setShowNewForm]       = useState(false);
  const [activeList, setActiveList]         = useState("pedidos");
  const [search, setSearch]                 = useState("");
  const [statusFilter, setStatusFilter]     = useState("all");
  const [scope, setScope]                   = useState("todos");
  const queryClient = useQueryClient();

  /* ── Data ─────────────────────────────────────────────────────────────── */
  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ["pedidos-internos", workshopId],
    queryFn: async () => {
      const all = workshopId
        ? await base44.entities.PedidoInterno.filter({ workshop_id: workshopId }, "-created_date")
        : await base44.entities.PedidoInterno.list("-created_date");
      return all || [];
    },
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ["usuarios-sistema"],
    queryFn: async () => (await base44.entities.User.list()) || [],
  });

  /* ── Métricas rápidas ──────────────────────────────────────────────────── */
  const metrics = useMemo(() => {
    const active = pedidos.filter(p => !["concluido", "recusado"].includes(p.status));
    return {
      em_analise: active.filter(p => p.status === "em_analise").length,
      pendentes:  active.filter(p => p.status === "pendente").length,
      aprovados:  active.filter(p => p.status === "aprovado").length,
    };
  }, [pedidos]);

  /* ── Filtro + ordenação ────────────────────────────────────────────────── */
  const filteredPedidos = useMemo(() => {
    const userId = user?.id;
    const userEmail = user?.email;

    return pedidos
      .filter((p) => {
        // Scope
        if (scope === "para_mim") {
          const isAssignee = p.assignee_id === userId
            || (userEmail && p.assignee_id === userEmail);
          if (!isAssignee) return false;
        }
        if (scope === "meus_pedidos") {
          const isRequester = p.requester_id === userId
            || (userEmail && p.requester_id === userEmail)
            || (userEmail && p.created_by === userEmail);
          if (!isRequester) return false;
        }

        // Search
        const q = search.toLowerCase();
        if (q) {
          const haystack = [
            p.titulo, p.workshop_nome, p.requester_name,
            p.assignee_name, p.id?.slice(-6),
          ].filter(Boolean).join(" ").toLowerCase();
          if (!haystack.includes(q)) return false;
        }

        // Status
        if (statusFilter !== "all" && p.status !== statusFilter) return false;

        return true;
      })
      .sort((a, b) => {
        const hoje = new Date();
        const isFimA = ["concluido", "recusado"].includes(a.status);
        const isFimB = ["concluido", "recusado"].includes(b.status);
        if (isFimA !== isFimB) return isFimA ? 1 : -1;
        const isVencA = a.prazo && new Date(a.prazo) < hoje && !isFimA;
        const isVencB = b.prazo && new Date(b.prazo) < hoje && !isFimB;
        if (isVencA !== isVencB) return isVencA ? -1 : 1;
        return new Date(b.created_date || 0) - new Date(a.created_date || 0);
      });
  }, [pedidos, search, statusFilter, scope, user?.id, user?.email]);

  // Dados frescos do selecionado
  const freshSelected = useMemo(() => {
    if (!selectedPedido) return null;
    return pedidos.find((p) => p.id === selectedPedido.id) || selectedPedido;
  }, [selectedPedido, pedidos]);

  /* ── Handlers ──────────────────────────────────────────────────────────── */
  const handleSelect = useCallback((p) => setSelectedPedido(p), []);
  const handleDetailClose = useCallback(() => {
    setSelectedPedido(null);
    queryClient.invalidateQueries({ queryKey: ["pedidos-internos"] });
  }, [queryClient]);
  const handleFormClose = useCallback(() => {
    setShowNewForm(false);
    setEditingPedido(null);
    queryClient.invalidateQueries({ queryKey: ["pedidos-internos"] });
  }, [queryClient]);

  const hasFilters = search || statusFilter !== "all";
  const clearFilters = () => { setSearch(""); setStatusFilter("all"); };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">

      {/* ── Modal detalhe (wide) ── */}
      <PedidoInternoModal open={!!selectedPedido} onClose={() => setSelectedPedido(null)} size="wide">
        {freshSelected && (
          <PedidoInternoDetail
            pedido={freshSelected}
            user={user}
            onCancel={() => setSelectedPedido(null)}
            onSuccess={handleDetailClose}
            onDelete={handleDetailClose}
          />
        )}
      </PedidoInternoModal>

      {/* ── Modal novo/editar ── */}
      <PedidoInternoModal open={showNewForm} onClose={() => { setShowNewForm(false); setEditingPedido(null); }} size="default">
        {showNewForm && (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
            <PedidoInternoForm
              pedido={editingPedido}
              user={user}
              usuarios={usuarios}
              onCancel={() => { setShowNewForm(false); setEditingPedido(null); }}
              onSuccess={handleFormClose}
            />
          </div>
        )}
      </PedidoInternoModal>

      {/* ═══════════════════════════════════════════════════════════════════
          FIXED HEADER BLOCK (shrink-0)
          ═══════════════════════════════════════════════════════════════════ */}
      <Tabs
        value={activeList}
        onValueChange={setActiveList}
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <div className="shrink-0 border-b border-gray-200 bg-white shadow-sm">

          {/* ── Linha 1: Tabs + métricas + CTA ── */}
          <div className="flex items-center gap-4 px-4 py-2">
            <TabsList className="h-9 gap-0.5 rounded-lg bg-gray-100 p-1">
              <TabsTrigger
                value="pedidos"
                className="h-7 rounded-md px-3.5 text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Pedidos Internos
              </TabsTrigger>
              <TabsTrigger
                value="backlog"
                className="h-7 rounded-md px-3.5 text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Backlog de Tarefas
              </TabsTrigger>
            </TabsList>

            {activeList === "pedidos" && (
              <>
                {/* Métricas rápidas */}
                <div className="hidden md:flex items-center gap-3 border-l border-gray-200 pl-4">
                  <MetricDot color="bg-blue-500"    count={metrics.em_analise} label="em análise" />
                  <MetricDot color="bg-amber-500"   count={metrics.pendentes}  label="pendentes" />
                  <MetricDot color="bg-emerald-500" count={metrics.aprovados}  label="aprovados" />
                </div>

                <Button
                  onClick={() => { setEditingPedido(null); setShowNewForm(true); }}
                  size="sm"
                  className="ml-auto h-8 gap-1.5 bg-blue-600 text-xs font-semibold shadow-sm hover:bg-blue-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Novo Pedido
                </Button>
              </>
            )}
          </div>

          {/* ── Linha 2: Toolbar (só na aba pedidos) ── */}
          {activeList === "pedidos" && (
            <div className="flex items-center gap-2 border-t border-gray-100 px-4 py-2">
              {/* Escopo (dropdown) */}
              <ScopeSelector value={scope} onChange={setScope} />

              {/* Spacer */}
              <div className="flex-1" />

              {/* Search */}
              <div className="relative w-[280px]">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por título, ID, cliente ou solicitante…"
                  className="h-8 w-full rounded-lg border border-gray-200 bg-gray-50/60 pl-8 pr-3 text-xs text-gray-800 placeholder:text-gray-400 focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-200 transition-colors"
                />
              </div>

              {/* Filtro status */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 w-[140px] shrink-0 rounded-lg text-xs">
                  <SelectValue placeholder="Todos status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">Todos status</SelectItem>
                  {PEDIDO_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Limpar filtros */}
              {hasFilters && (
                <button onClick={clearFilters} className="flex h-8 items-center gap-1 rounded-md px-2 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                  <X className="h-3 w-3" /> Limpar
                </button>
              )}

              {/* Contador */}
              <span className="text-xs tabular-nums text-gray-400">
                {filteredPedidos.length} {filteredPedidos.length === 1 ? "pedido" : "pedidos"}
              </span>
            </div>
          )}

          {/* ── Linha 3: Column headers (só na aba pedidos) ── */}
          {activeList === "pedidos" && <ColumnHeaders />}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            SCROLLABLE CONTENT (flex-1 overflow-y-auto)
            ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent
          value="backlog"
          forceMount
          className={`mt-0 flex min-h-0 flex-1 flex-col overflow-hidden ${activeList !== "backlog" ? "hidden" : ""}`}
        >
          <BacklogBoard workshopId={workshopId} user={user} />
        </TabsContent>

        <TabsContent
          value="pedidos"
          forceMount
          className={`mt-0 flex min-h-0 flex-1 flex-col overflow-hidden ${activeList !== "pedidos" ? "hidden" : ""}`}
        >
          <div className="min-h-0 flex-1 overflow-y-auto bg-white">
            <PedidoInternoList
              pedidos={filteredPedidos}
              onSelect={handleSelect}
              isLoading={isLoading}
              selectedId={selectedPedido?.id}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
