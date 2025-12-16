import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  AlertCircle, Clock, CheckCircle2, Circle, Search, Filter, X,
  TrendingUp, AlertTriangle, Calendar, User, ChevronRight, Loader2
} from "lucide-react";
import { differenceInDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";

export default function PainelAcoes() {
  const navigate = useNavigate();
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [filterResponsavel, setFilterResponsavel] = useState("todos");
  const [filterPrazo, setFilterPrazo] = useState("todos");
  const [filterParalisacao, setFilterParalisacao] = useState("todos");
  const [minhasAcoes, setMinhasAcoes] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: workshop } = useQuery({
    queryKey: ['workshop', user?.workshop_id],
    queryFn: async () => {
      if (!user) return null;
      if (user.workshop_id) {
        return await base44.entities.Workshop.get(user.workshop_id);
      }
      const workshops = await base44.entities.Workshop.filter({ owner_id: user.id });
      return workshops[0];
    },
    enabled: !!user
  });

  const { data: actions = [], isLoading } = useQuery({
    queryKey: ['all-actions'],
    queryFn: async () => {
      const allActions = await base44.entities.Action.list();
      return allActions.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    }
  });

  const { data: subtasks = [] } = useQuery({
    queryKey: ['all-subtasks'],
    queryFn: () => base44.entities.Subtask.list()
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', workshop?.id],
    queryFn: async () => {
      if (!workshop?.id) return [];
      return await base44.entities.Employee.filter({ workshop_id: workshop.id, status: 'ativo' });
    },
    enabled: !!workshop?.id
  });

  // Enriquecer ações com dados calculados
  const enrichedActions = useMemo(() => {
    return actions.map(action => {
      const actionSubtasks = subtasks.filter(s => s.action_id === action.id);
      const completedSubtasks = actionSubtasks.filter(s => s.status === 'concluido').length;
      const overdueSubtasks = actionSubtasks.filter(s => {
        if (s.status === 'concluido') return false;
        if (!s.due_date) return false;
        return differenceInDays(new Date(), new Date(s.due_date)) > 0;
      }).length;

      const createdDaysAgo = differenceInDays(new Date(), new Date(action.created_date));
      const updatedDaysAgo = differenceInDays(new Date(), new Date(action.updated_date));
      
      let prazoStatus = 'ok';
      if (action.due_date && action.status !== 'concluido') {
        const diasRestantes = differenceInDays(new Date(action.due_date), new Date());
        if (diasRestantes < 0) prazoStatus = 'atrasado';
        else if (diasRestantes <= 3) prazoStatus = 'proximo';
      }

      const responsible = actionSubtasks.length > 0 && actionSubtasks[0].responsible_user_id
        ? employees.find(e => e.id === actionSubtasks[0].responsible_user_id)
        : null;

      return {
        ...action,
        totalSubtasks: actionSubtasks.length,
        completedSubtasks,
        overdueSubtasks,
        createdDaysAgo,
        updatedDaysAgo,
        prazoStatus,
        responsible,
        paralisado: updatedDaysAgo > 7 && action.status !== 'concluido'
      };
    });
  }, [actions, subtasks, employees]);

  // Aplicar filtros
  const filteredActions = useMemo(() => {
    return enrichedActions.filter(action => {
      // Busca textual
      if (searchTerm && !action.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !action.description?.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      // Filtro de status
      if (filterStatus !== "todos" && action.status !== filterStatus) return false;

      // Filtro de responsável
      if (filterResponsavel !== "todos" && action.responsible?.id !== filterResponsavel) return false;

      // Filtro de prazo
      if (filterPrazo === "atrasadas" && action.prazoStatus !== 'atrasado') return false;
      if (filterPrazo === "proximas" && action.prazoStatus !== 'proximo') return false;
      if (filterPrazo === "hoje") {
        if (!action.due_date) return false;
        const dueDate = new Date(action.due_date);
        const today = new Date();
        if (dueDate.toDateString() !== today.toDateString()) return false;
      }

      // Filtro de paralisação
      if (filterParalisacao === "paradas" && !action.paralisado) return false;
      if (filterParalisacao === "antigas" && action.createdDaysAgo < 30) return false;

      // Minhas ações
      if (minhasAcoes && user) {
        const minhasSubtasks = subtasks.filter(s => 
          s.action_id === action.id && s.responsible_user_id === user.id
        );
        if (minhasSubtasks.length === 0) return false;
      }

      return true;
    });
  }, [enrichedActions, searchTerm, filterStatus, filterResponsavel, filterPrazo, filterParalisacao, minhasAcoes, user, subtasks]);

  // Estatísticas
  const stats = useMemo(() => {
    return {
      total: enrichedActions.length,
      pendentes: enrichedActions.filter(a => a.status !== 'concluido').length,
      atrasadas: enrichedActions.filter(a => a.prazoStatus === 'atrasado').length,
      paralisadas: enrichedActions.filter(a => a.paralisado).length,
      concluidas: enrichedActions.filter(a => a.status === 'concluido').length
    };
  }, [enrichedActions]);

  const activeFilters = [
    filterStatus !== "todos",
    filterResponsavel !== "todos",
    filterPrazo !== "todos",
    filterParalisacao !== "todos",
    minhasAcoes,
    searchTerm !== ""
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearchTerm("");
    setFilterStatus("todos");
    setFilterResponsavel("todos");
    setFilterPrazo("todos");
    setFilterParalisacao("todos");
    setMinhasAcoes(false);
  };

  const getStatusBadge = (status) => {
    const badges = {
      a_fazer: { label: "A Fazer", color: "bg-gray-100 text-gray-700", icon: Circle },
      em_andamento: { label: "Em Andamento", color: "bg-blue-100 text-blue-700", icon: Clock },
      concluido: { label: "Concluído", color: "bg-green-100 text-green-700", icon: CheckCircle2 }
    };
    return badges[status] || badges.a_fazer;
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
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">🎯 Painel de Ações</h1>
        <p className="text-gray-600 mt-2">
          Acompanhamento operacional de todas as ações e tarefas
        </p>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gray-600" />
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.pendentes}</div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              Atrasadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.atrasadas}</div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              Paralisadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.paralisadas}</div>
            <p className="text-xs text-gray-600 mt-1">&gt;7 dias sem atualização</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              Concluídas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.concluidas}</div>
            <p className="text-xs text-gray-600 mt-1">
              {stats.total > 0 ? Math.round((stats.concluidas / stats.total) * 100) : 0}% do total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros Avançados
            </CardTitle>
            {activeFilters > 0 && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-2" />
                Limpar {activeFilters} filtro(s)
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Busca */}
            <div className="md:col-span-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar por título ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Status */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                <SelectItem value="a_fazer">A Fazer</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
              </SelectContent>
            </Select>

            {/* Responsável */}
            <Select value={filterResponsavel} onValueChange={setFilterResponsavel}>
              <SelectTrigger>
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Responsáveis</SelectItem>
                {employees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Prazo */}
            <Select value={filterPrazo} onValueChange={setFilterPrazo}>
              <SelectTrigger>
                <SelectValue placeholder="Prazo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Prazos</SelectItem>
                <SelectItem value="hoje">Hoje</SelectItem>
                <SelectItem value="proximas">Próximas (≤3 dias)</SelectItem>
                <SelectItem value="atrasadas">Atrasadas</SelectItem>
              </SelectContent>
            </Select>

            {/* Paralisação */}
            <Select value={filterParalisacao} onValueChange={setFilterParalisacao}>
              <SelectTrigger>
                <SelectValue placeholder="Paralisação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                <SelectItem value="paradas">Paradas (&gt;7 dias)</SelectItem>
                <SelectItem value="antigas">Antigas (&gt;30 dias)</SelectItem>
              </SelectContent>
            </Select>

            {/* Minhas Ações */}
            <div className="flex items-center space-x-2 border rounded-md px-3">
              <input
                type="checkbox"
                id="minhas-acoes"
                checked={minhasAcoes}
                onChange={(e) => setMinhasAcoes(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="minhas-acoes" className="text-sm cursor-pointer">
                Apenas Minhas Ações
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Ações */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {filteredActions.length} Ação(ões) Encontrada(s)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredActions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>Nenhuma ação encontrada com os filtros aplicados.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredActions.map(action => {
                const statusBadge = getStatusBadge(action.status);
                const StatusIcon = statusBadge.icon;

                return (
                  <div
                    key={action.id}
                    onClick={() => navigate(`${createPageUrl('PlanoAcao')}?id=${action.diagnostic_id}`)}
                    className="border rounded-lg p-4 hover:shadow-md transition-all cursor-pointer bg-white"
                  >
                    <div className="flex items-start gap-4">
                      {/* Ícone de Status */}
                      <div className="flex-shrink-0 mt-1">
                        <StatusIcon className={`w-6 h-6 ${
                          action.status === 'concluido' ? 'text-green-600' :
                          action.status === 'em_andamento' ? 'text-blue-600' :
                          'text-gray-400'
                        }`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Título e Badges */}
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">{action.title}</h3>
                          <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        </div>

                        {/* Badges */}
                        <div className="flex flex-wrap gap-2 mb-2">
                          <Badge className={statusBadge.color}>
                            {statusBadge.label}
                          </Badge>

                          {action.prazoStatus === 'atrasado' && (
                            <Badge className="bg-red-100 text-red-700">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Atrasada
                            </Badge>
                          )}

                          {action.paralisado && (
                            <Badge className="bg-orange-100 text-orange-700">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Sem atualização há {action.updatedDaysAgo}d
                            </Badge>
                          )}

                          {action.responsible && (
                            <Badge variant="outline">
                              <User className="w-3 h-3 mr-1" />
                              {action.responsible.full_name}
                            </Badge>
                          )}

                          {action.due_date && (
                            <Badge variant="outline">
                              <Calendar className="w-3 h-3 mr-1" />
                              {format(new Date(action.due_date), "dd/MM/yyyy")}
                            </Badge>
                          )}

                          {action.totalSubtasks > 0 && (
                            <Badge variant="outline">
                              {action.completedSubtasks}/{action.totalSubtasks} subtarefas
                            </Badge>
                          )}

                          {action.overdueSubtasks > 0 && (
                            <Badge className="bg-red-100 text-red-700">
                              {action.overdueSubtasks} atrasada(s)
                            </Badge>
                          )}
                        </div>

                        {/* Indicadores Temporais */}
                        <div className="flex flex-wrap gap-4 text-xs text-gray-600 mt-2">
                          <span>Criada há {action.createdDaysAgo} dias</span>
                          {action.updatedDaysAgo > 0 && (
                            <span>Última atualização há {action.updatedDaysAgo} dias</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}