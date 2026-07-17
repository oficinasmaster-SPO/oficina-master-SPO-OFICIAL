import React, { useState, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Search, X, Inbox, Send as SendIcon } from "lucide-react";
import PedidoInternoForm from "./PedidoInternoForm";
import BacklogBoard from "./BacklogBoard";
import PedidoInternoModal from "./PedidoInternoModal";
import PedidoInternoList from "./PedidoInternoList";
import PedidoInternoDetail from "./PedidoInternoDetail";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PEDIDO_STATUS_OPTIONS } from "@/components/shared/backlogConstants";

// ── Toggle "Para mim / Meus pedidos / Todos" ────────────────────────────────
function ViewToggle({ value, onChange }) {
  const opts = [
    { key: "para_mim",      label: "Para mim",       icon: Inbox },
    { key: "meus_pedidos",   label: "Meus pedidos",   icon: SendIcon },
    { key: "todos",          label: "Todos",           icon: null },
  ];
  return (
    <div className="flex items-center rounded-md border border-gray-200 bg-gray-50 p-0.5">
      {opts.map((opt) => {
        const active = value === opt.key;
        const Icon = opt.icon;
        return (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            className={`flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-medium transition-all
              ${active
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"}`}
          >
            {Icon && <Icon className="h-3 w-3" />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Componente principal ────────────────────────────────────────────────────
export default function PedidosInternosTab({ workshopId, user }) {
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [editingPedido, setEditingPedido]   = useState(null);
  const [showNewForm, setShowNewForm]       = useState(false);
  const [activeList, setActiveList]         = useState("pedidos");
  const [search, setSearch]                 = useState("");
  const [statusFilter, setStatusFilter]     = useState("all");
  const [viewMode, setViewMode]             = useState("para_mim"); // para_mim | meus_pedidos | todos
  const queryClient = useQueryClient();

  // ── Data ──────────────────────────────────────────────────────────────────
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

  // ── Filtro por visão + busca + status ──────────────────────────────────────
  const filteredPedidos = useMemo(() => {
    const userId = user?.id;

    return pedidos
      .filter((p) => {
        // Filtro de visão
        if (viewMode === "para_mim" && p.assignee_id !== userId) return false;
        if (viewMode === "meus_pedidos" && p.requester_id !== userId) return false;

        // Busca
        const q = search.toLowerCase();
        const matchSearch =
          !q ||
          p.titulo?.toLowerCase().includes(q) ||
          p.workshop_nome?.toLowerCase().includes(q) ||
          p.requester_name?.toLowerCase().includes(q) ||
          p.assignee_name?.toLowerCase().includes(q);

        // Status
        const matchStatus = statusFilter === "all" || p.status === statusFilter;

        return matchSearch && matchStatus;
      })
      .sort((a, b) => {
        const hoje = new Date();
        const isFimA = ["concluido", "recusado"].includes(a.status);
        const isFimB = ["concluido", "recusado"].includes(b.status);
        const isVencidoA = a.prazo && new Date(a.prazo) < hoje && !isFimA;
        const isVencidoB = b.prazo && new Date(b.prazo) < hoje && !isFimB;
        if (isFimA !== isFimB) return isFimA ? 1 : -1;
        if (isVencidoA !== isVencidoB) return isVencidoA ? -1 : 1;
        if (a.prazo && b.prazo) return new Date(a.prazo) - new Date(b.prazo);
        return 0;
      });
  }, [pedidos, search, statusFilter, viewMode, user?.id]);

  // Dados frescos do selecionado
  const freshSelected = useMemo(() => {
    if (!selectedPedido) return null;
    return pedidos.find((p) => p.id === selectedPedido.id) || selectedPedido;
  }, [selectedPedido, pedidos]);

  // Contadores por visão
  const countParaMim = useMemo(
    () => pedidos.filter(p => p.assignee_id === user?.id && !["concluido","recusado"].includes(p.status)).length,
    [pedidos, user?.id]
  );
  const countMeusPedidos = useMemo(
    () => pedidos.filter(p => p.requester_id === user?.id && !["concluido","recusado"].includes(p.status)).length,
    [pedidos, user?.id]
  );

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSelect = useCallback((pedido) => setSelectedPedido(pedido), []);

  const handleDetailClose = useCallback(() => {
    setSelectedPedido(null);
    queryClient.invalidateQueries({ queryKey: ["pedidos-internos"] });
  }, [queryClient]);

  const handleEdit = useCallback((pedido) => {
    setSelectedPedido(null);
    setEditingPedido(pedido);
    setShowNewForm(true);
  }, []);

  const handleFormClose = useCallback(() => {
    setShowNewForm(false);
    setEditingPedido(null);
    queryClient.invalidateQueries({ queryKey: ["pedidos-internos"] });
  }, [queryClient]);

  const hasFilters = search || statusFilter !== "all";
  const clearFilters = () => { setSearch(""); setStatusFilter("all"); };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">

      {/* ── Modal de detalhe (grande, tela toda) ── */}
      <PedidoInternoModal
        open={!!selectedPedido}
        onClose={() => setSelectedPedido(null)}
        size="wide"
      >
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

      {/* ── Modal de criar/editar ── */}
      <PedidoInternoModal
        open={showNewForm}
        onClose={() => { setShowNewForm(false); setEditingPedido(null); }}
        size="default"
      >
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

      {/* ── Tabs Pedidos / Backlog ── */}
      <Tabs
        value={activeList}
        onValueChange={setActiveList}
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        {/* Header unificado */}
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-gray-200 bg-white px-4 py-2">
          <TabsList className="h-8 gap-0.5 rounded-lg bg-gray-100 p-1">
            <TabsTrigger
              value="pedidos"
              className="h-6 rounded px-3 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              Pedidos Internos
              {countParaMim > 0 && (
                <span className="ml-1.5 rounded-full bg-blue-500 px-1.5 text-[9px] font-bold text-white">{countParaMim}</span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="backlog"
              className="h-6 rounded px-3 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              Backlog de Tarefas
            </TabsTrigger>
          </TabsList>

          {/* Toolbar pedidos */}
          {activeList === "pedidos" && (
            <>
              <ViewToggle value={viewMode} onChange={setViewMode} />

              <div className="relative max-w-[200px] flex-1">
                <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar..."
                  className="h-7 w-full rounded-md border border-gray-200 bg-gray-50 pl-7 pr-2 text-[11px] text-gray-800 placeholder:text-gray-400 focus:border-blue-300 focus:bg-white focus:outline-none"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-7 w-[120px] shrink-0 text-[11px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">Todos</SelectItem>
                  {PEDIDO_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasFilters && (
                <button onClick={clearFilters} className="flex h-7 items-center gap-1 rounded px-1.5 text-[11px] text-gray-400 hover:bg-gray-100">
                  <X className="h-3 w-3" /> Limpar
                </button>
              )}

              <span className="text-[11px] text-gray-400">{filteredPedidos.length}</span>

              <Button
                onClick={() => { setEditingPedido(null); setShowNewForm(true); }}
                size="sm"
                className="ml-auto h-7 gap-1 bg-blue-600 text-[11px] hover:bg-blue-700"
              >
                <Plus className="h-3 w-3" /> Novo Pedido
              </Button>
            </>
          )}
        </div>

        {/* Backlog */}
        <TabsContent
          value="backlog"
          forceMount
          className={`mt-0 flex min-h-0 flex-1 flex-col overflow-hidden ${activeList !== "backlog" ? "hidden" : ""}`}
        >
          <BacklogBoard workshopId={workshopId} user={user} />
        </TabsContent>

        {/* Lista de Pedidos */}
        <TabsContent
          value="pedidos"
          forceMount
          className={`mt-0 flex min-h-0 flex-1 flex-col overflow-hidden ${activeList !== "pedidos" ? "hidden" : ""}`}
        >
          <div className="scrollbar-thin scrollbar-stable min-h-0 flex-1 overflow-y-auto bg-white">
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
