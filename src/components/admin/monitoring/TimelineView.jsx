import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Eye, LogIn, LogOut, Coffee } from "lucide-react";
import { format, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function TimelineView({ sessions, activities }) {
  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}min`;
    return `${minutes}min`;
  };

  const getTimelineData = () => {
    const data = [];
    
    sessions.forEach(session => {
      const sessionActivities = activities.filter(a => a.session_id === session.session_id);
      
      const timeline = {
        session,
        events: []
      };

      // Login
      if (session.login_time) {
        timeline.events.push({
          type: 'login',
          time: new Date(session.login_time),
          label: 'Login',
          icon: LogIn,
          color: 'bg-green-500'
        });
      }

      // Atividades
      sessionActivities.forEach(activity => {
        const time = new Date(activity.timestamp);
        
        if (activity.activity_type === 'page_view') {
          timeline.events.push({
            type: 'page_view',
            time,
            label: activity.page_name || 'Página',
            duration: activity.time_spent_seconds,
            icon: Eye,
            color: 'bg-blue-500'
          });
        } else if (activity.activity_type === 'idle_start') {
          timeline.events.push({
            type: 'idle_start',
            time,
            label: 'Ficou inativo',
            icon: Coffee,
            color: 'bg-yellow-500'
          });
        } else if (activity.activity_type === 'idle_end') {
          timeline.events.push({
            type: 'idle_end',
            time,
            label: 'Retornou',
            icon: Clock,
            color: 'bg-purple-500'
          });
        }
      });

      // Logout
      if (session.logout_time) {
        timeline.events.push({
          type: 'logout',
          time: new Date(session.logout_time),
          label: 'Logout',
          icon: LogOut,
          color: 'bg-red-500'
        });
      }

      // Ordena eventos por tempo
      timeline.events.sort((a, b) => a.time - b.time);
      
      data.push(timeline);
    });

    return data;
  };

  const timelineData = getTimelineData();

  if (timelineData.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          Nenhuma atividade para exibir na linha do tempo
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {timelineData.map((timeline, idx) => {
        const { session, events } = timeline;
        
        return (
          <Card key={session.id || idx}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{session.user_name}</CardTitle>
                  <p className="text-sm text-gray-600">{session.user_email}</p>
                </div>
                <div className="text-right">
                  <Badge className="bg-indigo-100 text-indigo-700">
                    {formatDuration(session.total_time_seconds || 0)}
                  </Badge>
                  {session.is_active && (
                    <Badge className="ml-2 bg-green-100 text-green-700">
                      🟢 Ativo
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative pl-8 space-y-4">
                {/* Linha vertical */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

                {events.map((event, eventIdx) => {
                  const Icon = event.icon;
                  const nextEvent = events[eventIdx + 1];
                  const duration = nextEvent 
                    ? differenceInMinutes(nextEvent.time, event.time)
                    : null;

                  return (
                    <div key={eventIdx} className="relative">
                      {/* Ponto na linha */}
                      <div className={`absolute -left-8 w-8 h-8 rounded-full ${event.color} flex items-center justify-center`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>

                      {/* Conteúdo do evento */}
                      <div className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{event.label}</p>
                            <p className="text-xs text-gray-600">
                              {format(event.time, "HH:mm:ss", { locale: ptBR })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {event.duration > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {formatDuration(event.duration)}
                              </Badge>
                            )}
                            {duration !== null && duration > 0 && (
                              <Badge variant="outline" className="text-xs text-gray-600">
                                ⏱️ +{duration}min
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Resumo da sessão */}
              <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-gray-600">Tempo Total</p>
                  <p className="font-semibold text-gray-900">
                    {formatDuration(session.total_time_seconds || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Tempo Ativo</p>
                  <p className="font-semibold text-green-600">
                    {formatDuration(session.active_time_seconds || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Tempo Idle</p>
                  <p className="font-semibold text-yellow-600">
                    {formatDuration(session.idle_time_seconds || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}