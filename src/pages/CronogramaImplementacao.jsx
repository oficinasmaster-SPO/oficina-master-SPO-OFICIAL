import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, CheckCircle, Clock, Edit2, History, Loader2, TrendingUp } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function CronogramaImplementacao() {
  const queryClient = useQueryClient();
  const [editingItem, setEditingItem] = useState(null);
  const [showHistory, setShowHistory] = useState(null);
  const [filterStatus, setFilterStatus] = useState("todos");
  const [filterTipo, setFilterTipo] = useState("todos");

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: workshop } = useQuery({
    queryKey: ['workshop', user?.workshop_id],
    queryFn: async () => {
      if (user?.workshop_id) {
        return await base44.entities.Workshop.get(user.workshop_id);
      }
      const workshops = await base44.entities.Workshop.filter({ owner_id: user.id });
      return workshops[0];
    },
    enabled: !!user
  });

  const { data: cronograma = [], isLoading } = useQuery({
    queryKey: ['cronograma-implementacao', workshop?.id],
    queryFn: async () => {
      return await base44.entities.CronogramaImplementacao.filter(
        { workshop_id: workshop.id },
        '-data_inicio_real'
      );
    },
    enabled: !!workshop?.id
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const item = cronograma.find(c => c.id === id);
      const historicoAtualizado = [...(item.historico_alteracoes || [])];
      
      // Registrar alterações no histórico
      Object.keys(data).forEach(campo => {
        if (campo !== 'historico_alteracoes' && item[campo] !== data[campo]) {
          historicoAtualizado.push({
            data_alteracao: new Date().toISOString(),
            campo_alterado: campo,
            valor_anterior: String(item[campo] || ''),
            valor_novo: String(data[campo] || ''),
            usuario_id: user.id,
            usuario_nome: user.full_name
          });
        }
      });

      return await base44.entities.CronogramaImplementacao.update(id, {
        ...data,
        historico_alteracoes: historicoAtualizado
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['cronograma-implementacao']);
      toast.success('Item atualizado com sucesso!');
      setEditingItem(null);
    }
  });

  const getStatusColor = (status) => {
    const colors = {
      a_fazer: "bg-gray-100 text-gray-700",
      em_andamento: "bg-blue-100 text-blue-700",
      concluido: "bg-green-100 text-green-700"
    };
    return colors[status] || colors.a_fazer;
  };

  const getStatusLabel = (status) => {
    const labels = {
      a_fazer: "A Fazer",
      em_andamento: "Em Andamento",
      concluido: "Concluído"
    };
    return labels[status] || status;
  };

  const getDiasRestantes = (dataTerminoPrevisto) => {
    const dias = differenceInDays(new Date(dataTerminoPrevisto), new Date());
    if (dias < 0) return { dias: Math.abs(dias), atrasado: true };
    return { dias, atrasado: false };
  };

  const filteredItems = cronograma.filter(item => {
    if (filterStatus !== "todos" && item.status !== filterStatus) return false;
    if (filterTipo !== "todos" && item.item_tipo !== filterTipo) return false;
    return true;
  });

  const stats = {
    total: cronograma.length,
    concluidos: cronograma.filter(i => i.status === 'concluido').length,
    em_andamento: cronograma.filter(i => i.status === 'em_andamento').length,
    atrasados: cronograma.filter(i => {
      if (i.status === 'concluido') return false;
      return differenceInDays(new Date(i.data_termino_previsto), new Date()) < 0;
    }).length
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cronograma de Implementação</h1>
          <p className="text-gray-600 mt-2">
            Acompanhe o progresso da implementação das ferramentas e processos
          </p>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Total de Itens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-600" />
              Em Andamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.em_andamento}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Concluídos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.concluidos}</div>
            <p className="text-xs text-gray-600 mt-1">
              {stats.total > 0 ? Math.round((stats.concluidos / stats.total) * 100) : 0}% do total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4 text-red-600" />
              Atrasados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.atrasados}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Status</SelectItem>
                  <SelectItem value="a_fazer">A Fazer</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Tipos</SelectItem>
                  <SelectItem value="processo">Processos</SelectItem>
                  <SelectItem value="diagnostico">Diagnósticos</SelectItem>
                  <SelectItem value="ferramenta">Ferramentas</SelectItem>
                  <SelectItem value="teste">Testes</SelectItem>
                  <SelectItem value="modulo">Módulos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Itens */}
      <Card>
        <CardContent className="pt-6">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">
                Nenhum item iniciado ainda. Acesse as ferramentas e processos para começar!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item) => {
                const diasRestantes = getDiasRestantes(item.data_termino_previsto);
                
                return (
                  <div key={item.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">{item.item_nome}</h3>
                          <Badge className={getStatusColor(item.status)}>
                            {getStatusLabel(item.status)}
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {item.item_tipo}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-sm mt-3">
                          <div>
                            <p className="text-gray-600 mb-1">Início Real</p>
                            <p className="font-medium">
                              {format(new Date(item.data_inicio_real), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600 mb-1">Término Previsto</p>
                            <p className="font-medium">
                              {format(new Date(item.data_termino_previsto), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                            {item.status !== 'concluido' && (
                              <p className={`text-xs ${diasRestantes.atrasado ? 'text-red-600' : 'text-gray-600'}`}>
                                {diasRestantes.atrasado ? `${diasRestantes.dias} dias atrasado` : `${diasRestantes.dias} dias restantes`}
                              </p>
                            )}
                          </div>
                          <div>
                            <p className="text-gray-600 mb-1">Término Real</p>
                            <p className="font-medium">
                              {item.data_termino_real 
                                ? format(new Date(item.data_termino_real), "dd/MM/yyyy", { locale: ptBR })
                                : '-'
                              }
                            </p>
                          </div>
                        </div>

                        {item.observacoes && (
                          <p className="text-sm text-gray-600 mt-2">{item.observacoes}</p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingItem(item)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        {item.historico_alteracoes?.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowHistory(item)}
                          >
                            <History className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Edição */}
      {editingItem && (
        <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Item: {editingItem.item_nome}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <Select
                  value={editingItem.status}
                  onValueChange={(value) => setEditingItem({ ...editingItem, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="a_fazer">A Fazer</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Data Término Previsto</label>
                <Input
                  type="date"
                  value={editingItem.data_termino_previsto?.split('T')[0]}
                  onChange={(e) => setEditingItem({ 
                    ...editingItem, 
                    data_termino_previsto: new Date(e.target.value).toISOString() 
                  })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Data Término Real</label>
                <Input
                  type="date"
                  value={editingItem.data_termino_real?.split('T')[0] || ''}
                  onChange={(e) => setEditingItem({ 
                    ...editingItem, 
                    data_termino_real: e.target.value ? new Date(e.target.value).toISOString() : null
                  })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Progresso (%)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={editingItem.progresso_percentual || 0}
                  onChange={(e) => setEditingItem({ 
                    ...editingItem, 
                    progresso_percentual: parseInt(e.target.value) 
                  })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Observações</label>
                <Textarea
                  value={editingItem.observacoes || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, observacoes: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setEditingItem(null)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={() => updateMutation.mutate({ 
                    id: editingItem.id, 
                    data: {
                      status: editingItem.status,
                      data_termino_previsto: editingItem.data_termino_previsto,
                      data_termino_real: editingItem.data_termino_real,
                      progresso_percentual: editingItem.progresso_percentual,
                      observacoes: editingItem.observacoes
                    }
                  })}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de Histórico */}
      {showHistory && (
        <Dialog open={!!showHistory} onOpenChange={() => setShowHistory(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Histórico de Alterações</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-3">
              {showHistory.historico_alteracoes?.map((hist, idx) => (
                <div key={idx} className="border-l-2 border-blue-500 pl-3 py-2">
                  <p className="text-sm font-medium">{hist.campo_alterado}</p>
                  <p className="text-xs text-gray-600">
                    {hist.valor_anterior} → {hist.valor_novo}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {format(new Date(hist.data_alteracao), "dd/MM/yyyy HH:mm", { locale: ptBR })} - {hist.usuario_nome}
                  </p>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}