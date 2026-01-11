import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Maximize2, Clock, MapPin, User, Filter, Video, Users, ExternalLink, Phone, MessageCircle, Mail } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek, addMonths, subMonths, addDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const gerarIdAmigavel = (tipo, id, indice) => {
  const prefixos = {
    workshop: 'OF',
    colaborador: 'CL',
    atendimento: 'AT'
  };
  const prefixo = prefixos[tipo] || 'ID';
  const numero = String(indice).padStart(3, '0');
  return `${prefixo}${numero}`;
};

export default function AgendaVisual({ atendimentos = [], workshops = [] }) {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // 'day', 'week', 'month'
  const [selectedDate, setSelectedDate] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [detailsModal, setDetailsModal] = useState({ open: false, date: null, atendimentos: [] });
  const [consultorFiltro, setConsultorFiltro] = useState('todos');
  const [workshopsFrescos, setWorkshopsFrescos] = useState(workshops);

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

  const handleDayClick = async (day) => {
    const atendimentosDia = getAtendimentosForDay(day);
    if (atendimentosDia.length > 0) {
      try {
        // Recarregar workshops frescos do banco antes de enriquecer
        const workshopsAtualizados = await base44.entities.Workshop.list();
        setWorkshopsFrescos(workshopsAtualizados);
        
        console.log('Workshops recarregados:', workshopsAtualizados);
        
        // Enriquecer atendimentos com dados atualizados da oficina
        const atendimentosComWorkshop = atendimentosDia.map(a => {
          const workshopEncontrado = workshopsAtualizados.find(w => w.id === a.workshop_id);
          console.log('Workshop encontrado para atendimento:', {
            atendimento_id: a.id,
            workshop_id: a.workshop_id,
            workshop: workshopEncontrado,
            telefone: workshopEncontrado?.telefone,
            email: workshopEncontrado?.email
          });
          return {
            ...a,
            workshop: workshopEncontrado
          };
        });
        
        setDetailsModal({
          open: true,
          date: day,
          atendimentos: atendimentosComWorkshop
        });
      } catch (error) {
        console.error('Erro ao recarregar workshops:', error);
        toast.error('Erro ao carregar dados atualizados');
      }
    }
  };

  const iniciarAtendimento = async (atendimento) => {
    try {
      await base44.entities.ConsultoriaAtendimento.update(atendimento.id, {
        status: 'participando',
        hora_inicio_real: new Date().toISOString()
      });

      toast.success('Atendimento iniciado!');

      if (atendimento.google_meet_link) {
        window.open(atendimento.google_meet_link, '_blank');
      }

      const params = new URLSearchParams({ 
        atendimento_id: atendimento.id,
        fromAgenda: 'true',
        fullscreen: isFullScreen ? 'true' : 'false'
      });
      navigate(createPageUrl('RegistrarAtendimento') + '?' + params.toString());
      
      setDetailsModal({ ...detailsModal, open: false });
    } catch (error) {
      toast.error('Erro ao iniciar atendimento: ' + error.message);
    }
  };

  const enviarLembreteWhatsApp = async (atendimento, telefone) => {
    try {
      const workshop = atendimento.workshop;
      const dataFormatada = format(new Date(atendimento.data_agendada), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
      const mensagem = `🔔 *Lembrete de Reunião - Oficinas Master*\n\nOlá! Temos uma reunião agendada:\n\n📅 *Data:* ${dataFormatada}\n⏱️ *Duração:* ${atendimento.duracao_minutos} minutos\n🎯 *Tipo:* ${atendimento.tipo_atendimento.replace(/_/g, ' ')}\n🏢 *Empresa:* ${workshop?.name || 'Sua oficina'}\n\n${atendimento.google_meet_link ? `🔗 *Link do Google Meet:*\n${atendimento.google_meet_link}\n\n` : ''}Nos vemos em breve! 👋\n\n_Oficinas Master - Aceleração Empresarial_`;
      
      const numeroLimpo = telefone.replace(/\D/g, '');
      const whatsappUrl = `https://wa.me/55${numeroLimpo}?text=${encodeURIComponent(mensagem)}`;
      
      console.log('Abrindo WhatsApp:', whatsappUrl);
      window.open(whatsappUrl, '_blank');
      toast.success('WhatsApp aberto com lembrete!');
    } catch (error) {
      console.error('Erro ao abrir WhatsApp:', error);
      toast.error('Erro ao abrir WhatsApp');
    }
  };

  const enviarLembreteEmail = async (atendimento, email) => {
    try {
      const workshop = atendimento.workshop;
      const dataFormatada = format(new Date(atendimento.data_agendada), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
      
      // Enviar via integração da plataforma
      await base44.integrations.Core.SendEmail({
        to: email,
        subject: `Lembrete: Reunião agendada - ${dataFormatada}`,
        body: `
          <h2>Lembrete de Reunião</h2>
          <p>Olá!</p>
          <p>Temos uma reunião agendada:</p>
          <ul>
            <li><strong>Data:</strong> ${dataFormatada}</li>
            <li><strong>Duração:</strong> ${atendimento.duracao_minutos} minutos</li>
            <li><strong>Tipo:</strong> ${atendimento.tipo_atendimento.replace(/_/g, ' ')}</li>
            <li><strong>Empresa:</strong> ${workshop?.name || 'Sua oficina'}</li>
          </ul>
          ${atendimento.google_meet_link ? `
            <p><strong>Link do Google Meet:</strong></p>
            <p><a href="${atendimento.google_meet_link}" target="_blank">${atendimento.google_meet_link}</a></p>
          ` : ''}
          <p>Nos vemos em breve!</p>
          <br>
          <p><em>Oficinas Master - Aceleração Empresarial</em></p>
        `
      });
      
      toast.success('E-mail enviado com sucesso!');
    } catch (error) {
      console.error('Erro ao enviar e-mail:', error);
      toast.error('Erro ao enviar e-mail: ' + error.message);
    }
  };

  const fazerLigacao = (telefone) => {
    try {
      const telUrl = `tel:${telefone}`;
      console.log('Iniciando ligação:', telUrl);
      window.location.href = telUrl;
      toast.info('Discando...');
    } catch (error) {
      console.error('Erro ao fazer ligação:', error);
      toast.error('Erro ao iniciar ligação');
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
                  {atendimentosDia.slice(0, maxVisible).map((atendimento) => {
                    const workshop = workshops.find(w => w.id === atendimento.workshop_id);
                    return (
                      <div
                        key={atendimento.id}
                        className={`text-xs p-2 rounded border ${getStatusColor(atendimento.status)} hover:opacity-80 transition-opacity`}
                        onClick={(e) => {
                          e.stopPropagation();
                          const params = new URLSearchParams({ 
                            atendimento_id: atendimento.id,
                            fromAgenda: 'true',
                            fullscreen: isFullScreen ? 'true' : 'false'
                          });
                          navigate(createPageUrl('RegistrarAtendimento') + '?' + params.toString());
                        }}
                      >
                        <div className="font-semibold">{format(new Date(atendimento.data_agendada), 'HH:mm')}</div>
                        {viewMode !== 'month' && (
                          <>
                            <div className="text-[10px] mt-1 truncate">{workshop?.name || 'Cliente não identificado'}</div>
                            <div className="text-[10px] text-gray-600">{atendimento.tipo_atendimento}</div>
                          </>
                        )}
                      </div>
                    );
                  })}
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
            <DialogDescription>
              {detailsModal.atendimentos.length} atendimento{detailsModal.atendimentos.length !== 1 ? 's' : ''} agendado{detailsModal.atendimentos.length !== 1 ? 's' : ''} para este dia
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-4">
            {detailsModal.atendimentos.map((atendimento, idx) => {
              const workshop = atendimento.workshop;
              const podeIniciar = ['agendado', 'confirmado', 'reagendado'].includes(atendimento.status);
              const workshopIdAmigavel = gerarIdAmigavel('workshop', workshop?.id, idx + 1);
              
              // Buscar telefone da oficina (vários campos possíveis)
              const telefoneOficina = workshop?.telefone || workshop?.phone || workshop?.owner_phone;
              
              // Buscar participante principal
              const participantePrincipal = atendimento.participantes?.[0];
              const emailContato = participantePrincipal?.email || workshop?.email;
              
              console.log('Debug Atendimento:', {
                workshop_id: workshop?.id,
                workshop_name: workshop?.name,
                telefoneOficina,
                emailContato,
                participantes: atendimento.participantes,
                workshop_completo: workshop
              });
              
              return (
                <div
                  key={atendimento.id}
                  className={`p-4 rounded-lg border-2 ${getStatusColor(atendimento.status)} hover:shadow-md transition-shadow`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4" />
                      <span className="font-semibold">{format(new Date(atendimento.data_agendada), 'HH:mm')}</span>
                      <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
                        {workshopIdAmigavel}
                      </span>
                    </div>
                    <Badge className={getStatusColor(atendimento.status)}>
                      {atendimento.status}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 text-sm mb-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">{workshop?.name || 'Cliente não identificado'}</span>
                    </div>

                    {workshop?.owner_id && (
                      <div className="flex items-center gap-2 ml-6 text-gray-600">
                        <Users className="w-3 h-3" />
                        <span className="text-xs">
                          Proprietário: {gerarIdAmigavel('colaborador', workshop.owner_id, 1)}
                          {workshop.partner_ids?.length > 0 && ` + ${workshop.partner_ids.length} sócio(s)`}
                        </span>
                      </div>
                    )}

                    {/* Seção de Contato - Sempre visível */}
                    <div className="ml-6 space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">
                            {telefoneOficina || 'Sem telefone cadastrado'}
                          </span>
                        </div>
                      </div>
                      
                      {emailContato && (
                        <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                          <Mail className="w-3 h-3" />
                          <span>{emailContato}</span>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-green-600 border-green-300 hover:bg-green-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!telefoneOficina) {
                              toast.error('Telefone não cadastrado');
                              return;
                            }
                            enviarLembreteWhatsApp(atendimento, telefoneOficina);
                          }}
                          disabled={!telefoneOficina}
                        >
                          <MessageCircle className="w-3 h-3 mr-1" />
                          WhatsApp
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-blue-600 border-blue-300 hover:bg-blue-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!telefoneOficina) {
                              toast.error('Telefone não cadastrado');
                              return;
                            }
                            fazerLigacao(telefoneOficina);
                          }}
                          disabled={!telefoneOficina}
                        >
                          <Phone className="w-3 h-3 mr-1" />
                          Ligar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-purple-600 border-purple-300 hover:bg-purple-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!emailContato) {
                              toast.error('E-mail não cadastrado');
                              return;
                            }
                            enviarLembreteEmail(atendimento, emailContato);
                          }}
                          disabled={!emailContato}
                        >
                          <Mail className="w-3 h-3 mr-1" />
                          E-mail
                        </Button>
                      </div>
                    </div>

                    {participantePrincipal && (
                      <div className="flex items-center gap-2 ml-6 text-gray-600">
                        <User className="w-3 h-3" />
                        <span className="text-xs">{participantePrincipal.nome}</span>
                        {participantePrincipal.cargo && (
                          <span className="text-xs">({participantePrincipal.cargo})</span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-600">{atendimento.tipo_atendimento.replace(/_/g, ' ')}</span>
                    </div>

                    {atendimento.duracao_minutos && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span>Duração: {atendimento.duracao_minutos} min</span>
                      </div>
                    )}

                    {atendimento.google_meet_link && (
                      <div className="flex items-center gap-2 mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                        <Video className="w-4 h-4 text-blue-600" />
                        <a 
                          href={atendimento.google_meet_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Link do Meet
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2 border-t">
                    {podeIniciar && atendimento.google_meet_link && (
                      <Button
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          iniciarAtendimento(atendimento);
                        }}
                      >
                        <Video className="w-4 h-4 mr-2" />
                        Iniciar Atendimento
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        const params = new URLSearchParams({ 
                          atendimento_id: atendimento.id,
                          fromAgenda: 'true',
                          fullscreen: isFullScreen ? 'true' : 'false'
                        });
                        navigate(createPageUrl('RegistrarAtendimento') + '?' + params.toString());
                      }}
                    >
                      Ver Detalhes
                    </Button>
                  </div>
                </div>
              );
            })}
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