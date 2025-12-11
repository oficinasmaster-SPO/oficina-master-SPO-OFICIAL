import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  Target,
  BookOpen,
  FileText,
  Users,
  Package,
  ListTodo
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PainelCliente() {
  const navigate = useNavigate();
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Carregar usuário e workshop
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: workshop } = useQuery({
    queryKey: ['workshop-cliente', user?.workshop_id],
    queryFn: () => base44.entities.Workshop.get(user.workshop_id),
    enabled: !!user?.workshop_id
  });

  // Buscar próximas reuniões
  const { data: proximasReunioes = [] } = useQuery({
    queryKey: ['proximas-reunioes', workshop?.id],
    queryFn: async () => {
      const atendimentos = await base44.entities.ConsultoriaAtendimento.filter({
        workshop_id: workshop.id,
        status: ['agendado', 'confirmado']
      }, '-data_agendada', 5);
      return atendimentos;
    },
    enabled: !!workshop?.id,
    refetchInterval: autoRefresh ? 30000 : false
  });

  // Buscar cronograma
  const { data: cronograma = [] } = useQuery({
    queryKey: ['cronograma-cliente', workshop?.id],
    queryFn: async () => {
      const progresso = await base44.entities.CronogramaProgresso.filter({
        workshop_id: workshop.id
      }, 'ordem');
      return progresso;
    },
    enabled: !!workshop?.id
  });

  // Buscar tarefas pendentes (subtasks do plano de ação)
  const { data: tarefasPendentes = [] } = useQuery({
    queryKey: ['tarefas-pendentes-cliente', user?.id],
    queryFn: async () => {
      const subtasks = await base44.entities.Subtask.list();
      return subtasks.filter(s => 
        s.responsible_user_id === user.id && 
        s.status !== 'concluido'
      );
    },
    enabled: !!user?.id
  });

  // Calcular métricas
  const tarefasAtrasadas = tarefasPendentes.filter(t => 
    t.due_date && new Date(t.due_date) < new Date()
  ).length;

  const modulosPendentes = cronograma.filter(c => 
    c.situacao === 'nao_iniciado' || c.situacao === 'em_andamento'
  ).length;

  const modulosConcluidos = cronograma.filter(c => 
    c.situacao === 'concluido'
  ).length;

  const progressoGeral = cronograma.length > 0 
    ? Math.round((modulosConcluidos / cronograma.length) * 100) 
    : 0;

  // Verificar status de urgência
  const getUrgencia = (data) => {
    if (!data) return null;
    const dias = differenceInDays(new Date(data), new Date());
    if (dias < 0) return 'atrasado';
    if (dias <= 3) return 'urgente';
    if (dias <= 7) return 'proximo';
    return 'normal';
  };

  const getStatusColor = (situacao) => {
    const colors = {
      nao_iniciado: "bg-red-500 text-white",
      em_andamento: "bg-orange-500 text-white animate-pulse",
      concluido: "bg-green-500 text-white",
      cancelado: "bg-gray-400 text-white",
      atrasado: "bg-red-700 text-white animate-pulse font-bold"
    };
    return colors[situacao] || "bg-gray-100 text-gray-800";
  };

  if (!user || !workshop) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando painel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg p-6 shadow-lg">
        <h1 className="text-3xl font-bold mb-2">Painel do Cliente</h1>
        <p className="text-blue-100">Acompanhe seu progresso, tarefas e próximas reuniões</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Tarefas Atrasadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{tarefasAtrasadas}</div>
            <p className="text-xs opacity-90 mt-2">Requer atenção urgente</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Módulos Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{modulosPendentes}</div>
            <p className="text-xs opacity-90 mt-2">Do cronograma</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Progresso Geral</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{progressoGeral}%</div>
            <p className="text-xs opacity-90 mt-2">Do plano concluído</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Próximas Reuniões</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{proximasReunioes.length}</div>
            <p className="text-xs opacity-90 mt-2">Agendadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Painel Estilo Aeroporto - Tarefas Atrasadas */}
      {tarefasAtrasadas > 0 && (
        <Card className="border-2 border-red-500 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-red-500 to-red-600 text-white">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
              ALERTAS URGENTES - Tarefas Atrasadas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full bg-red-900 text-white">
                <thead>
                  <tr className="bg-red-800 border-b-2 border-yellow-500">
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase">Tarefa</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase">Prazo</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase">Dias Atrasado</th>
                    <th className="px-4 py-3 text-center text-xs font-bold uppercase">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {tarefasPendentes.filter(t => t.due_date && new Date(t.due_date) < new Date()).map((tarefa) => (
                    <tr key={tarefa.id} className="border-b border-red-700 hover:bg-red-800 animate-pulse">
                      <td className="px-4 py-3 text-sm font-semibold">{tarefa.title}</td>
                      <td className="px-4 py-3 text-sm">
                        {format(new Date(tarefa.due_date), "dd/MM/yyyy")}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-yellow-400">
                        {Math.abs(differenceInDays(new Date(tarefa.due_date), new Date()))} dias
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          size="sm"
                          className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
                          onClick={() => navigate(createPageUrl('PlanoAcao'))}
                        >
                          Ver Tarefa
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Próximas Reuniões */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-gray-800 to-gray-900 text-white">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Próximas Reuniões de Aceleração
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {proximasReunioes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>Nenhuma reunião agendada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full bg-gray-900 text-white">
                <thead>
                  <tr className="bg-gray-800 border-b-2 border-blue-500">
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase">Data/Hora</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase">Consultor</th>
                    <th className="px-4 py-3 text-center text-xs font-bold uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {proximasReunioes.map((reuniao, index) => {
                    const urgencia = getUrgencia(reuniao.data_agendada);
                    const rowColor = index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-850';
                    
                    return (
                      <tr key={reuniao.id} className={`border-b border-gray-700 hover:bg-gray-700 ${rowColor}`}>
                        <td className="px-4 py-3 text-sm font-semibold text-blue-400">
                          {reuniao.tipo_atendimento?.replace(/_/g, ' ').toUpperCase()}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="font-semibold">
                            {format(new Date(reuniao.data_agendada), "dd/MM/yyyy")}
                          </div>
                          <div className="text-xs text-gray-400">
                            {format(new Date(reuniao.data_agendada), "HH:mm")}h
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300">
                          {reuniao.consultor_nome}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge className={urgencia === 'urgente' ? 'bg-yellow-500 animate-pulse' : 'bg-blue-500'}>
                            {urgencia === 'urgente' ? 'PRÓXIMO' : reuniao.status.toUpperCase()}
                          </Badge>
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

      {/* Cronograma */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-gray-800 to-gray-900 text-white">
          <CardTitle className="flex items-center gap-2">
            <ListTodo className="w-5 h-5" />
            Cronograma do Plano - Etapas e Módulos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {cronograma.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>Nenhum cronograma disponível</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full bg-gray-900 text-white">
                <thead>
                  <tr className="bg-gray-800 border-b-2 border-purple-500">
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase">Módulo</th>
                    <th className="px-4 py-3 text-center text-xs font-bold uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase">Prazo</th>
                    <th className="px-4 py-3 text-center text-xs font-bold uppercase">Progresso</th>
                  </tr>
                </thead>
                <tbody>
                  {cronograma.map((modulo, index) => {
                    const rowColor = index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-850';
                    
                    return (
                      <tr key={modulo.id} className={`border-b border-gray-700 hover:bg-gray-700 ${rowColor}`}>
                        <td className="px-4 py-3 text-sm font-semibold text-purple-400">
                          {modulo.modulo_nome}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge className={getStatusColor(modulo.situacao)}>
                            {modulo.situacao?.replace(/_/g, ' ').toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300">
                          {modulo.data_conclusao_previsto 
                            ? format(new Date(modulo.data_conclusao_previsto), "dd/MM/yyyy")
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-center text-sm">
                          {modulo.atividades_previstas > 0 ? (
                            <span className="text-gray-300">
                              {modulo.atividades_realizadas || 0} / {modulo.atividades_previstas}
                            </span>
                          ) : '-'}
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

      {/* Ações Rápidas */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button
            variant="outline"
            className="h-20 flex-col"
            onClick={() => navigate(createPageUrl('PlanoAcao'))}
          >
            <Target className="w-6 h-6 mb-2" />
            <span className="text-xs">Minhas Tarefas</span>
          </Button>
          <Button
            variant="outline"
            className="h-20 flex-col"
            onClick={() => navigate(createPageUrl('CronogramaConsultoria'))}
          >
            <Calendar className="w-6 h-6 mb-2" />
            <span className="text-xs">Cronograma</span>
          </Button>
          <Button
            variant="outline"
            className="h-20 flex-col"
            onClick={() => navigate(createPageUrl('MeusTreinamentos'))}
          >
            <BookOpen className="w-6 h-6 mb-2" />
            <span className="text-xs">Treinamentos</span>
          </Button>
          <Button
            variant="outline"
            className="h-20 flex-col"
            onClick={() => navigate(createPageUrl('HistoricoMetas'))}
          >
            <TrendingUp className="w-6 h-6 mb-2" />
            <span className="text-xs">Metas</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}