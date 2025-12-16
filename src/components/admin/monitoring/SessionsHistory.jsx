import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Download, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function SessionsHistory({ sessions, onRefresh }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  const filteredSessions = sessions.filter(s => {
    const matchSearch = s.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       s.user_email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchStatus = statusFilter === "all" || 
                       (statusFilter === "active" && s.is_active) ||
                       (statusFilter === "finished" && !s.is_active);
    
    let matchDate = true;
    if (dateFilter !== "all" && s.login_time) {
      const loginDate = new Date(s.login_time);
      const now = new Date();
      const diffHours = (now - loginDate) / (1000 * 60 * 60);
      
      matchDate = dateFilter === "today" && diffHours <= 24 ||
                 dateFilter === "week" && diffHours <= 168 ||
                 dateFilter === "month" && diffHours <= 720;
    }
    
    return matchSearch && matchStatus && matchDate;
  });

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}min`;
    return `${minutes}min`;
  };

  const handleForceEndSession = async (sessionId) => {
    if (!confirm("Deseja realmente finalizar esta sessão?")) return;
    
    try {
      const session = sessions.find(s => s.id === sessionId);
      if (!session) return;
      
      const now = new Date();
      const loginTime = new Date(session.login_time);
      const totalSeconds = Math.floor((now - loginTime) / 1000);
      const activeSeconds = totalSeconds - (session.idle_time_seconds || 0);
      
      await base44.entities.UserSession.update(sessionId, {
        logout_time: now.toISOString(),
        total_time_seconds: totalSeconds,
        active_time_seconds: activeSeconds,
        is_active: false
      });
      
      toast.success("Sessão finalizada com sucesso!");
      onRefresh?.();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao finalizar sessão");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <CardTitle>Histórico de Sessões</CardTitle>
            <Badge variant="outline" className="text-sm">
              {filteredSessions.length} sessões
            </Badge>
          </div>
          
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar usuário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="finished">Finalizados</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Última Semana</SelectItem>
                <SelectItem value="month">Último Mês</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Usuário</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Login</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Logout</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Duração</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Tempo Ativo</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-gray-500">
                    Nenhuma sessão encontrada com os filtros aplicados
                  </td>
                </tr>
              ) : (
                filteredSessions.slice(0, 100).map((session) => (
                <tr key={session.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-gray-900">{session.user_name}</p>
                      <p className="text-xs text-gray-500">{session.user_email}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-gray-700">
                      {session.login_time 
                        ? format(new Date(session.login_time), "dd/MM/yy HH:mm", { locale: ptBR })
                        : '-'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-gray-700">
                      {session.logout_time 
                        ? format(new Date(session.logout_time), "dd/MM/yy HH:mm", { locale: ptBR })
                        : '-'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-gray-700">
                      {formatDuration(session.total_time_seconds || 0)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-gray-700">
                      {formatDuration(session.active_time_seconds || 0)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={session.is_active ? "default" : "secondary"}>
                      {session.is_active ? '🟢 Ativo' : '⚫ Finalizado'}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    {session.is_active && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleForceEndSession(session.id)}
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}