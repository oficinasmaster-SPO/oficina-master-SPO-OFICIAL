import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, AlertCircle, TrendingUp, Clock, Play, CheckCircle } from "lucide-react";
import TarefaBacklogForm from "./TarefaBacklogForm";
import TarefaBacklogDetalhe from "./TarefaBacklogDetalhe";
import BacklogFilters from "./BacklogFilters";
import TarefaBacklogModal from "./TarefaBacklogModal";
import BacklogTaskCard from "./BacklogTaskCard";
import AccelerationKpi from "./AccelerationKpi";
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

  return (
    <div className="space-y-6">
      <TarefaBacklogModal
        open={showForm || !!viewingTarefa}
        onClose={() => {
          setShowForm(false);
          setEditingTarefa(null);
          setViewingTarefa(null);
        }}
      >
        {viewingTarefa ? (
          <TarefaBacklogDetalhe
            tarefa={viewingTarefa}
            user={user}
            onVoltar={() => setViewingTarefa(null)}
            onEditar={(t) => {
              setViewingTarefa(null);
              setEditingTarefa(t);
              setShowForm(true);
            }}
          />
        ) : showForm ? (
          <TarefaBacklogForm
            tarefa={editingTarefa}
            user={user}
            workshops={workshops}
            workshopId={workshopId}
            onCancel={() => { setShowForm(false); setEditingTarefa(null); }}
            onSuccess={() => {
              setShowForm(false);
              setEditingTarefa(null);
              queryClient.invalidateQueries(['tarefas-backlog']);
            }}
          />
        ) : null}
      </TarefaBacklogModal>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <AccelerationKpi icon={Clock} value={backlogTotal.length} label="Total" tone="text-blue-700" iconTone="text-blue-500" />
        <AccelerationKpi icon={AlertCircle} value={backlogCritico.length} label="Críticas" tone="text-red-700" iconTone="text-red-500" />
        <AccelerationKpi icon={TrendingUp} value={`${backlogTotal.length > 0 ? ((backlogCritico.length / backlogTotal.length) * 100).toFixed(0) : 0}%`} label="Críticas" tone="text-amber-700" iconTone="text-amber-500" />
        <AccelerationKpi value={tarefas.filter(t => t.status === 'bloqueada').length} label="Bloqueadas" />
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)} className="gap-2 bg-blue-600 shadow-sm hover:bg-blue-700"><Plus className="h-4 w-4" />Nova tarefa</Button>
      </div>

      <Card className="rounded-2xl">
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
              }).map((tarefa) => (
                <BacklogTaskCard
                  key={tarefa.id}
                  tarefa={tarefa}
                  user={user}
                  onView={setViewingTarefa}
                  onAction={(id, data) => updateTarefaMutation.mutate({ id, data })}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}