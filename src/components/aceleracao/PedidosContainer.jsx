import React from 'react';
import { Plus } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import OrderFilterBar from './OrderFilterBar';
import PedidoInternoModal from './PedidoInternoModal';
import PedidoInternoDetail from './PedidoInternoDetail';
import NovoPedidoModal from './NovoPedidoModal';
import PedidoInternoList from './PedidoInternoList';
import BacklogBoard from './BacklogBoard';

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
    </div>
  );
}