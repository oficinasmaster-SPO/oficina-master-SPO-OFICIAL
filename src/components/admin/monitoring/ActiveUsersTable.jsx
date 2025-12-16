import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Search, Filter } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ActiveUsersTable({ sessions, onSelectUser }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("login_time");
  
  const filteredSessions = sessions.filter(s =>
    s.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.workshop_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const sortedSessions = [...filteredSessions].sort((a, b) => {
    switch(sortBy) {
      case "login_time":
        return new Date(b.login_time) - new Date(a.login_time);
      case "activity":
        return new Date(b.last_activity_time) - new Date(a.last_activity_time);
      case "pages":
        return (b.pages_visited || 0) - (a.pages_visited || 0);
      default:
        return 0;
    }
  });
  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}min`;
    return `${minutes}min`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <CardTitle>Usuários Conectados Agora</CardTitle>
            <Badge variant="outline" className="bg-green-50 text-green-700">
              {sortedSessions.length} online
            </Badge>
          </div>
          
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar usuário ou oficina..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="login_time">Último Login</SelectItem>
                <SelectItem value="activity">Última Atividade</SelectItem>
                <SelectItem value="pages">Mais Páginas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Usuário</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Oficina</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Login</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Última Atividade</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Tempo Online</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Páginas</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-500">
                    Nenhum usuário conectado no momento
                  </td>
                </tr>
              ) : (
                sortedSessions.map((session) => {
                  const now = new Date();
                  const loginTime = session.login_time ? new Date(session.login_time) : now;
                  const onlineDuration = Math.floor((now - loginTime) / 1000);

                  return (
                    <tr key={session.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{session.user_name}</p>
                          <p className="text-xs text-gray-500">{session.user_email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-700">{session.workshop_name || '-'}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-700">
                          {format(loginTime, "HH:mm", { locale: ptBR })}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-700">
                          {session.last_activity_time 
                            ? format(new Date(session.last_activity_time), "HH:mm", { locale: ptBR })
                            : '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {formatDuration(onlineDuration)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-700">{session.pages_visited || 0}</span>
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onSelectUser({ id: session.user_id, name: session.user_name })}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}