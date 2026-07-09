import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock, CheckCircle, AlertTriangle, FileText, CheckCheck } from "lucide-react";
import PedidoInternoForm from "./PedidoInternoForm";
import PedidoInternoResponder from "./PedidoInternoResponder";
import BacklogDashboard from "./BacklogDashboard";
import PedidosFilters from "./PedidosFilters";
import PedidoInternoCard from "./PedidoInternoCard";
import AccelerationKpi from "./AccelerationKpi";
import PedidoInternoModal from "./PedidoInternoModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PedidosInternosTab({ workshopId, user }) {
  const [showForm, setShowForm] = useState(false);
  const [activeList, setActiveList] = useState("pedidos");
  const [editingPedido, setEditingPedido] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    responsavel: 'all',
    status: 'all',
    prioridade: 'all',
    tipo: 'all'
  });
  const queryClient = useQueryClient();

  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ['pedidos-internos', workshopId],
    queryFn: async () => {
      const all = workshopId
        ? await base44.entities.PedidoInterno.filter({ cliente_id: workshopId }, '-created_date')
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

  const getStatusBadge = (status) => {
    const badges = {
      pendente: { label: "Pendente", className: "bg-gray-100 text-gray-800" },
      em_analise: { label: "Em Análise", className: "bg-blue-100 text-blue-800" },
      aprovado: { label: "Aprovado", className: "bg-green-100 text-green-800" },
      recusado: { label: "Recusado", className: "bg-red-100 text-red-800" },
      concluido: { label: "Concluído", className: "bg-purple-100 text-purple-800" }
    };
    return badges[status] || badges.pendente;
  };

  const getPrioridadeBadge = (prioridade) => {
    const badges = {
      baixa: { label: "Baixa", className: "bg-blue-100 text-blue-800" },
      media: { label: "Média", className: "bg-yellow-100 text-yellow-800" },
      alta: { label: "Alta", className: "bg-orange-100 text-orange-800" },
      critica: { label: "Crítica", className: "bg-red-100 text-red-800" }
    };
    return badges[prioridade] || badges.media;
  };

  const getImpactoBadge = (impacto) => {
    const badges = {
      nenhum: { label: "Nenhum", className: "bg-gray-100 text-gray-700" },
      baixo: { label: "Baixo", className: "bg-blue-100 text-blue-700" },
      medio: { label: "Médio", className: "bg-yellow-100 text-yellow-700" },
      alto: { label: "Alto", className: "bg-orange-100 text-orange-700" },
      critico: { label: "Crítico", className: "bg-red-100 text-red-700" }
    };
    return badges[impacto] || badges.medio;
  };

  const getTipoLabel = (tipo) => {
    const tipos = {
      apoio_tecnico: "Apoio Técnico",
      decisao_estrategica: "Decisão Estratégica",
      liberacao_material: "Liberação de Material",
      excecao_escopo: "Exceção de Escopo",
      outros: "Outros"
    };
    return tipos[tipo] || tipo;
  };

  const handleEdit = (pedido) => {
    setEditingPedido(pedido);
    setShowForm(true);
  };

  // Responsável vê tela de resposta; solicitante/admin vê tela de edição
  const isResponsavel = (pedido) =>
    pedido.responsavel_id === user?.id && pedido.solicitante_id !== user?.id;

  const handleChangeStatus = async (pedidoId, newStatus) => {
    const updateData = { status: newStatus };
    if (newStatus === 'concluido') {
      updateData.data_conclusao = new Date().toISOString();
    }
    await updatePedidoMutation.mutateAsync({ id: pedidoId, data: updateData });
  };

  const filteredPedidos = pedidos.filter(p => {
    const matchSearch = filters.search === '' || 
      p.titulo?.toLowerCase().includes(filters.search.toLowerCase()) ||
      p.cliente_nome?.toLowerCase().includes(filters.search.toLowerCase());
    const matchResponsavel = filters.responsavel === 'all' || p.responsavel_nome === filters.responsavel;
    const matchStatus = filters.status === 'all' || p.status === filters.status;
    const matchPrioridade = filters.prioridade === 'all' || p.prioridade === filters.prioridade;
    const matchTipo = filters.tipo === 'all' || p.tipo === filters.tipo;
    
    return matchSearch && matchResponsavel && matchStatus && matchPrioridade && matchTipo;
  });

  const pedidosPorStatus = {
    pendente: filteredPedidos.filter(p => p.status === 'pendente'),
    em_analise: filteredPedidos.filter(p => p.status === 'em_analise'),
    aprovado: filteredPedidos.filter(p => p.status === 'aprovado'),
    concluido: filteredPedidos.filter(p => p.status === 'concluido')
  };

  const onFormClose = () => {
    setShowForm(false);
    setEditingPedido(null);
    queryClient.invalidateQueries({ queryKey: ['pedidos-internos'] });
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <PedidoInternoModal open={showForm} onClose={() => { setShowForm(false); setEditingPedido(null); }}>
        {showForm && editingPedido && editingPedido.responsavel_id === user?.id && editingPedido.solicitante_id !== user?.id ? (
          <PedidoInternoResponder pedido={editingPedido} user={user} onCancel={() => { setShowForm(false); setEditingPedido(null); }} onSuccess={onFormClose} />
        ) : showForm ? (
          <PedidoInternoForm pedido={editingPedido} user={user} usuarios={usuarios} onCancel={() => { setShowForm(false); setEditingPedido(null); }} onSuccess={onFormClose} />
        ) : null}
      </PedidoInternoModal>

      <Tabs value={activeList} onValueChange={setActiveList} className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mb-4 shrink-0 bg-gray-100 rounded-lg p-1">
          <TabsTrigger value="pedidos" className="text-sm rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Pedidos Internos
          </TabsTrigger>
          <TabsTrigger value="backlog" className="text-sm rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Backlog de Tarefas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="backlog" forceMount className={`mt-0 min-h-0 flex-1 ${activeList !== "backlog" ? "hidden" : "animate-in fade-in duration-200"}`}>
          <BacklogDashboard workshopId={workshopId} user={user} />
        </TabsContent>

        <TabsContent value="pedidos" forceMount className={`mt-0 min-h-0 flex-1 flex-col gap-4 ${activeList !== "pedidos" ? "hidden" : "flex animate-in fade-in duration-200"}`}>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <AccelerationKpi icon={Clock} value={pedidosPorStatus.pendente.length} label="Pendentes" />
            <AccelerationKpi icon={FileText} value={pedidosPorStatus.em_analise.length} label="Em análise" tone="text-blue-700" iconTone="text-blue-500" />
            <AccelerationKpi icon={CheckCircle} value={pedidosPorStatus.aprovado.length} label="Aprovados" tone="text-green-700" iconTone="text-green-500" />
            <AccelerationKpi icon={AlertTriangle} value={filteredPedidos.filter(p => p.status !== 'concluido' && p.prazo && new Date(p.prazo) < new Date()).length} label="Vencidos" tone="text-amber-700" iconTone="text-amber-500" />
          </div>

          <div className="flex justify-end">
            <Button onClick={() => setShowForm(true)} className="gap-2 bg-blue-600 shadow-sm hover:bg-blue-700"><Plus className="h-4 w-4" />Novo pedido</Button>
          </div>

          <Card className="flex h-[760px] min-h-[760px] flex-none flex-col overflow-hidden rounded-2xl">
            <CardHeader className="shrink-0 border-b border-gray-100 py-4">
              <CardTitle>Lista de Pedidos</CardTitle>
            </CardHeader>
            <CardContent className="relative min-h-0 flex-1 p-0">
              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-5 bg-gradient-to-b from-white to-transparent" />
              <div className="scrollbar-stable scrollbar-thin h-full overflow-y-auto overflow-x-hidden scroll-smooth p-6">
              {isLoading ? (
                <p className="text-center text-gray-500 py-8">Carregando...</p>
              ) : filteredPedidos.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Nenhum pedido cadastrado</p>
              ) : (
                <div className="space-y-2">
                  {[...filteredPedidos].sort((a, b) => {
                    const hoje = new Date();
                    const isFimA = ['concluido', 'recusado'].includes(a.status);
                    const isFimB = ['concluido', 'recusado'].includes(b.status);
                    const isVencidoA = a.prazo && new Date(a.prazo) < hoje && !isFimA;
                    const isVencidoB = b.prazo && new Date(b.prazo) < hoje && !isFimB;
                    if (isFimA !== isFimB) return isFimA ? 1 : -1;
                    if (isVencidoA !== isVencidoB) return isVencidoA ? -1 : 1;
                    if (a.prazo && b.prazo) return new Date(a.prazo) - new Date(b.prazo);
                    return 0;
                  }).map((pedido) => (
                    <PedidoInternoCard
                      key={pedido.id}
                      pedido={pedido}
                      user={user}
                      onView={handleEdit}
                      onConclude={(id) => handleChangeStatus(id, 'concluido')}
                    />
                  ))}
                </div>
              )}
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-5 bg-gradient-to-t from-white to-transparent" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}