import React, { useState, useMemo, useCallback, useDeferredValue, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import PedidoInternoForm from "./PedidoInternoForm";
import NovoPedidoModal from "./NovoPedidoModal";
import BacklogBoard from "./BacklogBoard";
import PedidoInternoModal from "./PedidoInternoModal";
import PedidoInternoList from "./PedidoInternoList";
import PedidoInternoDetail from "./PedidoInternoDetail";
import OrderFilterBar from "./OrderFilterBar";

export default function PedidosInternosTab({ workshopId, user }) {
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [editingPedido, setEditingPedido] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [activeList, setActiveList] = useState("pedidos");
  const [statusFilter, setStatusFilter] = useState("all");
  const [scope, setScope] = useState("todos");

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const searchInputRef = useRef(null);
  const queryClient = useQueryClient();

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
      const all = workshopId ?
      await base44.entities.PedidoInterno.filter({ workshop_id: workshopId }, "-created_date") :
      await base44.entities.PedidoInterno.list("-created_date");
      return all || [];
    }
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ["usuarios-sistema"],
    queryFn: async () => (await base44.entities.User.list()) || []
  });

  // Métricas rápidas para o topo (Estilo pílulas sutis)
  const metrics = useMemo(() => {
    const active = pedidos.filter((p) => !["concluido", "recusado"].includes(p.status));
    return {
      em_analise: active.filter((p) => p.status === "em_analise").length,
      pendentes: active.filter((p) => p.status === "pendente").length,
      aprovados: active.filter((p) => p.status === "aprovado").length
    };
  }, [pedidos]);

  const filteredPedidos = useMemo(() => {
    const userId = user?.id;
    const userEmail = user?.email;

    return pedidos.
    filter((p) => {
      if (scope === "para_mim") {
        const isAssignee = p.assignee_id === userId || userEmail && p.assignee_id === userEmail;
        if (!isAssignee) return false;
      }
      if (scope === "meus_pedidos") {
        const isRequester = p.requester_id === userId || userEmail && p.requester_id === userEmail || userEmail && p.created_by === userEmail;
        if (!isRequester) return false;
      }

      const q = deferredSearch.toLowerCase();
      if (q) {
        const haystack = [
        p.titulo, p.workshop_nome, p.requester_name, p.cliente_nome,
        p.assignee_name, p.id?.slice(-6)].
        filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      return true;
    }).
    sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));
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

  const clearFilters = () => {setSearch("");setStatusFilter("all");};

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white rounded-lg border border-[hsl(var(--border-subtle))] shadow-[0_1px_2px_rgba(16,24,40,.04)]">
      
      {/* Modais de Detalhe e Criação */}
      <PedidoInternoModal open={!!selectedPedido} onClose={() => setSelectedPedido(null)} size="wide">
        {freshSelected &&
        <PedidoInternoDetail
          pedido={freshSelected}
          user={user}
          onCancel={() => setSelectedPedido(null)}
          onSuccess={handleDetailClose}
          onDelete={handleDetailClose} />

        }
      </PedidoInternoModal>

      {showNewForm && !editingPedido &&
      <NovoPedidoModal user={user} onClose={handleFormClose} />
      }

      <Tabs value={activeList} onValueChange={setActiveList} className="flex min-h-0 flex-1 flex-col">
        
        {/* Top Header com Tabs e Métricas Rápidas */}
{/* Top Header com Tabs e Métricas Rápidas */}
<div className="shrink-0 h-14 bg-[hsl(var(--surface))] px-6 border-b border-[hsl(var(--border-subtle))] flex items-center justify-between shadow-[0_1px_2px_rgba(16,24,40,.04)] rounded-t-lg relative">
  <TabsList className="flex h-9 gap-6 bg-transparent p-0 items-center">
    <TabsTrigger value="pedidos" className="h-9 rounded-none border-b-2 border-transparent px-1 pb-2 text-xs font-semibold text-gray-500 hover:text-gray-900 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 data-[state=active]:bg-transparent shadow-none">
      Pedidos Internos
    </TabsTrigger>
    <TabsTrigger value="backlog" className="h-9 rounded-none border-b-2 border-transparent px-1 pb-2 text-xs font-semibold text-gray-500 hover:text-gray-900 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 data-[state=active]:bg-transparent shadow-none">
      Backlog de Tarefas
    </TabsTrigger>
  </TabsList>

  {/* Contêiner da direita com tamanho/estrutura preservados para evitar Layout Shift */}
  <div className="flex items-center gap-4 h-full">
    {/* Métricas: Usamos opacity-0 e pointer-events-none em vez de sumir com o HTML da página */}
    <div className={cn(
      "hidden md:flex items-center gap-3 text-xs font-medium text-gray-600 transition-opacity duration-150",
      activeList === "pedidos" ? "opacity-100" : "opacity-0 pointer-events-none"
    )}>
      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500"></span> {metrics.em_analise} em análise</span>
      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500"></span> {metrics.pendentes} pendentes</span>
      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500"></span> {metrics.aprovados} aprovados</span>
    </div>

    {/* Botão: Também controlado por opacidade para manter o espaço reservado e evitar solavancos */}
    <div className={cn(
      "flex items-center h-full transition-opacity duration-150",
      activeList === "pedidos" ? "opacity-100" : "opacity-0 pointer-events-none"
    )}>
      <Button
        onClick={() => { setEditingPedido(null); setShowNewForm(true); }}
        size="sm"
        className="h-8 bg-blue-600 hover:bg-blue-600/90 text-[12px] font-medium text-white rounded-md shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-blue-700/50 transition-all px-3 flex items-center justify-center"
      >
        <Plus className="mr-1.5 h-3 w-3 stroke-[2.5]" />
        Novo Pedido
      </Button>
    </div>
  </div>
</div>


        {/* Toolbar de Filtros */}
        {activeList === "pedidos" &&
        <OrderFilterBar
          scope={scope}
          setScope={setScope}
          search={search}
          setSearch={setSearch}
          searchInputRef={searchInputRef}
          clearFilters={clearFilters}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          filteredPedidos={filteredPedidos} />

        }

        {/* 🌟 NOVO: CABEÇALHO FIXO DA LISTA DE PEDIDOS */}
        {activeList === "pedidos" &&
        <div className="shrink-0 bg-gray-50/75 border-b border-gray-200 px-6 py-2 grid grid-cols-12 gap-4 text-[11px] font-bold uppercase tracking-wider text-gray-500 select-none hidden">
            <div className="col-span-3">Cliente / Empresa</div>
            <div className="col-span-3">Título / Serviço</div>
            <div className="col-span-2">Solicitante</div>
            <div className="col-span-2 text-center">Status</div>
            <div className="col-span-2 text-right">Prazo / SLA</div>
          </div>
        }

        {/* Conteúdo da Lista de Pedidos */}
        <TabsContent value="pedidos" forceMount className={`mt-0 flex min-h-0 flex-1 flex-col bg-white ${activeList !== "pedidos" ? "hidden" : ""}`}>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <PedidoInternoList pedidos={filteredPedidos} isLoading={isLoading} onSelect={handleSelect} selectedId={selectedPedido?.id} />
          </div>
        </TabsContent>

        {/* Conteúdo do Backlog */}
        <TabsContent value="backlog" forceMount className={`mt-0 flex min-h-0 flex-1 flex-col overflow-hidden ${activeList !== "backlog" ? "hidden" : ""}`}>
          <BacklogBoard workshopId={workshopId} user={user} />
        </TabsContent>
      </Tabs>
    </div>);

}