import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Search, TrendingUp } from "lucide-react";

export default function UsageStatistics({ sessions }) {
  const [timeFilter, setTimeFilter] = useState("today");
  const [userFilter, setUserFilter] = useState("");

  // Filtrar sessões
  const filteredSessions = sessions.filter(s => {
    const matchUser = !userFilter || 
                     s.user_name?.toLowerCase().includes(userFilter.toLowerCase()) ||
                     s.user_email?.toLowerCase().includes(userFilter.toLowerCase());
    
    let matchTime = true;
    if (s.login_time) {
      const loginDate = new Date(s.login_time);
      const now = new Date();
      const diffHours = (now - loginDate) / (1000 * 60 * 60);
      
      matchTime = timeFilter === "today" && diffHours <= 24 ||
                 timeFilter === "week" && diffHours <= 168 ||
                 timeFilter === "month" && diffHours <= 720 ||
                 timeFilter === "all";
    }
    
    return matchUser && matchTime;
  });

  // Processar dados para o gráfico
  const hourlyData = Array.from({ length: 24 }, (_, hour) => {
    const sessionsInHour = filteredSessions.filter(s => {
      if (!s.login_time) return false;
      const loginHour = new Date(s.login_time).getHours();
      return loginHour === hour;
    });
    
    return {
      hour: `${hour}h`,
      sessions: sessionsInHour.length
    };
  });

  const totalSessions = filteredSessions.length;
  const activeSessions = filteredSessions.filter(s => s.is_active).length;
  const avgPages = filteredSessions.length > 0 
    ? filteredSessions.reduce((sum, s) => sum + (s.pages_visited || 0), 0) / filteredSessions.length 
    : 0;
  const avgDuration = filteredSessions.length > 0
    ? filteredSessions.reduce((sum, s) => sum + (s.total_time_seconds || 0), 0) / filteredSessions.length
    : 0;

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}min`;
    return `${minutes}min`;
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Estatísticas de Uso</CardTitle>
            <Badge variant="outline" className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {totalSessions} sessões
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar usuário..."
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Esta Semana</SelectItem>
                <SelectItem value="month">Este Mês</SelectItem>
                <SelectItem value="all">Tudo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total de Sessões</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{totalSessions}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Sessões Ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{activeSessions}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Média de Páginas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{avgPages.toFixed(1)}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Tempo Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-600">{formatDuration(avgDuration)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Sessões por Horário */}
      <Card>
        <CardHeader>
          <CardTitle>Sessões por Horário</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="sessions" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}