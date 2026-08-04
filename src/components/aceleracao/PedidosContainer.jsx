import React, { useState, useMemo } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import Combobox from '@/components/ui/combobox';
import OrderFilterBar from './OrderFilterBar';
import PedidoInternoModal from './PedidoInternoModal';
import PedidoInternoDetail from './PedidoInternoDetail';
import NovoPedidoModal from './NovoPedidoModal';
import PedidoInternoList from './PedidoInternoList';
import BacklogBoard from './BacklogBoard';
import useEmployeeResolver from '@/hooks/useEmployeeResolver';
import { PRIORIDADE_OPTIONS, ORIGIN_OPTIONS } from '@/components/shared/backlogConstants';

export default function PedidosContainer({
  selectedPedido,
  setSelectedPedido,
  freshSelected,
  user,
  handleDetailClose,
  showNewForm,
  editingPedido,
  setEditingPedido,
  setShowNewForm,
  handleFormClose,
  activeList,
  setActiveList,
  metrics,
  scope,
  setScope,
  search,
  setSearch,
  searchInputRef,
  clearFilters,
  statusFilter,
  setStatusFilter,
  filteredPedidos,
  isLoading,
  handleSelect,
  workshopId
}) {
  // ── Estado e dados do Backlog de Tarefas ──────────────────────────────────
  const [blSearch, setBlSearch] = useState("");
  const [blConsultor, setBlConsultor] = useState("all");
  const [blCliente, setBlCliente] = useState("all");
  const [blPrioridade, setBlPrioridade] = useState("all");
  const [blOrigem, setBlOrigem] = useState("all");
  const [showNovoTarefaModal, setShowNovoTarefaModal] = useState(false);

  const { data: tarefas = [], isLoading: tarefasLoading } = useQuery({
    queryKey: ["tarefas-backlog", workshopId],
    queryFn: async () => {
      const all = workshopId
        ? await base44.entities.TarefaBacklog.filter({ workshop_id: workshopId }, "-prazo", 300)
        : await base44.entities.TarefaBacklog.list("-prazo", 300);
      return all || [];
    },
  });

  const { getName } = useEmployeeResolver();

  const hoje = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);

  const consultoresUnicos = useMemo(
    () => [...new Set(tarefas.map((t) => getName(t.assignee_id, t.assignee_name)).filter(Boolean))].sort(),
    [tarefas, getName]
  );
  const clientesUnicos = useMemo(
    () => [...new Set(tarefas.map((t) => t.workshop_nome).filter(Boolean))].sort(),
    [tarefas]
  );

  const blFiltered = useMemo(() => tarefas.filter((t) => {
    const resolvedName = getName(t.assignee_id, t.assignee_name);
    const q = blSearch.toLowerCase();
    const matchSearch = !q || t.titulo?.toLowerCase().includes(q) || t.workshop_nome?.toLowerCase().includes(q) || resolvedName?.toLowerCase().includes(q) || t.assignee_name?.toLowerCase().includes(q);
    return matchSearch
      && (blConsultor === "all" || resolvedName === blConsultor)
      && (blCliente === "all" || t.workshop_nome === blCliente)
      && (blPrioridade === "all" || t.prioridade === blPrioridade)
      && (blOrigem === "all" || t.origin_type === blOrigem);
  }), [tarefas, blSearch, blConsultor, blCliente, blPrioridade, blOrigem, getName]);

  const ativos = useMemo(() => tarefas.filter((t) => t.status !== "concluida"), [tarefas]);
  const blKpis = useMemo(() => ({
    total: ativos.length,
    criticas: ativos.filter((t) => t.prioridade === "critica").length,
    vencidas: ativos.filter((t) => t.prazo && new Date(t.prazo) < hoje).length,
    aguardando: ativos.filter((t) => t.status === "aguardando_cliente").length,
  }), [ativos, hoje]);

  const blHasFilters = blSearch || blConsultor !== "all" || blCliente !== "all" || blPrioridade !== "all" || blOrigem !== "all";
  const blClearFilters = () => { setBlSearch(""); setBlConsultor("all"); setBlCliente("all"); setBlPrioridade("all"); setBlOrigem("all"); };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white rounded-lg border border-[hsl(var(--border-subtle))] shadow-[0_1px_2px_rgba(16,24,40,.04)]">
      
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
        <div className="shrink-0 bg-[hsl(var(--surface))] px-6 pt-3 border-b border-[hsl(var(--border-subtle))] flex items-center justify-between shadow-[0_1px_2px_rgba(16,24,40,.04)] rounded-t-lg">
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

          {activeList === "backlog" && (
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-3 text-xs font-medium text-gray-600">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500"></span> {blKpis.total} ativas</span>
                {blKpis.criticas > 0 && <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500"></span> {blKpis.criticas} críticas</span>}
                {blKpis.vencidas > 0 && <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500"></span> {blKpis.vencidas} vencidas</span>}
                {blKpis.aguardando > 0 && <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400"></span> {blKpis.aguardando} aguardando</span>}
              </div>
              <Button
                onClick={() => setShowNovoTarefaModal(true)}
                size="sm"
                className="h-8 px-4 bg-blue-600 hover:bg-blue-700 text-xs font-bold shadow-sm"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Nova tarefa
              </Button>
            </div>
          )}
        </div>

        {/* Toolbar de Filtros */}
        {activeList === "pedidos" && (
          <OrderFilterBar
            scope={scope}
            setScope={setScope}
            search={search}
            setSearch={setSearch}
            searchInputRef={searchInputRef}
            clearFilters={clearFilters}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            filteredPedidos={filteredPedidos}
          />
        )}

        {activeList === "backlog" && (
          <div className="flex items-center gap-2 px-6 py-1.5 bg-gray-50/50 border-t border-[hsl(var(--border-subtle))] shrink-0">
            <div className="relative w-[300px]">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={blSearch}
                onChange={(e) => setBlSearch(e.target.value)}
                placeholder="Buscar tarefas..."
                className="h-8 w-full rounded-md border border-[hsl(var(--border-subtle))] bg-[hsl(var(--surface-subtle))] pl-9 pr-9 text-[12.5px] text-gray-800 placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
              />
              {blSearch && (
                <button onClick={blClearFilters} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Combobox value={blConsultor} onChange={setBlConsultor} options={[{ value: "all", label: "Todos consultores" }, ...consultoresUnicos.map((c) => ({ value: c, label: c }))]} clearValue="all" placeholder="Consultor" searchPlaceholder="Pesquisar consultor..." emptyText="Nenhum consultor." className="h-8 w-[150px]" />
            <Combobox value={blCliente} onChange={setBlCliente} options={[{ value: "all", label: "Todos clientes" }, ...clientesUnicos.map((c) => ({ value: c, label: c }))]} clearValue="all" placeholder="Cliente" searchPlaceholder="Pesquisar cliente..." emptyText="Nenhum cliente." className="h-8 w-[150px]" />
            <Combobox value={blPrioridade} onChange={setBlPrioridade} options={[{ value: "all", label: "Toda prioridade" }, ...PRIORIDADE_OPTIONS]} clearValue="all" placeholder="Prioridade" searchPlaceholder="Pesquisar prioridade..." emptyText="Nenhuma prioridade." className="h-8 w-[130px]" />
            <Combobox value={blOrigem} onChange={setBlOrigem} options={[{ value: "all", label: "Toda origem" }, ...ORIGIN_OPTIONS]} clearValue="all" placeholder="Origem" searchPlaceholder="Pesquisar origem..." emptyText="Nenhuma origem." className="h-8 w-[140px]" />
            {blHasFilters && (
              <Button variant="ghost" size="sm" onClick={blClearFilters} className="h-8 gap-1 text-xs text-gray-500">
                <X className="h-3 w-3" /> Limpar
              </Button>
            )}
            <div className="flex-1" />
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-200/80 rounded-md shadow-sm">
              <span className="text-[12px] font-bold text-gray-700">{blFiltered.length}</span>
              <span className="text-[12px] font-medium text-gray-500">{blFiltered.length === 1 ? "tarefa" : "tarefas"}</span>
            </div>
          </div>
        )}

        {/* Conteúdo da Lista de Pedidos */}
        <TabsContent value="pedidos" forceMount className={`mt-0 flex min-h-0 flex-1 flex-col bg-white ${activeList !== "pedidos" ? "hidden" : ""}`}>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <PedidoInternoList pedidos={filteredPedidos} isLoading={isLoading} onSelect={handleSelect} selectedId={selectedPedido?.id} />
          </div>
        </TabsContent>

        {/* Conteúdo do Backlog */}
        <TabsContent value="backlog" forceMount className={`mt-0 flex min-h-0 flex-1 flex-col overflow-hidden ${activeList !== "backlog" ? "hidden" : ""}`}>
          <BacklogBoard
            workshopId={workshopId}
            user={user}
            tarefas={blFiltered}
            isLoading={tarefasLoading}
            hasFilters={blHasFilters}
            onClearFilters={blClearFilters}
            showNovoTarefaModal={showNovoTarefaModal}
            setShowNovoTarefaModal={setShowNovoTarefaModal}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}