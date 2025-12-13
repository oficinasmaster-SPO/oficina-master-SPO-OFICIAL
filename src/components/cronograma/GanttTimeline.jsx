import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowRight } from "lucide-react";

export default function GanttTimeline({ items = [] }) {
  const validItems = items.filter(item => !item.not_started && item.data_inicio_real);
  
  if (validItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Timeline / Gantt</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500 py-8">
            Nenhuma tarefa iniciada para visualizar no timeline
          </p>
        </CardContent>
      </Card>
    );
  }

  const dates = validItems.map(item => ({
    start: parseISO(item.data_inicio_real),
    end: item.data_termino_real ? parseISO(item.data_termino_real) : parseISO(item.data_termino_previsto)
  }));

  const minDate = new Date(Math.min(...dates.map(d => d.start.getTime())));
  const maxDate = new Date(Math.max(...dates.map(d => d.end.getTime())));
  const totalDays = differenceInDays(maxDate, minDate) || 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Timeline / Gantt</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {validItems.map((item) => {
            const startDate = parseISO(item.data_inicio_real);
            const endDate = item.data_termino_real 
              ? parseISO(item.data_termino_real) 
              : parseISO(item.data_termino_previsto);
            
            const startOffset = differenceInDays(startDate, minDate);
            const duration = differenceInDays(endDate, startDate) || 1;
            
            const leftPercent = (startOffset / totalDays) * 100;
            const widthPercent = (duration / totalDays) * 100;

            const statusColor = 
              item.status === 'concluido' ? 'bg-green-500' :
              item.status === 'em_andamento' ? 'bg-blue-500' : 'bg-gray-400';

            const hasDependencies = item.dependencias && item.dependencias.length > 0;

            return (
              <div key={item.id} className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium w-48 truncate">{item.item_nome}</p>
                  {hasDependencies && (
                    <Badge variant="outline" className="text-xs">
                      {item.dependencias.length} dep.
                    </Badge>
                  )}
                </div>
                <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
                  <div
                    className={`absolute h-full ${statusColor} transition-all duration-300 rounded-lg flex items-center justify-between px-2`}
                    style={{
                      left: `${leftPercent}%`,
                      width: `${widthPercent}%`
                    }}
                  >
                    <span className="text-xs text-white font-medium">
                      {format(startDate, 'dd/MM', { locale: ptBR })}
                    </span>
                    <ArrowRight className="w-3 h-3 text-white" />
                    <span className="text-xs text-white font-medium">
                      {format(endDate, 'dd/MM', { locale: ptBR })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          <p className="text-xs text-gray-500">
            Início: {format(minDate, 'dd/MM/yyyy', { locale: ptBR })}
          </p>
          <p className="text-xs text-gray-500">
            Fim: {format(maxDate, 'dd/MM/yyyy', { locale: ptBR })}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}