import React, { useState, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Search, X, SlidersHorizontal } from "lucide-react";
import PedidoInternoForm from "./PedidoInternoForm";
import BacklogBoard from "./BacklogBoard";
import PedidoInternoModal from "./PedidoInternoModal";
import PedidoInternoList from "./PedidoInternoList";
import PedidoInternoDrawer from "./PedidoInternoDrawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PEDIDO_STATUS_OPTIONS } from "@/components/shared/backlogConstants";

export default function PedidosInternosTab({ workshopId, user }) {
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [editingPedido, setEditingPedido]   = useState(null);
  const [showNewForm, setShowNewForm]       = useState(false);
  const [activeList, setActiveList]         = useState("pedidos");
  const [search, setSearch]                 = useState("");
  const [statusFilter, setStatusFilter]     = useState("all");
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

  const updatePedidoMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PedidoInterno.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pedidos-internos"] }),
  });

  // ── Lista filtrada + ordenada ──────────────────────────────────────────────
  const filteredPedidos = useMemo(() => {
    return pedidos
      .filter((p) => {
        const q = search.toLowerCase();
        const matchSearch =
          !q ||
          p.titulo?.toLowerCase().includes(q) ||
          p.workshop_nome?.toLowerCase().includes(q) ||
          p.requester_name?.toLowerCase().includes(q);
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
  }, [pedidos, search, statusFilter]);

  // Índice do pedido selecionado na lista filtrada (para navegação prev/next)
  const selectedIndex = useMemo(
    () => filteredPedidos.findIndex((p) => p.id === selectedPedido?.id),
    [filteredPedidos, selectedPedido]
  );

  // Dados frescos do pedido selecionado (reage a mutações)
  const freshSelected = useMemo(() => {
    if (!selectedPedido) return null;
    return pedidos.find((p) => p.id === selectedPedido.id) || selectedPedido;
  }, [selectedPedido, pedidos]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSelect = useCallback((pedido) => {
    setSelectedPedido(pedido);
  }, []);

  const handleNavigate = useCallback((direction) => {
    const nextIdx = direction === "next" ? selectedIndex + 1 : selectedIndex - 1;
    if (nextIdx >= 0 && nextIdx < filteredPedidos.length) {
      setSelectedPedido(filteredPedidos[nextIdx]);
    }
  }, [selectedIndex, filteredPedidos]);

  const handleClose = useCallback(() => {
    setSelectedPedido(null);
    queryClient.invalidateQueries({ queryKey: ["pedidos-internos"] });
  }, [queryClient]);

  const handleEdit = useCallback((pedido) => {
    setSelectedPedido(null);
    setEditingPedido(pedido);
    setShowNewForm(true);
  }, []);

  const handleDelete = useCallback(() => {
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

      {/* ── Modal de criar/editar pedido ── */}
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

      {/* ── Drawer de detalhe do pedido ── */}
      {freshSelected && (
        <PedidoInternoDrawer
          pedido={freshSelected}
          user={user}
          totalPedidos={filteredPedidos.length}
          currentIndex={selectedIndex >= 0 ? selectedIndex : 0}
          onNavigate={handleNavigate}
          onClose={handleClose}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onSuccess={handleClose}
        />
      )}

      {/* ── Tabs Pedidos / Backlog ── */}
      <Tabs
        value={activeList}
        onValueChange={setActiveList}
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        {/* Header unificado: tabs + toolbar contextual */}
        <div className="flex shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 py-2">
          <TabsList className="h-8 gap-0.5 rounded-lg bg-gray-100 p-1">
            <TabsTrigger
              value="pedidos"
              className="h-6 rounded px-3 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              Pedidos Internos
              {pedidos.filter(p => !["concluido","recusado"].includes(p.status)).length > 0 && (
                <span className="ml-1.5 rounded-full bg-blue-500 px-1.5 text-[9px] font-bold text-white">
                  {pedidos.filter(p => !["concluido","recusado"].includes(p.status)).length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="backlog"
              className="h-6 rounded px-3 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              Backlog de Tarefas
            </TabsTrigger>
          </TabsList>

          {/* Toolbar — aparece só na aba pedidos */}
          {activeList === "pedidos" && (
            <div className="flex flex-1 items-center gap-2">
              <div className="relative max-w-xs flex-1">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar pedidos..."
                  className="h-8 w-full rounded-md border border-gray-200 bg-gray-50 pl-8 pr-3 text-xs text-gray-800 placeholder:text-gray-400 focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-100"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 w-[140px] shrink-0 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">Todos os status</SelectItem>
                  {PEDIDO_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="flex h-8 items-center gap-1 rounded-md px-2 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-3 w-3" /> Limpar
                </button>
              )}

              <span className="text-xs text-gray-400">
                {filteredPedidos.length} {filteredPedidos.length === 1 ? "pedido" : "pedidos"}
              </span>

              <Button
                onClick={() => { setEditingPedido(null); setShowNewForm(true); }}
                size="sm"
                className="ml-auto h-8 gap-1.5 bg-blue-600 text-xs shadow-sm hover:bg-blue-700"
              >
                <Plus className="h-3.5 w-3.5" />
                Novo Pedido
              </Button>
            </div>
          )}
        </div>

        {/* ── Backlog ── */}
        <TabsContent
          value="backlog"
          forceMount
          className={`mt-0 flex min-h-0 flex-1 flex-col overflow-hidden ${
            activeList !== "backlog" ? "hidden" : "animate-in fade-in duration-200"
          }`}
        >
          <BacklogBoard workshopId={workshopId} user={user} />
        </TabsContent>

        {/* ── Lista de Pedidos ── */}
        <TabsContent
          value="pedidos"
          forceMount
          className={`mt-0 flex min-h-0 flex-1 flex-col overflow-hidden ${
            activeList !== "pedidos" ? "hidden" : "flex animate-in fade-in duration-200"
          }`}
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
