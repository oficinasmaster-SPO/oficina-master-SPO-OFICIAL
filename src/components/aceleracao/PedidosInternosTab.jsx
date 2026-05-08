import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock, CheckCircle, AlertTriangle, FileText } from "lucide-react";
import PedidoInternoForm from "./PedidoInternoForm";
import PedidoInternoResponder from "./PedidoInternoResponder";
import BacklogDashboard from "./BacklogDashboard";
import PedidosFilters from "./PedidosFilters";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PedidosInternosTab({ workshopId, user }) {
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
    queryKey: ['pedidos-internos', workshopId],
    queryFn: async () => {
      const all = workshopId
        ? await base44.entities.PedidoInterno.filter({ cliente_id: workshopId }, '-created_date')
        : await base44.entities.PedidoInterno.list('-created_date');
      return all || [];
    },
    enabled: !!workshopId,
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

  // Responsável (não solicitante) vê tela de resposta
  if (showForm && editingPedido && editingPedido.responsavel_id === user?.id && editingPedido.solicitante_id !== user?.id) {
    return (
      <PedidoInternoResponder
        pedido={editingPedido}
        user={user}
        onCancel={() => { setShowForm(false); setEditingPedido(null); }}
        onSuccess={onFormClose}
      />
    );
  }

  if (showForm) {
    return (
      <PedidoInternoForm
        pedido={editingPedido}
        user={user}
        usuarios={usuarios}
        onCancel={() => { setShowForm(false); setEditingPedido(null); }}
        onSuccess={onFormClose}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="pedidos" className="w-full">
        <TabsContent value="pedidos" className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Pedido
            </Button>
          </div>

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
                  {filteredPedidos.filter(p => 
                    p.status !== 'concluido' && p.prazo &&
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
                  }).map((pedido) => {
                    const statusBadge = getStatusBadge(pedido.status);
                    const prioridadeBadge = getPrioridadeBadge(pedido.prioridade);
                    const impactoBadge = getImpactoBadge(pedido.impacto_cliente);
                    const hoje = new Date();
                    const isConcluido = ['concluido', 'recusado'].includes(pedido.status);
                    const isVencido = pedido.prazo && new Date(pedido.prazo) < hoje && !isConcluido;

                    return (
                      <button
                        key={pedido.id}
                        onClick={() => handleEdit(pedido)}
                        className={`w-full text-left rounded-xl border px-4 py-3 transition-all hover:shadow-md group ${
                          isVencido
                            ? "bg-red-50 border-red-200 hover:bg-red-100"
                            : isConcluido
                            ? "bg-gray-50 border-gray-200 hover:bg-gray-100"
                            : "bg-white border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        {/* Linha 1 */}
                        <div className="flex items-center gap-3 min-w-0">
                          <Badge className="text-[10px] px-1.5 py-0.5 flex-shrink-0 bg-gray-100 text-gray-700">
                            {getTipoLabel(pedido.tipo)}
                          </Badge>
                          <p className="flex-1 text-sm font-semibold text-gray-900 truncate" title={pedido.titulo}>
                            {pedido.titulo}
                          </p>
                          {pedido.solicitante_nome && (
                            <span className="text-xs text-gray-500 flex-shrink-0">{pedido.solicitante_nome}</span>
                          )}
                          {pedido.prazo && (
                            <span className={`flex items-center gap-1 text-xs flex-shrink-0 ${isVencido ? "text-red-600 font-semibold" : "text-gray-500"}`}>
                              <Clock className="w-3 h-3" />
                              {format(new Date(pedido.prazo), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          )}
                          <span className="text-gray-300 group-hover:text-gray-500 text-xs flex-shrink-0">›</span>
                        </div>
                        {/* Linha 2 */}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {pedido.cliente_nome && (
                            <span className="text-[11px] text-gray-500">Cliente: {pedido.cliente_nome}</span>
                          )}
                          {pedido.responsavel_nome && (
                            <span className="text-[11px] text-gray-500">· {pedido.responsavel_nome}</span>
                          )}
                          <span className="flex-1" />
                          <Badge className={`text-[10px] px-1.5 py-0.5 ${prioridadeBadge.className}`}>{prioridadeBadge.label}</Badge>
                          <Badge className={`text-[10px] px-1.5 py-0.5 ${impactoBadge.className}`}>{impactoBadge.label}</Badge>
                          <Badge className={`text-[10px] px-1.5 py-0.5 ${statusBadge.className}`}>{statusBadge.label}</Badge>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}