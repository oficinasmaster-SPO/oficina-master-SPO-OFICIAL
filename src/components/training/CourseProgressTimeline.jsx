import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, PlayCircle, XCircle } from "lucide-react";
import { format } from "date-fns";

export default function CourseProgressTimeline({ progressHistory }) {
  if (!progressHistory || progressHistory.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-slate-500">
          Nenhum histórico disponível ainda
        </CardContent>
      </Card>
    );
  }

  const getEventIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'in_progress':
        return <PlayCircle className="w-4 h-4 text-blue-600" />;
      case 'completed_with_failure':
        return <XCircle className="w-4 h-4 text-orange-600" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      'completed': 'Concluído',
      'in_progress': 'Em Progresso',
      'not_started': 'Não Iniciado',
      'completed_with_failure': 'Concluído com Pendências'
    };
    return labels[status] || status;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Linha do Tempo de Aprendizado</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-200" />

          <div className="space-y-4">
            {progressHistory.map((event, idx) => (
              <div key={idx} className="relative flex items-start gap-4 pl-10">
                {/* Icon */}
                <div className="absolute left-2 top-1 w-5 h-5 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center">
                  {getEventIcon(event.status)}
                </div>

                {/* Content */}
                <div className="flex-1 bg-slate-50 rounded-lg p-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="font-medium text-sm">{event.lesson_title}</p>
                    <Badge variant="outline" className="text-xs">
                      {getStatusLabel(event.status)}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500">
                    {event.last_access_date && format(new Date(event.last_access_date), "dd/MM/yyyy HH:mm")}
                  </p>
                  {event.watch_time_seconds > 0 && (
                    <p className="text-xs text-slate-600 mt-1">
                      Tempo: {Math.floor(event.watch_time_seconds / 60)} minutos
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}