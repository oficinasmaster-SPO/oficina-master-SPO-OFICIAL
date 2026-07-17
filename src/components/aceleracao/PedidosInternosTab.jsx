import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
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

export default function PedidosInternosTab({ workshopId, user }) {
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [activeList, setActiveList] = useState("pedidos");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ['pedidos-internos', workshopId],
    queryFn: async () => {
      const all = workshopId
        ? await base44.entities.PedidoInterno.filter({ workshop_id: workshopId }, '-created_date')
        : await base44.entities.PedidoInterno.list('-created_date');
      return all || [];
    },
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios-sistema'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users || [];
    }
  });

  const updatePedidoMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.PedidoInterno.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos-internos'] });
    }
  });

  const handleEdit = (pedido) => {
    setSelectedPedido(pedido);
  };

  const handleChangeStatus = async (pedidoId, newStatus) => {
    const updateData = { status: newStatus };
    if (newStatus === 'concluido') {
      updateData.data_conclusao = new Date().toISOString();
    }
    await updatePedidoMutation.mutateAsync({ id: pedidoId, data: updateData });
  };

  const filteredPedidos = useMemo(() => {
    return pedidos.filter(p => {
      const matchSearch = search === '' ||
        p.titulo?.toLowerCase().includes(search.toLowerCase()) ||
        p.workshop_nome?.toLowerCase().includes(search.toLowerCase()) ||
        p.requester_name?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchSearch && matchStatus;
    }).sort((a, b) => {
      const hoje = new Date();
      const isFimA = ['concluido', 'recusado'].includes(a.status);
      const isFimB = ['concluido', 'recusado'].includes(b.status);
      const isVencidoA = a.prazo && new Date(a.prazo) < hoje && !isFimA;
      const isVencidoB = b.prazo && new Date(b.prazo) < hoje && !isFimB;
      if (isFimA !== isFimB) return isFimA ? 1 : -1;
      if (isVencidoA !== isVencidoB) return isVencidoA ? -1 : 1;
      if (a.prazo && b.prazo) return new Date(a.prazo) - new Date(b.prazo);
      return 0;
    });
  }, [pedidos, search, statusFilter]);

  const onDetailClose = () => {
    setSelectedPedido(null);
    queryClient.invalidateQueries({ queryKey: ['pedidos-internos'] });
  };

  const onFormClose = () => {
    setShowNewForm(false);
    queryClient.invalidateQueries({ queryKey: ['pedidos-internos'] });
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* Modal de Detalhe */}
      <PedidoInternoModal open={!!selectedPedido} onClose={() => setSelectedPedido(null)} size="wide">
        {selectedPedido && (
          <PedidoInternoDetail
            pedido={selectedPedido}
            user={user}
            onCancel={() => setSelectedPedido(null)}
            onSuccess={onDetailClose}
            onDelete={onDetailClose}
          />
        )}
      </PedidoInternoModal>

      {/* Modal de Novo Pedido */}
      <PedidoInternoModal open={showNewForm} onClose={() => setShowNewForm(false)} size="default">
        {showNewForm && (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
            <PedidoInternoForm
              user={user}
              usuarios={usuarios}
              onCancel={() => setShowNewForm(false)}
              onSuccess={onFormClose}
            />
          </div>
        )}
      </PedidoInternoModal>

      <Tabs value={activeList} onValueChange={setActiveList} className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Header: tabs + ações contextuais */}
        <div className="flex shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 py-2">
          <TabsList className="h-8 gap-0.5 rounded-lg bg-gray-100 p-1">
            <TabsTrigger value="pedidos" className="h-6 rounded px-3 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Pedidos Internos
            </TabsTrigger>
            <TabsTrigger value="backlog" className="h-6 rounded px-3 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Backlog de Tarefas
            </TabsTrigger>
          </TabsList>

          {/* Toolbar de Pedidos — só visível na aba de pedidos */}
          {activeList === "pedidos" && (
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
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
                  {PEDIDO_STATUS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-gray-400">
                {filteredPedidos.length} {filteredPedidos.length === 1 ? "pedido" : "pedidos"}
              </span>
              <Button onClick={() => setShowNewForm(true)} size="sm" className="ml-auto h-8 gap-1.5 bg-blue-600 text-xs shadow-sm hover:bg-blue-700">
                <Plus className="h-3.5 w-3.5" />
                Novo Pedido
              </Button>
            </div>
          )}
        </div>

        <TabsContent value="backlog" forceMount className={`mt-0 min-h-0 flex-1 overflow-hidden flex flex-col ${activeList !== "backlog" ? "hidden" : "animate-in fade-in duration-200"}`}>
          <BacklogBoard workshopId={workshopId} user={user} />
        </TabsContent>

        <TabsContent value="pedidos" forceMount className={`mt-0 flex min-h-0 flex-1 flex-col overflow-hidden ${activeList !== "pedidos" ? "hidden" : "flex animate-in fade-in duration-200"}`}>
          {/* List — ocupa todo o espaço restante com scroll interno */}
          <div className="scrollbar-thin scrollbar-stable min-h-0 flex-1 overflow-y-auto bg-white">
            <PedidoInternoList
              pedidos={filteredPedidos}
              onSelect={handleEdit}
              isLoading={isLoading}
              selectedId={selectedPedido?.id}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}