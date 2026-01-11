import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Maximize2, Clock, MapPin, User, Filter } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek, addMonths, subMonths, addDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AgendaVisual({ atendimentos = [] }) {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // 'day', 'week', 'month'
  const [selectedDate, setSelectedDate] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [detailsModal, setDetailsModal] = useState({ open: false, date: null, atendimentos: [] });
  const [consultorFiltro, setConsultorFiltro] = useState('todos');

  const getDateRange = () => {
    if (viewMode === 'day') {
      const day = selectedDate || new Date();
      return [day];
    } else if (viewMode === 'week') {
      const day = selectedDate || new Date();
      return eachDayOfInterval({ 
        start: startOfWeek(day), 
        end: endOfWeek(day) 
      });
    } else {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      const startDate = startOfWeek(monthStart);
      const endDate = endOfWeek(monthEnd);
      return eachDayOfInterval({ start: startDate, end: endDate });
    }
  };

  const dateRange = getDateRange();

  // Extrair lista de consultores únicos
  const consultores = useMemo(() => {
    const consultoresMap = new Map();
    atendimentos.forEach(a => {
      if (a.consultor_id && a.consultor_nome) {
        consultoresMap.set(a.consultor_id, a.consultor_nome);
      }
    });
    return Array.from(consultoresMap.entries()).map(([id, nome]) => ({ id, nome }));
  }, [atendimentos]);

  // Filtrar atendimentos por consultor
  const atendimentosFiltrados = useMemo(() => {
    if (consultorFiltro === 'todos') return atendimentos;
    return atendimentos.filter(a => a.consultor_id === consultorFiltro);
  }, [atendimentos, consultorFiltro]);

  const getAtendimentosForDay = (day) => {
    return atendimentosFiltrados.filter(a => 
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

  const handleDayClick = (day) => {
    const atendimentosDia = getAtendimentosForDay(day);
    if (atendimentosDia.length > 0) {
      setDetailsModal({
        open: true,
        date: day,
        atendimentos: atendimentosDia
      });
    }
  };

  const navigateDate = (direction) => {
    if (viewMode === 'day') {
      setSelectedDate(prev => addDays(prev || new Date(), direction === 'next' ? 1 : -1));
    } else if (viewMode === 'week') {
      setSelectedDate(prev => addDays(prev || new Date(), direction === 'next' ? 7 : -7));
    } else {
      setCurrentMonth(direction === 'next' ? addMonths(currentMonth, 1) : subMonths(currentMonth, 1));
    }
  };

  const getViewTitle = () => {
    if (viewMode === 'day') {
      return format(selectedDate || new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } else if (viewMode === 'week') {
      const day = selectedDate || new Date();
      const start = startOfWeek(day);
      const end = endOfWeek(day);
      return `${format(start, 'dd/MM')} - ${format(end, 'dd/MM/yyyy')}`;
    } else {
      return format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR });
    }
  };

  const content = (
    <>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Agenda Visual
          </CardTitle>
          
          <div className="flex items-center gap-3 flex-wrap">
            {/* Filtro de Consultor */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-600" />
              <Select value={consultorFiltro} onValueChange={setConsultorFiltro}>
                <SelectTrigger className="w-[180px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os consultores</SelectItem>
                  {consultores.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Modo de Visualização */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <Button
                size="sm"
                variant={viewMode === 'day' ? 'default' : 'ghost'}
                onClick={() => {
                  setViewMode('day');
                  setSelectedDate(new Date());
                }}
                className="h-7 text-xs"
              >
                Dia
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'week' ? 'default' : 'ghost'}
                onClick={() => {
                  setViewMode('week');
                  setSelectedDate(new Date());
                }}
                className="h-7 text-xs"
              >
                Semana
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'month' ? 'default' : 'ghost'}
                onClick={() => setViewMode('month')}
                className="h-7 text-xs"
              >
                Mês
              </Button>
            </div>

            {/* Navegação */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateDate('prev')}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="font-medium text-sm min-w-[200px] text-center">
                {getViewTitle()}
              </span>
              <button
                onClick={() => navigateDate('next')}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Botão Tela Cheia */}
            {!isFullScreen && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsFullScreen(true)}
                className="h-7"
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className={`grid gap-1 ${viewMode === 'month' ? 'grid-cols-7' : viewMode === 'week' ? 'grid-cols-7' : 'grid-cols-1'}`}>
          {viewMode !== 'day' && ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-gray-600 p-2">
              {day}
            </div>
          ))}
          {dateRange.map((day, idx) => {
            const atendimentosDia = getAtendimentosForDay(day);
            const isCurrentMonth = viewMode === 'month' ? day.getMonth() === currentMonth.getMonth() : true;
            const isToday = isSameDay(day, new Date());
            const maxVisible = viewMode === 'day' ? 10 : viewMode === 'week' ? 3 : 2;

            return (
              <div
                key={idx}
                className={`
                  ${viewMode === 'day' ? 'min-h-[500px]' : viewMode === 'week' ? 'min-h-[120px]' : 'min-h-[80px]'} 
                  p-2 border rounded cursor-pointer hover:bg-gray-50 transition-colors
                  ${isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                  ${isToday ? 'border-blue-500 border-2' : 'border-gray-200'}
                `}
                onClick={() => handleDayClick(day)}
              >
                <div className={`text-sm font-medium mb-2 ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}`}>
                  {viewMode === 'day' 
                    ? format(day, "EEEE, dd 'de' MMMM", { locale: ptBR })
                    : format(day, 'd')}
                </div>
                <div className="space-y-1">
                  {atendimentosDia.slice(0, maxVisible).map((atendimento) => (
                    <div
                      key={atendimento.id}
                      className={`text-xs p-2 rounded border ${getStatusColor(atendimento.status)} hover:opacity-80 transition-opacity`}
                      onClick={(e) => {
                        e.stopPropagation();
                        const params = new URLSearchParams({ 
                          atendimento_id: atendimento.id,
                          fromAgenda: 'true'
                        });
                        navigate(createPageUrl('RegistrarAtendimento') + '?' + params.toString());
                      }}
                    >
                      <div className="font-semibold">{format(new Date(atendimento.data_agendada), 'HH:mm')}</div>
                      {viewMode !== 'month' && (
                        <>
                          <div className="text-[10px] mt-1 truncate">{atendimento.workshop?.name || 'Cliente'}</div>
                          <div className="text-[10px] text-gray-600">{atendimento.tipo_atendimento}</div>
                        </>
                      )}
                    </div>
                  ))}
                  {atendimentosDia.length > maxVisible && (
                    <div className="text-xs text-gray-500 text-center font-medium cursor-pointer hover:text-blue-600">
                      +{atendimentosDia.length - maxVisible} mais
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>

      {/* Modal de Detalhes do Dia */}
      <Dialog open={detailsModal.open} onOpenChange={(open) => setDetailsModal({ ...detailsModal, open })}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-blue-600" />
              {detailsModal.date && format(detailsModal.date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </DialogTitle>
            <p className="text-sm text-gray-600 mt-1">
              {detailsModal.atendimentos.length} atendimento{detailsModal.atendimentos.length !== 1 ? 's' : ''}
            </p>
          </DialogHeader>

          <div className="space-y-3 mt-4">
            {detailsModal.atendimentos.map((atendimento) => (
              <div
                key={atendimento.id}
                className={`p-4 rounded-lg border-2 ${getStatusColor(atendimento.status)} cursor-pointer hover:shadow-md transition-shadow`}
                onClick={() => {
                  const params = new URLSearchParams({ 
                    atendimento_id: atendimento.id,
                    fromAgenda: 'true'
                  });
                  navigate(createPageUrl('RegistrarAtendimento') + '?' + params.toString());
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span className="font-semibold">{format(new Date(atendimento.data_agendada), 'HH:mm')}</span>
                  </div>
                  <Badge className={getStatusColor(atendimento.status)}>
                    {atendimento.status}
                  </Badge>
                </div>
                
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">{atendimento.workshop?.name || 'Cliente não identificado'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">{atendimento.tipo_atendimento}</span>
                  </div>
                  {atendimento.duracao_minutos && (
                    <div className="text-gray-600">Duração: {atendimento.duracao_minutos} min</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );

  return isFullScreen ? (
    <Dialog open={isFullScreen} onOpenChange={setIsFullScreen}>
      <DialogContent className="max-w-[98vw] max-h-[98vh] w-full h-full p-0">
        <Card className="border-0 h-full">
          {content}
        </Card>
      </DialogContent>
    </Dialog>
  ) : (
    <Card>
      {content}
    </Card>
  );
}