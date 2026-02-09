import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Download, LogIn, LogOut, Eye, Coffee, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function EventLogAudit({ activities }) {
  const [searchTerm, setSearchTerm] = useState("");

  const getEventIcon = (type) => {
    switch(type) {
      case 'login': return <LogIn className="w-4 h-4" />;
      case 'logout': return <LogOut className="w-4 h-4" />;
      case 'page_view': return <Eye className="w-4 h-4" />;
      case 'idle_start': return <Coffee className="w-4 h-4" />;
      case 'idle_end': return <Clock className="w-4 h-4" />;
      default: return <Eye className="w-4 h-4" />;
    }
  };

  const getEventColor = (type) => {
    switch(type) {
      case 'login': return 'text-green-600 bg-green-50';
      case 'logout': return 'text-red-600 bg-red-50';
      case 'page_view': return 'text-blue-600 bg-blue-50';
      case 'idle_start': return 'text-yellow-600 bg-yellow-50';
      case 'idle_end': return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getEventLabel = (type) => {
    const labels = {
      login: 'Login',
      logout: 'Logout',
      page_view: 'Visualização',
      idle_start: 'Início Idle',
      idle_end: 'Fim Idle',
      action: 'Ação'
    };
    return labels[type] || type;
  };

  const filteredActivities = activities.filter(a =>
    a.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.page_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.activity_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportLog = () => {
    const csv = [
      ['Horário', 'Usuário', 'Email', 'Tipo', 'Página', 'Duração (s)'],
      ...filteredActivities.map(a => [
        a.timestamp ? format(new Date(a.timestamp), 'dd/MM/yyyy HH:mm:ss') : '',
        a.user_name || '',
        a.user_email || '',
        getEventLabel(a.activity_type),
        a.page_name || '',
        a.time_spent_seconds || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <CardTitle>Log de Eventos (Auditoria)</CardTitle>
            <div className="flex gap-2">
              <Badge variant="outline">{filteredActivities.length} eventos</Badge>
              <Button variant="outline" size="sm" onClick={exportLog}>
                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar eventos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {filteredActivities.length === 0 ? (
            <p className="text-center py-8 text-gray-500">
              Nenhum evento registrado
            </p>
          ) : (
            filteredActivities.map((activity, idx) => (
              <div
                key={activity.id || idx}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <div className={`p-2 rounded-lg ${getEventColor(activity.activity_type)}`}>
                  {getEventIcon(activity.activity_type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 truncate">
                      {activity.user_name}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {getEventLabel(activity.activity_type)}
                    </Badge>
                  </div>
                  
                  {activity.page_name && (
                    <p className="text-sm text-gray-600 truncate">{activity.page_name}</p>
                  )}
                  
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">
                      {activity.timestamp 
                        ? format(new Date(activity.timestamp), "dd/MM/yy HH:mm:ss", { locale: ptBR })
                        : '-'}
                    </span>
                    {activity.time_spent_seconds > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {Math.floor(activity.time_spent_seconds / 60)}min
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="text-xs text-gray-500">
                  {activity.session_id?.slice(0, 8)}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}