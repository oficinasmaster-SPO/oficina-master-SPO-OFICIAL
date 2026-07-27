import React, { useState, useMemo, useCallback, useDeferredValue, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Plus, Search, X, ChevronDown, Inbox, Send as SendIcon, Users
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PEDIDO_STATUS_OPTIONS } from "@/components/shared/backlogConstants";

import PedidoInternoForm from "./PedidoInternoForm";
import NovoPedidoModal from "./NovoPedidoModal";
import BacklogBoard from "./BacklogBoard";
import PedidoInternoModal from "./PedidoInternoModal";
import PedidoInternoList from "./PedidoInternoList";
import PedidoInternoDetail from "./PedidoInternoDetail";

const SCOPE_OPTIONS = [
  { key: "todos",        label: "Todos os pedidos", icon: Users },
  { key: "para_mim",     label: "Para mim",         icon: Inbox },
  { key: "meus_pedidos", label: "Meus pedidos",     icon: SendIcon },
];

function ScopeSelector({ value, onChange }) {
  const current = SCOPE_OPTIONS.find(o => o.key === value) || SCOPE_OPTIONS[0];
  const Icon = current.icon;
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-[160px] bg-white border-gray-200 shadow-sm text-xs font-medium text-gray-700">
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-gray-500" />
          <span>{current.label}</span>
        </div>
      </SelectTrigger>
      <SelectContent>
        {SCOPE_OPTIONS.map(opt => (
          <SelectItem key={opt.key} value={opt.key} className="text-xs">{opt.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function PedidosInternosTab({ workshopId, user }) {
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [editingPedido, setEditingPedido]   = useState(null);
  const [showNewForm, setShowNewForm]       = useState(false);
  const [activeList, setActiveList]         = useState("pedidos");
  const [statusFilter, setStatusFilter]     = useState("all");
  const [scope, setScope]                   = useState("todos");
  
  const [search, setSearch]                 = useState("");
  const deferredSearch                      = useDeferredValue(search); 
  const searchInputRef                      = useRef(null);
  const queryClient                         = useQueryClient();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes(e.target.tagName)) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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

  // Métricas rápidas para o topo (Estilo pílulas sutis)
  const metrics = useMemo(() => {
    const active = pedidos.filter(p => !["concluido", "recusado"].includes(p.status));
    return {
      em_analise: active.filter(p => p.status === "em_analise").length,
      pendentes: active.filter(p => p.status === "pendente").length,
      aprovados: active.filter(p => p.status === "aprovado").length,
    };
  }, [pedidos]);

  const filteredPedidos = useMemo(() => {
    const userId = user?.id;
    const userEmail = user?.email;

    return pedidos
      .filter((p) => {
        if (scope === "para_mim") {
          const isAssignee = p.assignee_id === userId || (userEmail && p.assignee_id === userEmail);
          if (!isAssignee) return false;
        }
        if (scope === "meus_pedidos") {
          const isRequester = p.requester_id === userId || (userEmail && p.requester_id === userEmail) || (userEmail && p.created_by === userEmail);
          if (!isRequester) return false;
        }

        const q = deferredSearch.toLowerCase();
        if (q) {
          const haystack = [
            p.titulo, p.workshop_nome, p.requester_name, p.cliente_nome,
            p.assignee_name, p.id?.slice(-6),
          ].filter(Boolean).join(" ").toLowerCase();
          if (!haystack.includes(q)) return false;
        }

        if (statusFilter !== "all" && p.status !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));
  }, [pedidos, deferredSearch, statusFilter, scope, user?.id, user?.email]);

  const freshSelected = useMemo(() => {
    if (!selectedPedido) return null;
    return pedidos.find((p) => p.id === selectedPedido.id) || selectedPedido;
  }, [selectedPedido, pedidos]);

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

  const clearFilters = () => { setSearch(""); setStatusFilter("all"); };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      
      {/* Modais de Detalhe e Criação */}
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

      {showNewForm && !editingPedido && (
        <NovoPedidoModal user={user} onClose={handleFormClose} />
      )}

      <Tabs value={activeList} onValueChange={setActiveList} className="flex min-h-0 flex-1 flex-col">
        
        {/* Top Header com Tabs e Métricas Rápidas */}
        <div className="shrink-0 bg-white px-6 pt-3 border-b border-gray-200 flex items-center justify-between">
          <TabsList className="flex h-9 gap-6 bg-transparent p-0">
            <TabsTrigger value="pedidos" className="h-9 rounded-none border-b-2 border-transparent px-1 pb-2 text-xs font-semibold text-gray-500 hover:text-gray-900 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 data-[state=active]:bg-transparent shadow-none">
              Pedidos Internos
            </TabsTrigger>
            <TabsTrigger value="backlog" className="h-9 rounded-none border-b-2 border-transparent px-1 pb-2 text-xs font-semibold text-gray-500 hover:text-gray-900 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 data-[state=active]:bg-transparent shadow-none">
              Backlog de Tarefas
            </TabsTrigger>
          </TabsList>

          {activeList === "pedidos" && (
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-3 text-xs font-medium text-gray-600">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500"></span> {metrics.em_analise} em análise</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500"></span> {metrics.pendentes} pendentes</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500"></span> {metrics.aprovados} aprovados</span>
              </div>

              <Button
                onClick={() => { setEditingPedido(null); setShowNewForm(true); }}
                size="sm"
                className="h-8 px-4 bg-blue-600 hover:bg-blue-700 text-xs font-bold shadow-sm"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Novo Pedido
              </Button>
            </div>
          )}
        </div>

        {/* Toolbar de Filtros */}
        {activeList === "pedidos" && (
          <div className="flex items-center gap-3 px-6 py-2.5 bg-gray-50/50 border-b border-gray-200 shrink-0">
            <ScopeSelector value={scope} onChange={setScope} />

            <div className="relative w-[340px]">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por título, ID, cliente ou solicitante..."
                className="h-8 w-full rounded-md border border-gray-200 bg-white pl-9 pr-10 text-xs text-gray-800 placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                {!search && <span className="rounded border bg-gray-50 px-1 py-0.5 text-[9px] font-bold text-gray-400">/</span>}
                {search && <button onClick={clearFilters} className="text-gray-400 hover:text-gray-700"><X className="h-3.5 w-3.5" /></button>}
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-[140px] bg-white border-gray-200 shadow-sm text-xs font-medium text-gray-700">
                <SelectValue placeholder="Todos status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Todos status</SelectItem>
                {PEDIDO_STATUS_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>)}
              </SelectContent>
            </Select>

            <div className="flex-1" />

            <span className="text-xs font-semibold text-gray-400">
              {filteredPedidos.length} {filteredPedidos.length === 1 ? "pedido" : "pedidos"}
            </span>
          </div>
        )}

        <TabsContent value="pedidos" forceMount className={`mt-0 flex min-h-0 flex-1 flex-col bg-white ${activeList !== "pedidos" ? "hidden" : ""}`}>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <PedidoInternoList pedidos={filteredPedidos} isLoading={isLoading} onSelect={handleSelect} selectedId={selectedPedido?.id} />
          </div>
        </TabsContent>

        <TabsContent value="backlog" forceMount className={`mt-0 flex min-h-0 flex-1 flex-col overflow-hidden ${activeList !== "backlog" ? "hidden" : ""}`}>
          <BacklogBoard workshopId={workshopId} user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}