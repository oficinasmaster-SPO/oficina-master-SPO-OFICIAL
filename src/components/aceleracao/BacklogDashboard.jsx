import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, AlertCircle, TrendingUp, Clock } from "lucide-react";
import TarefaBacklogForm from "./TarefaBacklogForm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function BacklogDashboard({ user }) {
  const [showForm, setShowForm] = useState(false);
  const [editingTarefa, setEditingTarefa] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const queryClient = useQueryClient();

  const { data: tarefas = [], isLoading } = useQuery({
    queryKey: ['tarefas-backlog'],
    queryFn: async () => {
      const all = await base44.entities.TarefaBacklog.list('-prazo');
      return all || [];
    }
  });

  const { data: workshops = [] } = useQuery({
    queryKey: ['workshops-backlog'],
    queryFn: async () => {
      const all = await base44.entities.Workshop.list();
      return all || [];
    }
  });

  const updateTarefaMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.TarefaBacklog.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tarefas-backlog']);
    }
  });

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  // Backlog total = tarefas não concluídas
  const backlogTotal = tarefas.filter(t => t.status !== 'concluida');
  
  // Backlog crítico = tarefas vencidas e não concluídas
  const backlogCritico = tarefas.filter(t => 
    t.status !== 'concluida' && new Date(t.prazo) < hoje
  );

  // Backlog por consultor
  const backlogPorConsultor = {};
  backlogTotal.forEach(tarefa => {
    const consultor = tarefa.consultor_nome || 'Sem consultor';
    if (!backlogPorConsultor[consultor]) {
      backlogPorConsultor[consultor] = {
        total: 0,
        vencidas: 0,
        criticas: 0
      };
    }
    backlogPorConsultor[consultor].total++;
    if (new Date(tarefa.prazo) < hoje) {
      backlogPorConsultor[consultor].vencidas++;
    }
    if (tarefa.prioridade === 'critica') {
      backlogPorConsultor[consultor].criticas++;
    }
  });

  // Backlog por cliente
  const backlogPorCliente = {};
  backlogTotal.forEach(tarefa => {
    const cliente = tarefa.cliente_nome || 'Sem cliente';
    if (!backlogPorCliente[cliente]) {
      backlogPorCliente[cliente] = {
        total: 0,
        vencidas: 0,
        criticas: 0
      };
    }
    backlogPorCliente[cliente].total++;
    if (new Date(tarefa.prazo) < hoje) {
      backlogPorCliente[cliente].vencidas++;
    }
    if (tarefa.prioridade === 'critica') {
      backlogPorCliente[cliente].criticas++;
    }
  });

  const filteredTarefas = filterStatus === 'all' 
    ? backlogTotal 
    : tarefas.filter(t => t.status === filterStatus);

  const getPrioridadeBadge = (prioridade) => {
    const badges = {
      baixa: { label: "Baixa", className: "bg-blue-100 text-blue-800" },
      media: { label: "Média", className: "bg-yellow-100 text-yellow-800" },
      alta: { label: "Alta", className: "bg-orange-100 text-orange-800" },
      critica: { label: "Crítica", className: "bg-red-100 text-red-800" }
    };
    return badges[prioridade] || badges.media;
  };

  const getStatusBadge = (status) => {
    const badges = {
      aberta: { label: "Aberta", className: "bg-gray-100 text-gray-800" },
      em_execucao: { label: "Em Execução", className: "bg-blue-100 text-blue-800" },
      bloqueada: { label: "Bloqueada", className: "bg-red-100 text-red-800" },
      concluida: { label: "Concluída", className: "bg-green-100 text-green-800" }
    };
    return badges[status] || badges.aberta;
  };

  if (showForm) {
    return (
      <TarefaBacklogForm
        tarefa={editingTarefa}
        user={user}
        workshops={workshops}
        onCancel={() => {
          setShowForm(false);
          setEditingTarefa(null);
        }}
        onSuccess={() => {
          setShowForm(false);
          setEditingTarefa(null);
          queryClient.invalidateQueries(['tarefas-backlog']);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Backlog de Tarefas</h2>
          <p className="text-gray-600">Acompanhe todas as tarefas abertas e vencidas</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Nova Tarefa
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Backlog Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{backlogTotal.length}</div>
            <p className="text-xs text-gray-600">Tarefas não concluídas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              Backlog Crítico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{backlogCritico.length}</div>
            <p className="text-xs text-gray-600">Tarefas vencidas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-600" />
              % Crítico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {backlogTotal.length > 0 
                ? ((backlogCritico.length / backlogTotal.length) * 100).toFixed(0)
                : 0}%
            </div>
            <p className="text-xs text-gray-600">Do backlog total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Bloqueadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tarefas.filter(t => t.status === 'bloqueada').length}
            </div>
            <p className="text-xs text-gray-600">Tarefas impedidas</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Backlog por Consultor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(backlogPorConsultor).map(([consultor, stats]) => (
                <div key={consultor} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="font-medium">{consultor}</span>
                  <div className="flex gap-4 text-sm">
                    <span className="text-blue-600">Total: {stats.total}</span>
                    <span className="text-red-600">Vencidas: {stats.vencidas}</span>
                    <span className="text-orange-600">Críticas: {stats.criticas}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Backlog por Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(backlogPorCliente).slice(0, 10).map(([cliente, stats]) => (
                <div key={cliente} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="font-medium truncate max-w-[200px]">{cliente}</span>
                  <div className="flex gap-4 text-sm">
                    <span className="text-blue-600">Total: {stats.total}</span>
                    <span className="text-red-600">Vencidas: {stats.vencidas}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Lista de Tarefas</CardTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('all')}
              >
                Todas
              </Button>
              <Button
                size="sm"
                variant={filterStatus === 'aberta' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('aberta')}
              >
                Abertas
              </Button>
              <Button
                size="sm"
                variant={filterStatus === 'em_execucao' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('em_execucao')}
              >
                Em Execução
              </Button>
              <Button
                size="sm"
                variant={filterStatus === 'bloqueada' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('bloqueada')}
              >
                Bloqueadas
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-gray-500 py-8">Carregando...</p>
          ) : filteredTarefas.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Nenhuma tarefa encontrada</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3 text-sm font-semibold">Título</th>
                    <th className="text-left p-3 text-sm font-semibold">Cliente</th>
                    <th className="text-left p-3 text-sm font-semibold">Consultor</th>
                    <th className="text-center p-3 text-sm font-semibold">Origem</th>
                    <th className="text-center p-3 text-sm font-semibold">Prazo</th>
                    <th className="text-center p-3 text-sm font-semibold">Prioridade</th>
                    <th className="text-center p-3 text-sm font-semibold">Status</th>
                    <th className="text-center p-3 text-sm font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTarefas.map((tarefa) => {
                    const prioridadeBadge = getPrioridadeBadge(tarefa.prioridade);
                    const statusBadge = getStatusBadge(tarefa.status);
                    const isVencida = new Date(tarefa.prazo) < hoje && tarefa.status !== 'concluida';

                    return (
                      <tr key={tarefa.id} className={`border-b hover:bg-gray-50 ${isVencida ? 'bg-red-50' : ''}`}>
                        <td className="p-3">
                          <p className="font-medium">{tarefa.titulo}</p>
                          {tarefa.impacto && (
                            <p className="text-xs text-gray-600">Impacto: {tarefa.impacto}</p>
                          )}
                        </td>
                        <td className="p-3 text-sm">{tarefa.cliente_nome}</td>
                        <td className="p-3 text-sm">{tarefa.consultor_nome}</td>
                        <td className="p-3 text-center">
                          <Badge variant="outline" className="text-xs">
                            {tarefa.origem}
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`text-sm ${isVencida ? 'text-red-600 font-semibold' : ''}`}>
                            {format(new Date(tarefa.prazo), 'dd/MM/yyyy', { locale: ptBR })}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <Badge className={prioridadeBadge.className}>
                            {prioridadeBadge.label}
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          <Badge className={statusBadge.className}>
                            {statusBadge.label}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingTarefa(tarefa);
                              setShowForm(true);
                            }}
                          >
                            Editar
                          </Button>
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
    </div>
  );
}