import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AgendaVisual({ atendimentos = [] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const dateRange = eachDayOfInterval({ start: startDate, end: endDate });

  const getAtendimentosForDay = (day) => {
    return atendimentos.filter(a => 
      isSameDay(new Date(a.data_agendada), day)
    );
  };

  const getStatusColor = (status) => {
    const colors = {
      agendado: 'bg-blue-100 text-blue-700 border-blue-300',
      confirmado: 'bg-green-100 text-green-700 border-green-300',
      participando: 'bg-purple-100 text-purple-700 border-purple-300',
      realizado: 'bg-gray-100 text-gray-700 border-gray-300',
      faltou: 'bg-red-100 text-red-700 border-red-300',
      desmarcou: 'bg-orange-100 text-orange-700 border-orange-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Agenda do Mês
          </CardTitle>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-medium text-sm">
              {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
            </span>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-gray-600 p-2">
              {day}
            </div>
          ))}
          {dateRange.map((day, idx) => {
            const atendimentosDia = getAtendimentosForDay(day);
            const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={idx}
                className={`
                  min-h-[80px] p-1 border rounded
                  ${isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                  ${isToday ? 'border-blue-500 border-2' : 'border-gray-200'}
                `}
              >
                <div className={`text-xs font-medium ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}`}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-1 mt-1">
                  {atendimentosDia.slice(0, 2).map((atendimento) => (
                    <div
                      key={atendimento.id}
                      className={`text-[10px] p-1 rounded border ${getStatusColor(atendimento.status)}`}
                      title={`${atendimento.tipo_atendimento} - ${format(new Date(atendimento.data_agendada), 'HH:mm')}`}
                    >
                      {format(new Date(atendimento.data_agendada), 'HH:mm')}
                    </div>
                  ))}
                  {atendimentosDia.length > 2 && (
                    <div className="text-[10px] text-gray-500 text-center">
                      +{atendimentosDia.length - 2}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}