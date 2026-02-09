import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogIn, LogOut, Activity, Clock, AlertCircle } from "lucide-react";
import { format, differenceInMinutes } from "date-fns";

export default function UserReportTimeline({ userData, filters }) {
  const { sessions, activityLogs } = userData;

  // Combinar eventos em timeline
  const events = [];

  // Adicionar eventos de sessão
  sessions.forEach(session => {
    events.push({
      type: 'login',
      timestamp: session.start_time,
      data: session
    });
    if (session.end_time) {
      events.push({
        type: 'logout',
        timestamp: session.end_time,
        data: session
      });
    }
  });

  // Adicionar eventos de atividade
  activityLogs.forEach(log => {
    events.push({
      type: 'activity',
      timestamp: log.timestamp,
      data: log
    });
  });

  // Ordenar por timestamp
  events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const getEventIcon = (type) => {
    switch (type) {
      case 'login': return <LogIn className="w-4 h-4 text-green-600" />;
      case 'logout': return <LogOut className="w-4 h-4 text-red-600" />;
      case 'activity': return <Activity className="w-4 h-4 text-blue-600" />;
      default: return <Clock className="w-4 h-4 text-slate-600" />;
    }
  };

  const getEventBadgeColor = (type) => {
    switch (type) {
      case 'login': return 'bg-green-100 text-green-700';
      case 'logout': return 'bg-red-100 text-red-700';
      case 'activity': return 'bg-blue-100 text-blue-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getEventDescription = (event) => {
    switch (event.type) {
      case 'login':
        return `Login realizado (${event.data.device_info?.platform || 'Desconhecido'})`;
      case 'logout':
        const duration = differenceInMinutes(
          new Date(event.data.end_time),
          new Date(event.data.start_time)
        );
        return `Logout - Sessão durou ${Math.floor(duration / 60)}h ${duration % 60}min`;
      case 'activity':
        return `${event.data.action_type} - ${event.data.page_name || 'Página desconhecida'}`;
      default:
        return 'Evento';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Linha do Tempo Completa</CardTitle>
        <p className="text-sm text-slate-600">
          Histórico cronológico de todas as atividades do usuário
        </p>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Linha vertical */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200" />

          <div className="space-y-6">
            {events.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p>Nenhum evento registrado no período selecionado</p>
              </div>
            ) : (
              events.map((event, idx) => (
                <div key={idx} className="relative flex items-start gap-4 pl-14">
                  {/* Ícone do evento */}
                  <div className="absolute left-4 top-1 w-5 h-5 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center">
                    {getEventIcon(event.type)}
                  </div>

                  {/* Conteúdo do evento */}
                  <div className="flex-1 bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getEventBadgeColor(event.type)}>
                            {event.type === 'login' ? 'Login' : 
                             event.type === 'logout' ? 'Logout' : 
                             'Atividade'}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            {format(new Date(event.timestamp), "dd/MM/yyyy HH:mm:ss")}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700">
                          {getEventDescription(event)}
                        </p>
                        {event.data.details && (
                          <p className="text-xs text-slate-500 mt-1">
                            {event.data.details}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}