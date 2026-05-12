import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, AlertCircle, TrendingUp, Clock } from "lucide-react";
import TarefaBacklogForm from "./TarefaBacklogForm";
import TarefaBacklogDetalhe from "./TarefaBacklogDetalhe";
import BacklogFilters from "./BacklogFilters";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function BacklogDashboard({ workshopId, user }) {
  const [showForm, setShowForm] = useState(false);
  const [editingTarefa, setEditingTarefa] = useState(null);
  const [viewingTarefa, setViewingTarefa] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    consultor: 'all',
    cliente: 'all',
    status: 'all',
    prioridade: 'all',
    origem: 'all'
  });
  const queryClient = useQueryClient();

  const { data: tarefas = [], isLoading } = useQuery({
    queryKey: ['tarefas-backlog', workshopId],
    queryFn: async () => {
      const all = workshopId
        ? await base44.entities.TarefaBacklog.filter({ cliente_id: workshopId }, '-prazo')
        : await base44.entities.TarefaBacklog.list('-prazo');
      return all || [];
    },
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

  const consultoresUnicos = useMemo(() => {
    return [...new Set(tarefas.map(t => t.consultor_nome).filter(Boolean))].sort();
  }, [tarefas]);

  const clientesUnicos = useMemo(() => {
    return [...new Set(tarefas.map(t => t.cliente_nome).filter(Boolean))].sort();
  }, [tarefas]);

  const filteredTarefas = backlogTotal.filter(t => {
    const matchSearch = filters.search === '' || 
      t.titulo?.toLowerCase().includes(filters.search.toLowerCase()) ||
      t.cliente_nome?.toLowerCase().includes(filters.search.toLowerCase());
    const matchConsultor = filters.consultor === 'all' || t.consultor_nome === filters.consultor;
    const matchCliente = filters.cliente === 'all' || t.cliente_nome === filters.cliente;
    const matchStatus = filters.status === 'all' || t.status === filters.status;
    const matchPrioridade = filters.prioridade === 'all' || t.prioridade === filters.prioridade;
    const matchOrigem = filters.origem === 'all' || t.origem === filters.origem;
    
    return matchSearch && matchConsultor && matchCliente && matchStatus && matchPrioridade && matchOrigem;
  });

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

  if (viewingTarefa) {
    return (
      <TarefaBacklogDetalhe
        tarefa={viewingTarefa}
        onVoltar={() => setViewingTarefa(null)}
        onEditar={(t) => {
          setViewingTarefa(null);
          setEditingTarefa(t);
          setShowForm(true);
        }}
      />
    );
  }

  if (showForm) {
    return (
      <TarefaBacklogForm
        tarefa={editingTarefa}
        user={user}
        workshops={workshops}
        workshopId={workshopId}
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
      <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
        <div className="flex items-center gap-1.5 pr-4 border-r border-gray-200">
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-xs text-gray-500">Total</span>
          <span className="text-sm font-bold text-blue-600">{backlogTotal.length}</span>
        </div>
        <div className="flex items-center gap-1.5 px-4 border-r border-gray-200">
          <AlertCircle className="w-3.5 h-3.5 text-red-400" />
          <span className="text-xs text-gray-500">Crítico</span>
          <span className="text-sm font-bold text-red-600">{backlogCritico.length}</span>
        </div>
        <div className="flex items-center gap-1.5 px-4 border-r border-gray-200">
          <TrendingUp className="w-3.5 h-3.5 text-orange-400" />
          <span className="text-xs text-gray-500">% Crítico</span>
          <span className="text-sm font-bold text-orange-600">
            {backlogTotal.length > 0 ? ((backlogCritico.length / backlogTotal.length) * 100).toFixed(0) : 0}%
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-4">
          <span className="text-xs text-gray-500">Bloqueadas</span>
          <span className="text-sm font-bold text-gray-800">{tarefas.filter(t => t.status === 'bloqueada').length}</span>
        </div>
        <div className="ml-auto">
          <Button onClick={() => setShowForm(true)} variant="outline" size="sm" className="gap-1.5 h-7 text-xs">
            <Plus className="w-3.5 h-3.5" />
            Nova Tarefa
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Tarefas ({filteredTarefas.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-gray-500 py-8">Carregando...</p>
          ) : filteredTarefas.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Nenhuma tarefa encontrada</p>
          ) : (
            <div className="space-y-2">
              {[...filteredTarefas].sort((a, b) => {
                const isVencidaA = a.prazo && new Date(a.prazo) < hoje;
                const isVencidaB = b.prazo && new Date(b.prazo) < hoje;
                if (isVencidaA !== isVencidaB) return isVencidaA ? -1 : 1;
                if (a.prazo && b.prazo) return new Date(a.prazo) - new Date(b.prazo);
                return 0;
              }).map((tarefa) => {
                const prioridadeBadge = getPrioridadeBadge(tarefa.prioridade);
                const statusBadge = getStatusBadge(tarefa.status);
                const isVencida = tarefa.prazo && new Date(tarefa.prazo) < hoje;

                return (
                  <button
                    key={tarefa.id}
                    onClick={() => setViewingTarefa(tarefa)}
                    className={`w-full text-left rounded-xl border px-4 py-3 transition-all hover:shadow-md group ${
                      isVencida
                        ? "bg-red-50 border-red-200 hover:bg-red-100"
                        : "bg-white border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {/* Linha 1 */}
                    <div className="flex items-center gap-3 min-w-0">
                      <p className="flex-1 text-sm font-semibold text-gray-900 truncate" title={tarefa.titulo}>
                        {tarefa.titulo}
                      </p>
                      {tarefa.cliente_nome && (
                        <span className="text-xs text-gray-500 flex-shrink-0">{tarefa.cliente_nome}</span>
                      )}
                      {tarefa.prazo && (
                        <span className={`flex items-center gap-1 text-xs flex-shrink-0 ${isVencida ? "text-red-600 font-semibold" : "text-gray-500"}`}>
                          <Clock className="w-3 h-3" />
                          {format(new Date(tarefa.prazo), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      )}
                      <span className="text-gray-300 group-hover:text-gray-500 text-xs flex-shrink-0">›</span>
                    </div>
                    {/* Linha 2 */}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {tarefa.consultor_nome && (
                        <span className="text-[11px] text-gray-500">{tarefa.consultor_nome}</span>
                      )}
                      {tarefa.impacto && (
                        <span className="text-[11px] text-gray-400">· {tarefa.impacto}</span>
                      )}
                      <span className="flex-1" />
                      {tarefa.origem && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">{tarefa.origem}</Badge>
                      )}
                      <Badge className={`text-[10px] px-1.5 py-0.5 ${prioridadeBadge.className}`}>{prioridadeBadge.label}</Badge>
                      <Badge className={`text-[10px] px-1.5 py-0.5 ${statusBadge.className}`}>{statusBadge.label}</Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}