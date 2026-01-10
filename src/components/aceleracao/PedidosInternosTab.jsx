import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock, CheckCircle, AlertTriangle, FileText } from "lucide-react";
import PedidoInternoForm from "./PedidoInternoForm";
import BacklogDashboard from "./BacklogDashboard";
import PedidosFilters from "./PedidosFilters";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PedidosInternosTab({ user }) {
  const [showForm, setShowForm] = useState(false);
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
    queryKey: ['pedidos-internos'],
    queryFn: async () => {
      const all = await base44.entities.PedidoInterno.list('-created_date');
      return all || [];
    }
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
      queryClient.invalidateQueries(['pedidos-internos']);
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

  if (showForm) {
    return (
      <PedidoInternoForm
        pedido={editingPedido}
        user={user}
        usuarios={usuarios}
        onCancel={() => {
          setShowForm(false);
          setEditingPedido(null);
        }}
        onSuccess={() => {
          setShowForm(false);
          setEditingPedido(null);
          queryClient.invalidateQueries(['pedidos-internos']);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="pedidos" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pedidos">Pedidos Internos</TabsTrigger>
          <TabsTrigger value="backlog">Backlog de Tarefas</TabsTrigger>
        </TabsList>

        <TabsContent value="pedidos" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Pedidos Internos</h2>
              <p className="text-gray-600">Gerencie solicitações entre equipes e áreas</p>
            </div>
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Pedido
            </Button>
          </div>

          <PedidosFilters 
            filters={filters} 
            onFilterChange={setFilters}
            responsaveis={[...new Set(pedidos.map(p => p.responsavel_nome).filter(Boolean))].sort()}
          />

          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-600" />
                  Pendentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pedidosPorStatus.pendente.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Em Análise
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{pedidosPorStatus.em_analise.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Aprovados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{pedidosPorStatus.aprovado.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  Vencidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {pedidos.filter(p => 
                    p.status !== 'concluido' && 
                    new Date(p.prazo) < new Date()
                  ).length}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Lista de Pedidos</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-center text-gray-500 py-8">Carregando...</p>
              ) : pedidos.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Nenhum pedido cadastrado</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left p-3 text-sm font-semibold">Tipo</th>
                        <th className="text-left p-3 text-sm font-semibold">Título</th>
                        <th className="text-left p-3 text-sm font-semibold">Solicitante</th>
                        <th className="text-left p-3 text-sm font-semibold">Responsável</th>
                        <th className="text-center p-3 text-sm font-semibold">Prazo</th>
                        <th className="text-center p-3 text-sm font-semibold">Prioridade</th>
                        <th className="text-center p-3 text-sm font-semibold">Impacto</th>
                        <th className="text-center p-3 text-sm font-semibold">Status</th>
                        <th className="text-center p-3 text-sm font-semibold">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPedidos.map((pedido) => {
                        const statusBadge = getStatusBadge(pedido.status);
                        const prioridadeBadge = getPrioridadeBadge(pedido.prioridade);
                        const impactoBadge = getImpactoBadge(pedido.impacto_cliente);
                        const isVencido = new Date(pedido.prazo) < new Date() && pedido.status !== 'concluido';

                        return (
                          <tr key={pedido.id} className="border-b hover:bg-gray-50">
                            <td className="p-3">
                              <span className="text-sm font-medium">{getTipoLabel(pedido.tipo)}</span>
                            </td>
                            <td className="p-3">
                              <div>
                                <p className="font-medium">{pedido.titulo}</p>
                                {pedido.cliente_nome && (
                                  <p className="text-xs text-gray-600">Cliente: {pedido.cliente_nome}</p>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-sm">{pedido.solicitante_nome}</td>
                            <td className="p-3 text-sm">{pedido.responsavel_nome}</td>
                            <td className="p-3 text-center">
                              <span className={`text-sm ${isVencido ? 'text-red-600 font-semibold' : ''}`}>
                                {format(new Date(pedido.prazo), 'dd/MM/yyyy', { locale: ptBR })}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <Badge className={prioridadeBadge.className}>
                                {prioridadeBadge.label}
                              </Badge>
                            </td>
                            <td className="p-3 text-center">
                              <Badge className={impactoBadge.className}>
                                {impactoBadge.label}
                              </Badge>
                            </td>
                            <td className="p-3 text-center">
                              <Badge className={statusBadge.className}>
                                {statusBadge.label}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <div className="flex gap-2 justify-center">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEdit(pedido)}
                                >
                                  Ver
                                </Button>
                                {pedido.status !== 'concluido' && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleChangeStatus(pedido.id, 'concluido')}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    Concluir
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backlog">
          <BacklogDashboard user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}