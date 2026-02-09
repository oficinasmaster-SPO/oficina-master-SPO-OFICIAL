import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, RefreshCw, Loader2, Video, MapPin, Users, Clock } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function GoogleCalendarAgenda() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const queryClient = useQueryClient();

  // Buscar eventos do Google Calendar
  const { data: events = [], isLoading, refetch } = useQuery({
    queryKey: ['google-calendar-events', selectedDate],
    queryFn: async () => {
      const response = await base44.functions.invoke('fetchGoogleCalendarEvents', {
        date: selectedDate.toISOString()
      });
      return response.data.events || [];
    },
    refetchInterval: 60000 // Atualizar a cada 1 minuto
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      return await base44.functions.invoke('syncGoogleCalendar', { force: true });
    },
    onSuccess: () => {
      toast.success('Agenda sincronizada!');
      refetch();
    },
    onError: (error) => {
      toast.error('Erro ao sincronizar: ' + error.message);
    }
  });

  const changeWeek = (direction) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction * 7));
    setSelectedDate(newDate);
  };

  const getWeekDays = () => {
    const start = new Date(selectedDate);
    start.setDate(start.getDate() - start.getDay()); // Domingo
    
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      return day;
    });
  };

  const weekDays = getWeekDays();

  const getEventsForDay = (day) => {
    return events.filter(event => {
      const eventDate = new Date(event.start?.dateTime || event.start?.date);
      return eventDate.toDateString() === day.toDateString();
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Agenda Google Calendar
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(new Date())}
            >
              Hoje
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
            >
              {syncMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Navegação de Semanas */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" size="sm" onClick={() => changeWeek(-1)}>
            ← Semana Anterior
          </Button>
          <span className="font-semibold">
            {format(weekDays[0], "d MMM", { locale: ptBR })} - {format(weekDays[6], "d MMM yyyy", { locale: ptBR })}
          </span>
          <Button variant="outline" size="sm" onClick={() => changeWeek(1)}>
            Próxima Semana →
          </Button>
        </div>

        {/* Grade Semanal */}
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day, idx) => {
            const dayEvents = getEventsForDay(day);
            const isToday = day.toDateString() === new Date().toDateString();

            return (
              <div
                key={idx}
                className={`border rounded-lg p-3 min-h-[200px] ${
                  isToday ? 'bg-blue-50 border-blue-300' : 'bg-white'
                }`}
              >
                {/* Cabeçalho do Dia */}
                <div className="text-center mb-3 pb-2 border-b">
                  <div className="text-xs text-gray-600 uppercase">
                    {format(day, "EEE", { locale: ptBR })}
                  </div>
                  <div className={`text-lg font-bold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                    {format(day, "d", { locale: ptBR })}
                  </div>
                </div>

                {/* Eventos do Dia */}
                <div className="space-y-2">
                  {dayEvents.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center mt-4">Sem eventos</p>
                  ) : (
                    dayEvents.map((event, eventIdx) => {
                      const startTime = event.start?.dateTime 
                        ? format(new Date(event.start.dateTime), "HH:mm", { locale: ptBR })
                        : "Todo dia";
                      
                      const hasGoogleMeet = event.hangoutLink || event.conferenceData?.entryPoints?.some(e => e.entryPointType === 'video');

                      return (
                        <div
                          key={eventIdx}
                          className="p-2 bg-white border border-gray-200 rounded-md hover:shadow-md transition-shadow cursor-pointer text-xs"
                          onClick={() => {
                            if (event.htmlLink) {
                              window.open(event.htmlLink, '_blank');
                            }
                          }}
                        >
                          <div className="flex items-start gap-2">
                            <Clock className="w-3 h-3 text-gray-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-gray-900 truncate">
                                {event.summary || 'Sem título'}
                              </div>
                              <div className="text-gray-600">{startTime}</div>
                              {hasGoogleMeet && (
                                <Badge variant="outline" className="mt-1 text-xs">
                                  <Video className="w-2 h-2 mr-1" />
                                  Meet
                                </Badge>
                              )}
                              {event.attendees && event.attendees.length > 0 && (
                                <div className="flex items-center gap-1 mt-1 text-gray-500">
                                  <Users className="w-2 h-2" />
                                  <span>{event.attendees.length}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legenda */}
        <div className="mt-4 pt-4 border-t flex items-center gap-4 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-blue-50 border border-blue-300"></div>
            <span>Hoje</span>
          </div>
          <div className="flex items-center gap-1">
            <Video className="w-3 h-3" />
            <span>Google Meet</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span>Participantes</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}