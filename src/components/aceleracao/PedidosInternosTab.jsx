import React, { useState, useMemo, useCallback, useDeferredValue, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import NovoTarefaModal from "./NovoTarefaModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import NovoPedidoModal from "./NovoPedidoModal";
import BacklogBoard from "./BacklogBoard";
import PedidoInternoModal from "./PedidoInternoModal";
import PedidoInternoList from "./PedidoInternoList";
import PedidoInternoDetail from "./PedidoInternoDetail";
import OrderFilterBar from "./OrderFilterBar";
import BacklogScopeSelector from "./BacklogScopeSelector";

// BUG-12: tamanho do lote da listagem incremental (teto visível, nunca silencioso)
const PAGE_SIZE = 200;

export default function PedidosInternosTab({ workshopId, user }) {
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [editingPedido, setEditingPedido] = useState(null);
  const [listLimit, setListLimit] = useState(PAGE_SIZE);
  const [showNewForm, setShowNewForm] = useState(false);
  const [activeList, setActiveList] = useState("pedidos");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [tipoFilter, setTipoFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [scope, setScope] = useState("todos");
  const [blScope, setBlScope] = useState("todos");

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const searchInputRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleKeyDown = (e) => {
      // BUG-13: ignora input, textarea, select E contentEditable (Quill/editores)
      const t = e.target;
      const isTyping = ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) || t.isContentEditable;
      if (e.key === "/" && !isTyping) {
        // GUARD: as abas usam forceMount, então o input existe mesmo invisível.
        // Só foca se estiver fisicamente visível na tela (aba ativa).
        const input = searchInputRef.current;
        if (input && input.offsetParent !== null) {
          e.preventDefault();
          input.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // BUG-12: carregamento incremental em lotes de PAGE_SIZE com "Carregar mais"
  // explícito — substitui o teto silencioso de 500. Métricas e filtros sempre
  // refletem exatamente o que está carregado (truncação visível, não oculta).
  const { data: pedidos = [], isLoading, isError, isFetching } = useQuery({
    queryKey: ["pedidos-internos", workshopId, listLimit],
    queryFn: async () => {
      const all = workshopId ?
      await base44.entities.PedidoInterno.filter({ workshop_id: workshopId }, "-created_date", listLimit) :
      await base44.entities.PedidoInterno.list("-created_date", listLimit);
      return all || [];
    },
    retry: false,
  });

  // REMOVIDO: query usuarios-sistema (User.list) — era dead code (resultado nunca
  // usado) e disparava 403 "Only collaborators can view the list of users" para
  // admins não-internos. Nomes dos usuários são resolvidos via useEmployeeResolver.

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

      if (priorityFilter !== "all" && p.prioridade !== priorityFilter) return false;
      if (tipoFilter !== "all" && p.tipo !== tipoFilter) return false;
      if (assigneeFilter !== "all" && p.assignee_id !== assigneeFilter) return false;

      const q = deferredSearch.toLowerCase();
      if (q) {
        const haystack = [
        p.titulo, p.workshop_nome, p.requester_name,
        p.assignee_name, p.codigo].
        filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      return true;
    }).
    sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));
  }, [pedidos, deferredSearch, statusFilter, priorityFilter, tipoFilter, assigneeFilter, scope, user?.id, user?.email]);

  // Opções de responsável derivadas dos próprios pedidos (sem query extra).
  const assigneeOptions = useMemo(() => {
    const seen = new Set();
    const out = [];
    pedidos.forEach(p => {
      if (p.assignee_id && p.assignee_name && !seen.has(p.assignee_id)) {
        seen.add(p.assignee_id);
        out.push({ value: p.assignee_id, label: p.assignee_name });
      }
    });
    return out.sort((a, b) => a.label.localeCompare(b.label));
  }, [pedidos]);

  const freshSelected = useMemo(() => {
    if (!selectedPedido) return null;
    // BUG-02: sem fallback para o snapshot — se o pedido sumir da lista,
    // freshSelected é null e o efeito abaixo fecha o Detail (sem fantasma).
    return pedidos.find((p) => p.id === selectedPedido.id) || null;
  }, [selectedPedido, pedidos]);

  // BUG-02: lista carregada sem erro + pedido selecionado desaparecido
  // (excluído por outro usuário) → fecha o Detail e informa o usuário.
  useEffect(() => {
    if (selectedPedido && !isLoading && !isError && !freshSelected) {
      toast.error("Este pedido não está mais disponível. Ele pode ter sido excluído ou removido por outro usuário.");
      setSelectedPedido(null);
    }
  }, [selectedPedido, freshSelected, isLoading, isError]);

  // BUG-12: semeia o próximo cache com os dados atuais (sem skeleton) e amplia o lote.
  const maybeMore = pedidos.length >= listLimit;
  const handleLoadMore = () => {
    queryClient.setQueryData(["pedidos-internos", workshopId, listLimit + PAGE_SIZE], pedidos);
    setListLimit((l) => l + PAGE_SIZE);
  };

  const handleSelect = useCallback((p) => setSelectedPedido(p), []);

  // BUG-01: abre o NovoPedidoModal em modo edição a partir do Detail.
  const handleEditPedido = useCallback((p) => {
    setEditingPedido(p);
    setShowNewForm(true);
  }, []);

  const handleDetailClose = useCallback(() => {
    setSelectedPedido(null);
    queryClient.invalidateQueries({ queryKey: ["pedidos-internos"] });
  }, [queryClient]);

  const handleFormClose = useCallback(() => {
    setShowNewForm(false);
    setEditingPedido(null);
    queryClient.invalidateQueries({ queryKey: ["pedidos-internos"] });
  }, [queryClient]);

  const clearFilters = () => {setSearch("");setStatusFilter("all");setScope("todos");setPriorityFilter("all");setTipoFilter("all");setAssigneeFilter("all");};
  const [showNovoTarefaModal, setShowNovoTarefaModal] = useState(false);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white rounded-lg border border-[hsl(var(--border-subtle))] shadow-[0_1px_2px_rgba(16,24,40,.04)]">
      
      {/* Modais de Detalhe e Criação */}
      <PedidoInternoModal open={!!freshSelected} onClose={() => setSelectedPedido(null)} size="wide">
        {freshSelected &&
        <PedidoInternoDetail
          key={freshSelected.id}
          pedido={freshSelected}
          user={user}
          onEdit={handleEditPedido}
          onCancel={() => setSelectedPedido(null)}
          onSuccess={handleDetailClose} />

        }
      </PedidoInternoModal>

      {showNewForm &&
      <NovoPedidoModal
        key={editingPedido?.id || "novo"}
        user={user}
        pedido={editingPedido}
        onClose={handleFormClose} />
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

    {/* Botão contextual por aba */}
    <div className="flex items-center h-full">
      {activeList === "pedidos" && (
        <Button
          onClick={() => { setEditingPedido(null); setShowNewForm(true); }}
          size="sm"
          className="h-8 bg-blue-600 hover:bg-blue-600/90 text-[12px] font-medium text-white rounded-md shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-blue-700/50 transition-all px-3 flex items-center justify-center"
        >
          <Plus className="mr-1.5 h-3 w-3 stroke-[2.5]" />
          Novo Pedido
        </Button>
      )}
      {activeList === "backlog" && (
        <Button
          onClick={() => setShowNovoTarefaModal(true)}
          size="sm"
          className="h-8 bg-blue-600 hover:bg-blue-600/90 text-[12px] font-medium text-white rounded-md shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-blue-700/50 transition-all px-3 flex items-center justify-center"
        >
          <Plus className="mr-1.5 h-3 w-3 stroke-[2.5]" />
          Nova tarefa
        </Button>
      )}
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
          priorityFilter={priorityFilter}
          setPriorityFilter={setPriorityFilter}
          tipoFilter={tipoFilter}
          setTipoFilter={setTipoFilter}
          assigneeFilter={assigneeFilter}
          setAssigneeFilter={setAssigneeFilter}
          assigneeOptions={assigneeOptions}
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

        {/* Toolbar de Filtros do Backlog — mesma posição/estilo do OrderFilterBar
            (abaixo das abas) para manter o padrão da UI e evitar layout shift. */}
        {activeList === "backlog" &&
        <div className="flex items-center gap-3 px-6 py-1.5 bg-gray-50/50 border-t border-[hsl(var(--border-subtle))] shrink-0">
          <BacklogScopeSelector value={blScope} onChange={setBlScope} />
        </div>
        }

        {/* Conteúdo da Lista de Pedidos */}
        <TabsContent value="pedidos" forceMount className={`mt-0 flex min-h-0 flex-1 flex-col bg-white ${activeList !== "pedidos" ? "hidden" : ""}`}>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {isError ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <AlertCircle className="mb-3 h-12 w-12 text-red-300" />
                <p className="text-sm font-medium text-red-500">Não foi possível carregar os pedidos</p>
                <p className="mt-1 text-xs text-gray-400">Verifique sua conexão e tente novamente.</p>
              </div>
            ) : (
              <>
                <PedidoInternoList pedidos={filteredPedidos} isLoading={isLoading} onSelect={handleSelect} selectedId={selectedPedido?.id} />
                {maybeMore && (
                  <div className="flex items-center justify-center gap-3 border-t border-gray-100 py-3">
                    <span className="text-[11px] text-gray-400">Mostrando {pedidos.length} pedidos</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleLoadMore}
                      disabled={isFetching}
                      className="h-7 gap-1 text-xs">
                      {isFetching && <Loader2 className="h-3 w-3 animate-spin" />}
                      Carregar mais
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </TabsContent>

        {/* Conteúdo do Backlog */}
        <TabsContent value="backlog" forceMount className={`mt-0 flex min-h-0 flex-1 flex-col overflow-hidden ${activeList !== "backlog" ? "hidden" : ""}`}>
          <BacklogBoard workshopId={workshopId} user={user} scope={blScope} />
        </TabsContent>

      {showNovoTarefaModal && (
        <NovoTarefaModal
          user={user}
          workshopId={workshopId}
          onClose={() => setShowNovoTarefaModal(false)}
        />
      )}
      </Tabs>
    </div>);

}