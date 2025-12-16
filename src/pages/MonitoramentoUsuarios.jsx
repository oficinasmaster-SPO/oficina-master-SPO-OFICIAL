import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Users, Clock, Activity, TrendingUp, Search, Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ActiveUsersTable from "../components/admin/monitoring/ActiveUsersTable";
import SessionsHistory from "../components/admin/monitoring/SessionsHistory";
import UserActivityDetails from "../components/admin/monitoring/UserActivityDetails";
import UsageStatistics from "../components/admin/monitoring/UsageStatistics";

export default function MonitoramentoUsuarios() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
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
    refetchInterval: 10000 // Atualiza a cada 10s
  });

  const { data: allSessions = [] } = useQuery({
    queryKey: ['all-sessions'],
    queryFn: () => base44.entities.UserSession.list('-login_time')
  });

  const { data: activityLogs = [] } = useQuery({
    queryKey: ['activity-logs', selectedUser?.id],
    queryFn: () => {
      if (!selectedUser) return [];
      return base44.entities.UserActivityLog.filter(
        { user_id: selectedUser.id },
        '-timestamp',
        100
      );
    },
    enabled: !!selectedUser
  });

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
  const totalSessionsToday = allSessions.filter(s => {
    const loginDate = new Date(s.login_time);
    const today = new Date();
    return loginDate.toDateString() === today.toDateString();
  }).length;

  const avgSessionTime = allSessions.length > 0
    ? Math.floor(allSessions.reduce((acc, s) => acc + (s.total_time_seconds || 0), 0) / allSessions.length / 60)
    : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Monitoramento de Usuários</h1>
          <p className="text-gray-600 mt-1">Acompanhamento em tempo real da atividade dos usuários</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Exportar Relatório
        </Button>
      </div>

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
              {allSessions.length > 0 
                ? Math.round((allSessions.reduce((acc, s) => acc + (s.active_time_seconds || 0), 0) / 
                    allSessions.reduce((acc, s) => acc + (s.total_time_seconds || 1), 0)) * 100) 
                : 0}%
            </div>
            <p className="text-xs text-gray-500 mt-1">Tempo ativo</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de Conteúdo */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="active">Usuários Ativos</TabsTrigger>
          <TabsTrigger value="history">Histórico de Sessões</TabsTrigger>
          <TabsTrigger value="details">Detalhes de Atividade</TabsTrigger>
          <TabsTrigger value="stats">Estatísticas</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <ActiveUsersTable 
            sessions={activeSessions} 
            onSelectUser={setSelectedUser}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <SessionsHistory sessions={allSessions} />
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          {selectedUser ? (
            <UserActivityDetails 
              user={selectedUser} 
              activities={activityLogs}
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                Selecione um usuário para ver os detalhes de atividade
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <UsageStatistics sessions={allSessions} activities={activityLogs} />
        </TabsContent>
      </Tabs>
    </div>
  );
}