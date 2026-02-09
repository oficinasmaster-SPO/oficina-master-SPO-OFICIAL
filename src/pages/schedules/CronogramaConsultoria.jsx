import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, FileText, Star, Eye, Download, Users, Target, Printer, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ReactMarkdown from "react-markdown";
import AtaPrintLayout from "@/components/aceleracao/AtaPrintLayout";
import AtaSearchFilters from "@/components/aceleracao/AtaSearchFilters";
import { useAtaSearch } from "@/components/aceleracao/useAtaSearch";

export default function CronogramaConsultoria() {
  const navigate = useNavigate();
  const [selectedAtendimento, setSelectedAtendimento] = useState(null);
  const [showAta, setShowAta] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const printRef = useRef();
  const [filters, setFilters] = useState({
    searchTerm: "",
    workshop_id: "",
    consultor_id: "",
    status: "",
    tipo_aceleracao: "",
    dateFrom: "",
    dateTo: ""
  });

  // Carregar usuário e workshop
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: workshop } = useQuery({
    queryKey: ['workshop', user?.id],
    queryFn: async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const adminWorkshopId = urlParams.get('workshop_id');
      const assistanceMode = urlParams.get('assistance_mode') === 'true';
      
      if (assistanceMode && adminWorkshopId) {
        return await base44.entities.Workshop.get(adminWorkshopId);
      }
      
      return await base44.entities.Workshop.get(user.workshop_id);
    },
    enabled: !!user?.workshop_id
  });

  // Carregar atendimentos
  const { data: allAtendimentos, isLoading } = useQuery({
    queryKey: ['consultoria-atendimentos', user?.workshop_id],
    queryFn: async () => {
      if (user?.role === 'admin') {
        return await base44.entities.ConsultoriaAtendimento.list('-data_agendada');
      } else {
        return await base44.entities.ConsultoriaAtendimento.filter({ 
          workshop_id: user.workshop_id 
        }, '-data_agendada');
      }
    },
    enabled: !!user
  });

  // Carregar ATAs
  const { data: allAtas } = useQuery({
    queryKey: ['meeting-minutes'],
    queryFn: async () => {
      if (user?.role === 'admin') {
        return await base44.entities.MeetingMinutes.list('-meeting_date');
      } else if (workshop?.id) {
        return await base44.entities.MeetingMinutes.filter({ workshop_id: workshop.id }, '-meeting_date');
      }
      return [];
    },
    enabled: !!user && (user.role === 'admin' || !!workshop?.id)
  });

  const { data: consultores } = useQuery({
    queryKey: ['consultores-list'],
    queryFn: async () => {
      const employees = await base44.entities.Employee.list();
      return employees.filter(e => e.job_role === 'acelerador' || e.position?.toLowerCase().includes('consultor'));
    }
  });

  const atasFiltradas = useAtaSearch(allAtas, filters);
  const atendimentos = allAtendimentos;

  const getStatusColor = (status) => {
    const colors = {
      agendado: "bg-blue-100 text-blue-800",
      confirmado: "bg-green-100 text-green-800",
      realizado: "bg-gray-100 text-gray-800",
      cancelado: "bg-red-100 text-red-800",
      remarcado: "bg-yellow-100 text-yellow-800"
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getTipoLabel = (tipo) => {
    const labels = {
      diagnostico_inicial: "Diagnóstico Inicial",
      acompanhamento_mensal: "Acompanhamento Mensal",
      reuniao_estrategica: "Reunião Estratégica",
      treinamento: "Treinamento",
      auditoria: "Auditoria",
      revisao_metas: "Revisão de Metas",
      outros: "Outros"
    };
    return labels[tipo] || tipo;
  };

  const handleDownloadAta = async (atendimento) => {
    if (!atendimento.ata_ia) return;
    
    const blob = new Blob([atendimento.ata_ia], { type: 'text/markdown' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ata_${format(new Date(atendimento.data_realizada || atendimento.data_agendada), 'yyyy-MM-dd')}.md`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  const handlePrintAta = (atendimento) => {
    setSelectedAtendimento(atendimento);
    setShowPrintPreview(true);
    
    // Aguardar renderização e chamar impressão
    setTimeout(() => {
      window.print();
    }, 100);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando cronograma...</p>
        </div>
      </div>
    );
  }

  const proximosAtendimentos = atendimentos?.filter(a => 
    ['agendado', 'confirmado'].includes(a.status)
  ) || [];

  const atendimentosRealizados = atendimentos?.filter(a => 
    a.status === 'realizado'
  ) || [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Calendar className="w-8 h-8 text-blue-600" />
            Cronograma de Consultoria
          </h1>
          <p className="text-gray-600 mt-2">
            Acompanhe seus atendimentos e acesse as atas das reuniões
          </p>
        </div>

        {user?.role === 'admin' && (
          <Button
            onClick={() => navigate(createPageUrl('RegistrarAtendimento'))}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Registrar Atendimento
          </Button>
        )}
      </div>

      {/* Informações do Plano */}
      {workshop && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Plano Atual</p>
                <p className="text-2xl font-bold text-blue-900">{workshop.planoAtual || 'FREE'}</p>
              </div>
              <div>
                <p className="text-sm text-blue-600 font-medium">Fase da Oficina</p>
                <p className="text-2xl font-bold text-blue-900">Fase {workshop.maturity_level || 1}</p>
              </div>
              <div>
                <p className="text-sm text-blue-600 font-medium">Atendimentos Realizados</p>
                <p className="text-2xl font-bold text-blue-900">{atendimentosRealizados.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Próximos Atendimentos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Próximos Atendimentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {proximosAtendimentos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>Nenhum atendimento agendado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {proximosAtendimentos.map((atendimento) => (
                <div
                  key={atendimento.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className={getStatusColor(atendimento.status)}>
                          {atendimento.status}
                        </Badge>
                        <span className="text-sm text-gray-600">
                          {getTipoLabel(atendimento.tipo_atendimento)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(atendimento.data_agendada), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          {format(new Date(atendimento.data_agendada), "HH:mm")} - {atendimento.duracao_minutos}min
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <User className="w-4 h-4" />
                          {atendimento.consultor_nome || 'Consultor'}
                        </div>
                        {atendimento.participantes?.length > 0 && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Users className="w-4 h-4" />
                            {atendimento.participantes.length} participante(s)
                          </div>
                        )}
                      </div>

                      {atendimento.objetivos && atendimento.objetivos.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-1">
                            <Target className="w-4 h-4" />
                            Objetivos:
                          </p>
                          <ul className="text-sm text-gray-600 ml-6 list-disc">
                            {atendimento.objetivos.slice(0, 2).map((obj, idx) => (
                              <li key={idx}>{obj}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Busca e Filtros de ATAs */}
      <AtaSearchFilters
        filters={filters}
        onFiltersChange={setFilters}
        workshops={workshop ? [workshop] : []}
        consultores={consultores || []}
        onClearFilters={() => setFilters({
          searchTerm: "",
          workshop_id: "",
          consultor_id: "",
          status: "",
          tipo_aceleracao: "",
          dateFrom: "",
          dateTo: ""
        })}
      />

      {/* Histórico de ATAs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-600" />
              Atas de Reunião ({atasFiltradas?.length || 0})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!atasFiltradas || atasFiltradas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>Nenhuma ata encontrada</p>
            </div>
          ) : (
            <div className="space-y-4">
              {atasFiltradas.map((ata) => {
                const atendimento = allAtendimentos?.find(a => a.ata_id === ata.id);
                return (
                <div
                  key={ata.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className={ata.status === 'finalizada' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {ata.status === 'finalizada' ? 'Finalizada' : 'Rascunho'}
                        </Badge>
                        <span className="text-sm font-medium text-gray-900">
                          {ata.code}
                        </span>
                        <Badge variant="outline" className="text-red-600 border-red-600">
                          {ata.tipo_aceleracao?.toUpperCase()}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(ata.meeting_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} - {ata.meeting_time}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <User className="w-4 h-4" />
                          {ata.consultor_name || 'Consultor'}
                        </div>
                      </div>

                      {ata.pautas && (
                        <div className="mt-3">
                          <p className="text-sm text-gray-700 line-clamp-2">
                            {ata.pautas.substring(0, 150)}...
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              const ataCompleta = await base44.entities.MeetingMinutes.get(ata.id);
                              setSelectedAtendimento({ ...atendimento, ata_ia: ataCompleta.pautas });
                              setShowAta(true);
                            } catch (error) {
                              toast.error("Erro ao carregar ATA");
                            }
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Ata
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedAtendimento(atendimento || {});
                            handlePrintAta(atendimento || {});
                          }}
                          title="Imprimir Ata"
                        >
                          <Printer className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Ações de Envio */}
                      {atendimento?.id && (
                        <div className="flex gap-2 pt-2 border-t">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={async () => {
                              try {
                                const response = await base44.functions.invoke('enviarAtaWhatsApp', {
                                  atendimento_id: atendimento.id
                                });
                                const phone = response.data.phone?.replace(/\D/g, '') || '';
                                const message = encodeURIComponent(response.data.whatsapp_message);
                                window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
                                toast.success("WhatsApp aberto!");
                              } catch (error) {
                                toast.error("Erro: " + error.message);
                              }
                            }}
                            title="Enviar via WhatsApp"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={async () => {
                              try {
                                await base44.functions.invoke('enviarAtaEmail', {
                                  atendimento_id: atendimento.id
                                });
                                toast.success("Ata enviada por email!");
                              } catch (error) {
                                toast.error("Erro: " + error.message);
                              }
                            }}
                            title="Enviar via E-mail"
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Ata */}
      {showAta && selectedAtendimento && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle>Ata da Reunião</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAta(false)}
                >
                  ✕
                </Button>
              </div>
              <p className="text-sm text-gray-600">
                {format(new Date(selectedAtendimento.data_realizada), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="prose max-w-none">
                <ReactMarkdown>{selectedAtendimento.ata_ia}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Preview de Impressão */}
      {showPrintPreview && selectedAtendimento && (
        <div className="hidden print:block">
          <AtaPrintLayout 
            atendimento={selectedAtendimento} 
            workshop={workshop}
          />
        </div>
      )}
    </div>
  );
}
