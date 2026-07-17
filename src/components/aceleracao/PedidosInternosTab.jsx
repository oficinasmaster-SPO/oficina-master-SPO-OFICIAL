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

      <Tabs value={activeList} onValueChange={setActiveList} className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mb-3 shrink-0 bg-gray-100 rounded-lg p-1">
          <TabsTrigger value="pedidos" className="text-sm rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Pedidos Internos
          </TabsTrigger>
          <TabsTrigger value="backlog" className="text-sm rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Backlog de Tarefas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="backlog" forceMount className={`mt-0 min-h-0 flex-1 ${activeList !== "backlog" ? "hidden" : "animate-in fade-in duration-200"}`}>
          <BacklogBoard workshopId={workshopId} user={user} />
        </TabsContent>

        <TabsContent value="pedidos" forceMount className={`mt-0 min-h-0 flex-1 flex-col ${activeList !== "pedidos" ? "hidden" : "flex animate-in fade-in duration-200"}`}>
          {/* Toolbar */}
          <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar pedidos..."
                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px] shrink-0 rounded-lg border-gray-200 bg-gray-50 text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {PEDIDO_STATUS_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="ml-auto text-xs text-gray-400">
              {filteredPedidos.length} {filteredPedidos.length === 1 ? "pedido" : "pedidos"}
            </div>

            <Button onClick={() => setShowNewForm(true)} size="sm" className="gap-2 bg-blue-600 shadow-sm hover:bg-blue-700">
              <Plus className="h-4 w-4" />
              Novo Pedido
            </Button>
          </div>

          {/* List */}
          <div className="scrollbar-thin scrollbar-stable min-h-0 flex-1 overflow-y-auto bg-white">
            <PedidoInternoList
              pedidos={filteredPedidos}
              onSelect={handleEdit}
              isLoading={isLoading}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}