import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { differenceInDays, startOfWeek, endOfWeek } from "date-fns";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import ActionStatsCards from "@/components/cronograma/ActionStatsCards";
import ActionFiltersBar from "@/components/cronograma/ActionFiltersBar";
import ActionsList from "@/components/cronograma/ActionsList";

export default function PainelAcoes() {
  const navigate = useNavigate();
  
  const [filters, setFilters] = useState({
    searchTerm: "",
    filterStatus: "todos",
    filterResponsavel: "todos",
    filterPrazo: "todos",
    filterParalisacao: "todos",
    minhasAcoes: false
  });
  const [sortBy, setSortBy] = useState("prazo_prioridade");

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

  const filteredActions = useMemo(() => {
    return enrichedActions.filter(action => {
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const matchesText = action.title.toLowerCase().includes(searchLower) ||
                           action.description?.toLowerCase().includes(searchLower);
        const matchesResponsavel = action.responsible?.full_name?.toLowerCase().includes(searchLower);
        if (!matchesText && !matchesResponsavel) return false;
      }

      if (filters.filterStatus !== "todos" && action.status !== filters.filterStatus) return false;

      if (filters.filterResponsavel !== "todos" && action.responsible?.id !== filters.filterResponsavel) return false;

      if (filters.filterPrazo === "atrasadas" && action.prazoStatus !== 'atrasado') return false;
      if (filters.filterPrazo === "proximas" && action.prazoStatus !== 'proximo') return false;
      if (filters.filterPrazo === "hoje") {
        if (!action.due_date) return false;
        const dueDate = new Date(action.due_date);
        const today = new Date();
        if (dueDate.toDateString() !== today.toDateString()) return false;
      }
      if (filters.filterPrazo === "semana") {
        if (!action.due_date) return false;
        const dueDate = new Date(action.due_date);
        const weekStart = startOfWeek(new Date());
        const weekEnd = endOfWeek(new Date());
        if (dueDate < weekStart || dueDate > weekEnd) return false;
      }

      if (filters.filterParalisacao === "paradas" && !action.paralisado) return false;
      if (filters.filterParalisacao === "antigas" && action.createdDaysAgo < 30) return false;
      if (filters.filterParalisacao === "recentes" && action.createdDaysAgo > 7) return false;

      if (filters.minhasAcoes && user) {
        const minhasSubtasks = subtasks.filter(s => 
          s.action_id === action.id && s.responsible_user_id === user.id
        );
        if (minhasSubtasks.length === 0) return false;
      }

      return true;
    });
  }, [enrichedActions, filters, user, subtasks]);

  const stats = useMemo(() => {
    return {
      total: enrichedActions.length,
      pendentes: enrichedActions.filter(a => a.status !== 'concluido').length,
      atrasadas: enrichedActions.filter(a => a.prazoStatus === 'atrasado').length,
      paralisadas: enrichedActions.filter(a => a.paralisado).length,
      proximas: enrichedActions.filter(a => a.prazoStatus === 'proximo').length,
      concluidas: enrichedActions.filter(a => a.status === 'concluido').length
    };
  }, [enrichedActions]);

  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'searchTerm') return value !== "";
    if (key === 'minhasAcoes') return value === true;
    return value !== "todos";
  }).length;

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: "",
      filterStatus: "todos",
      filterResponsavel: "todos",
      filterPrazo: "todos",
      filterParalisacao: "todos",
      minhasAcoes: false
    });
  };

  const handleStatClick = (statId) => {
    clearFilters();
    switch(statId) {
      case "pendentes":
        setFilters(prev => ({ ...prev, filterStatus: "em_andamento" }));
        break;
      case "atrasadas":
        setFilters(prev => ({ ...prev, filterPrazo: "atrasadas" }));
        break;
      case "paralisadas":
        setFilters(prev => ({ ...prev, filterParalisacao: "paradas" }));
        break;
      case "proximas":
        setFilters(prev => ({ ...prev, filterPrazo: "proximas" }));
        break;
    }
  };

  const handleActionClick = (action) => {
    navigate(`${createPageUrl('PlanoAcao')}?id=${action.diagnostic_id}`);
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">🎯 Painel de Ações</h1>
        <p className="text-gray-600 mt-2">
          Acompanhamento operacional e rastreabilidade completa de ações
        </p>
      </div>

      <ActionStatsCards stats={stats} onStatClick={handleStatClick} />

      <ActionFiltersBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={clearFilters}
        employees={employees}
        activeFiltersCount={activeFiltersCount}
      />

      <ActionsList
        actions={filteredActions}
        sortBy={sortBy}
        onSortChange={setSortBy}
        onActionClick={handleActionClick}
      />
    </div>
  );
}