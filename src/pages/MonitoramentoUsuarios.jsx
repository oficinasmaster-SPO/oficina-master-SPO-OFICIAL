import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Users, Clock, Activity, TrendingUp, AlertTriangle, Eye } from "lucide-react";
import MonitoringFilters from "../components/admin/monitoring/MonitoringFilters";
import TimelineView from "../components/admin/monitoring/TimelineView";
import BehaviorAlerts from "../components/admin/monitoring/BehaviorAlerts";
import EventLogAudit from "../components/admin/monitoring/EventLogAudit";
import ActiveUsersTable from "../components/admin/monitoring/ActiveUsersTable";
import SessionsHistory from "../components/admin/monitoring/SessionsHistory";
import UserActivityDetails from "../components/admin/monitoring/UserActivityDetails";
import UsageStatistics from "../components/admin/monitoring/UsageStatistics";

export default function MonitoramentoUsuarios() {
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState(null);
  const [filters, setFilters] = useState({
    userType: 'all',
    userId: '',
    status: 'all',
    timeRange: 'today',
    eventType: 'all',
    minActiveTime: '',
    maxIdleTime: '',
    searchTerm: ''
  });

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users-monitoring'],
    queryFn: async () => {
      const employees = await base44.entities.Employee.list();
      return employees;
    }
  });

  const { data: activeSessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ['active-sessions'],
    queryFn: async () => {
      const sessions = await base44.entities.UserSession.filter(
        { is_active: true },
        '-last_activity_time'
      );
      return sessions;
    },
    refetchInterval: 10000
  });

  const { data: allSessions = [] } = useQuery({
    queryKey: ['all-sessions'],
    queryFn: () => base44.entities.UserSession.list('-login_time', 500)
  });

  const { data: allActivityLogs = [] } = useQuery({
    queryKey: ['all-activity-logs'],
    queryFn: () => base44.entities.UserActivityLog.list('-timestamp', 1000)
  });

  const { data: userActivityLogs = [] } = useQuery({
    queryKey: ['activity-logs', selectedUser?.id],
    queryFn: () => {
      if (!selectedUser) return [];
      return base44.entities.UserActivityLog.filter(
        { user_id: selectedUser.id },
        '-timestamp',
        200
      );
    },
    enabled: !!selectedUser
  });

  // Aplicar filtros
  const applyFilters = (sessions, activities) => {
    let filtered = { sessions: [...sessions], activities: [...activities] };

    // Filtro de busca
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered.sessions = filtered.sessions.filter(s =>
        s.user_name?.toLowerCase().includes(term) ||
        s.user_email?.toLowerCase().includes(term)
      );
      filtered.activities = filtered.activities.filter(a =>
        a.user_name?.toLowerCase().includes(term) ||
        a.user_email?.toLowerCase().includes(term)
      );
    }

    // Filtro de tipo de usuário
    if (filters.userType !== 'all') {
      const userIds = filters.userType === 'internal'
        ? allUsers.filter(u => u.tipo_vinculo === 'interno' || u.is_internal).map(u => u.user_id).filter(Boolean)
        : allUsers.filter(u => u.tipo_vinculo !== 'interno' && !u.is_internal).map(u => u.user_id).filter(Boolean);
      
      filtered.sessions = filtered.sessions.filter(s => userIds.includes(s.user_id));
      filtered.activities = filtered.activities.filter(a => userIds.includes(a.user_id));
    }

    // Filtro de usuário específico
    if (filters.userId) {
      filtered.sessions = filtered.sessions.filter(s => s.user_id === filters.userId);
      filtered.activities = filtered.activities.filter(a => a.user_id === filters.userId);
    }

    // Filtro de status
    if (filters.status !== 'all') {
      filtered.sessions = filtered.sessions.filter(s => {
        if (filters.status === 'active') return s.is_active;
        if (filters.status === 'offline') return !s.is_active;
        return true;
      });
    }

    // Filtro de período
    if (filters.timeRange !== 'all') {
      const now = new Date();
      const filterSessions = (loginTime) => {
        if (!loginTime) return false;
        const date = new Date(loginTime);
        const diffMs = now - date;
        const diffHours = diffMs / (1000 * 60 * 60);
        
        if (filters.timeRange === 'now') return diffHours <= 1;
        if (filters.timeRange === 'today') return diffHours <= 24;
        if (filters.timeRange === '24h') return diffHours <= 24;
        if (filters.timeRange === '7d') return diffHours <= 168;
        if (filters.timeRange === '30d') return diffHours <= 720;
        return true;
      };

      filtered.sessions = filtered.sessions.filter(s => filterSessions(s.login_time));
      filtered.activities = filtered.activities.filter(a => filterSessions(a.timestamp));
    }

    // Filtro de tipo de evento
    if (filters.eventType !== 'all') {
      filtered.activities = filtered.activities.filter(a => a.activity_type === filters.eventType);
    }

    // Filtro de tempo ativo mínimo
    if (filters.minActiveTime) {
      const minSeconds = parseInt(filters.minActiveTime) * 60;
      filtered.sessions = filtered.sessions.filter(s => (s.active_time_seconds || 0) >= minSeconds);
    }

    // Filtro de tempo idle máximo
    if (filters.maxIdleTime) {
      const maxSeconds = parseInt(filters.maxIdleTime) * 60;
      filtered.sessions = filtered.sessions.filter(s => (s.idle_time_seconds || 0) <= maxSeconds);
    }

    return filtered;
  };

  const filteredData = applyFilters(allSessions, allActivityLogs);
  const filteredSessions = filteredData.sessions;
  const filteredActivities = filteredData.activities;

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-red-600">Acesso restrito a administradores</p>
      </div>
    );
  }

  if (loadingSessions) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const totalActiveUsers = activeSessions.length;
  const totalSessionsToday = filteredSessions.filter(s => {
    if (!s.login_time) return false;
    const loginDate = new Date(s.login_time);
    const today = new Date();
    return loginDate.toDateString() === today.toDateString();
  }).length;

  const avgSessionTime = filteredSessions.length > 0
    ? Math.floor(filteredSessions.reduce((acc, s) => acc + (s.total_time_seconds || 0), 0) / filteredSessions.length / 60)
    : 0;

  const criticalAlerts = filteredSessions.filter(s => {
    const idlePercentage = s.total_time_seconds > 0 ? (s.idle_time_seconds / s.total_time_seconds) * 100 : 0;
    return idlePercentage > 60 || (!s.is_active && s.total_time_seconds < 120);
  }).length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🎯 Radar Temporal de Uso</h1>
          <p className="text-gray-600 mt-1">Monitoramento comportamental e auditoria de atividade</p>
        </div>
      </div>

      {/* Filtros Avançados */}
      <MonitoringFilters 
        onFiltersChange={setFilters}
        allUsers={allUsers}
        initialFilters={filters}
      />

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Usuários Ativos</CardTitle>
            <Activity className="w-5 h-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{totalActiveUsers}</div>
            <p className="text-xs text-gray-500 mt-1">Conectados agora</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Sessões Hoje</CardTitle>
            <Users className="w-5 h-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{totalSessionsToday}</div>
            <p className="text-xs text-gray-500 mt-1">Logins realizados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Tempo Médio</CardTitle>
            <Clock className="w-5 h-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{avgSessionTime}min</div>
            <p className="text-xs text-gray-500 mt-1">Por sessão</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Engajamento</CardTitle>
            <TrendingUp className="w-5 h-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {filteredSessions.length > 0 
                ? Math.round((filteredSessions.reduce((acc, s) => acc + (s.active_time_seconds || 0), 0) / 
                    filteredSessions.reduce((acc, s) => acc + (s.total_time_seconds || 1), 0)) * 100) 
                : 0}%
            </div>
            <p className="text-xs text-gray-500 mt-1">Tempo ativo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Alertas</CardTitle>
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{criticalAlerts}</div>
            <p className="text-xs text-gray-500 mt-1">Comportamentos atípicos</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de Conteúdo */}
      <Tabs defaultValue="timeline" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="timeline">
            <Eye className="w-4 h-4 mr-2" />
            Linha do Tempo
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Alertas
          </TabsTrigger>
          <TabsTrigger value="active">Ativos Agora</TabsTrigger>
          <TabsTrigger value="audit">Auditoria</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
          <TabsTrigger value="stats">Estatísticas</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          <TimelineView 
            sessions={filteredSessions.slice(0, 20)} 
            activities={filteredActivities}
          />
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <BehaviorAlerts 
            sessions={filteredSessions}
            onViewDetails={setSelectedUser}
          />
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <ActiveUsersTable 
            sessions={activeSessions} 
            onSelectUser={setSelectedUser}
          />
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <EventLogAudit activities={filteredActivities.slice(0, 200)} />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <SessionsHistory 
            sessions={filteredSessions} 
            onRefresh={() => {
              queryClient.invalidateQueries(['all-sessions']);
            }} 
          />
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <UsageStatistics sessions={filteredSessions} />
        </TabsContent>
      </Tabs>

      {/* Modal de Detalhes do Usuário */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Detalhes de {selectedUser.name}</h2>
              <button 
                onClick={() => setSelectedUser(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              <UserActivityDetails 
                user={selectedUser} 
                activities={userActivityLogs}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}