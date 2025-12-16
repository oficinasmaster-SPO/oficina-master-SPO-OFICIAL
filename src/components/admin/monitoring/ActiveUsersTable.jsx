import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ActiveUsersTable({ sessions, onSelectUser }) {
  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}min`;
    return `${minutes}min`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usuários Conectados Agora</CardTitle>
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
                sessions.map((session) => {
                  const now = new Date();
                  const loginTime = new Date(session.login_time);
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
                          {format(new Date(session.last_activity_time), "HH:mm", { locale: ptBR })}
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