import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function SessionsHistory({ sessions }) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredSessions = sessions.filter(s => 
    s.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.user_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}min`;
    return `${minutes}min`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Histórico de Sessões</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar usuário..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
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
              </tr>
            </thead>
            <tbody>
              {filteredSessions.slice(0, 50).map((session) => (
                <tr key={session.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-gray-900">{session.user_name}</p>
                      <p className="text-xs text-gray-500">{session.user_email}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-gray-700">
                      {format(new Date(session.login_time), "dd/MM/yy HH:mm", { locale: ptBR })}
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
                      {session.is_active ? 'Ativo' : 'Finalizado'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}