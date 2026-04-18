import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, FileText, Eye, Users, Target, Printer, MessageSquare, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ReactMarkdown from "react-markdown";
import AtaPrintLayout from "@/components/aceleracao/AtaPrintLayout";
import AtaSearchFilters from "@/components/aceleracao/AtaSearchFilters";
import { useAtaSearch } from "@/components/aceleracao/useAtaSearch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import EventosTab from "@/components/aceleracao/EventosTab";

export default function CronogramaConsultoria() {
  const navigate = useNavigate();
  const [selectedAtendimento, setSelectedAtendimento] = useState(null);
  const [showAta, setShowAta] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [filters, setFilters] = useState({
    searchTerm: "",
    workshop_id: "",
    consultor_id: "",
    status: "",
    tipo_aceleracao: "",
    dateFrom: "",
    dateTo: ""
  });

  // Carregar usuário
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  // Resolver workshop do contexto ativo
  const { data: workshop } = useQuery({
    queryKey: ['workshop-context', user?.id],
    queryFn: async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const urlWorkshopId = urlParams.get('workshop_id');

      if (urlWorkshopId) {
        return await base44.entities.Workshop.get(urlWorkshopId);
      }

      const workshopId = user?.workshop_id || user?.data?.workshop_id;
      if (workshopId) {
        return await base44.entities.Workshop.get(workshopId);
      }

      const employees = await base44.entities.Employee.filter({ user_id: user.id });
      if (employees.length > 0 && employees[0].workshop_id) {
        return await base44.entities.Workshop.get(employees[0].workshop_id);
      }

      const workshops = await base44.entities.Workshop.filter({ owner_id: user.id });
      return workshops[0] || null;
    },
    enabled: !!user
  });

  const activeWorkshopId = workshop?.id;

  // ✅ Filtro único por empresa logada — sem exceções por perfil
  // NOTA: queryKey alinhado com o usado em ControleAceleracao para que invalidações funcionem
  const { data: allAtendimentos, isLoading: loadingAtendimentos } = useQuery({
    queryKey: ['consultoria-atendimentos', user?.id, activeWorkshopId],
    queryFn: async () => {
      if (!activeWorkshopId) return [];
      return await base44.entities.ConsultoriaAtendimento.filter(
        { workshop_id: activeWorkshopId },
        '-data_agendada',
        500
      );
    },
    enabled: !!activeWorkshopId && !!user?.id,
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  const { data: allAtas, isLoading: loadingAtas } = useQuery({
    queryKey: ['meeting-minutes', activeWorkshopId],
    queryFn: async () => {
      if (!activeWorkshopId) return [];
      return await base44.entities.MeetingMinutes.filter(
        { workshop_id: activeWorkshopId },
        '-meeting_date'
      );
    },
    enabled: !!activeWorkshopId,
    staleTime: 0,
    gcTime: 0,
  });

  // Follow-ups realizados — filtrados por workshop_id ativo
  // queryKey alinhado com o usado em FollowUpPostIt para invalidação funcionar
  const { data: followUpsRealizados, isLoading: loadingFollowUps } = useQuery({
    queryKey: ['follow-up-reminders', activeWorkshopId],
    queryFn: async () => {
      if (!activeWorkshopId) return [];
      const all = await base44.entities.FollowUpReminder.filter(
        { workshop_id: activeWorkshopId, is_completed: true },
        '-completed_at'
      );
      return all;
    },
    enabled: !!activeWorkshopId,
    staleTime: 0,
    gcTime: 0,
  });

  const { data: consultores } = useQuery({
    queryKey: ['consultores-list', activeWorkshopId],
    queryFn: async () => {
      if (!activeWorkshopId) return [];
      const employees = await base44.entities.Employee.filter({ workshop_id: activeWorkshopId });
      return employees.filter(e => e.job_role === 'acelerador' || e.position?.toLowerCase().includes('consultor'));
    },
    enabled: !!activeWorkshopId
  });

  // Segmentação por data
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const proximosAtendimentos = (allAtendimentos || [])
    .filter(a => {
      const dataAtend = new Date(a.data_agendada);
      return dataAtend >= hoje && ['agendado', 'confirmado', 'remarcado', 'reagendado'].includes(a.status);
    })
    .sort((a, b) => new Date(a.data_agendada) - new Date(b.data_agendada)); // mais próximo primeiro

  const atasFiltradas = useAtaSearch(allAtas, filters);

  const isLoading = loadingAtendimentos || loadingAtas || loadingFollowUps;

  const getStatusColor = (status) => {
    const colors = {
      agendado: "bg-blue-100 text-blue-800",
      confirmado: "bg-green-100 text-green-800",
      realizado: "bg-gray-100 text-gray-800",
      cancelado: "bg-red-100 text-red-800",
      remarcado: "bg-yellow-100 text-yellow-800",
      reagendado: "bg-orange-100 text-orange-800",
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

  const handlePrintAta = (atendimento) => {
    setSelectedAtendimento(atendimento);
    setShowPrintPreview(true);
    setTimeout(() => window.print(), 100);
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

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Calendar className="w-8 h-8 text-blue-600" />
            Cronograma de Atendimento
          </h1>
          <p className="text-gray-600 mt-1">
            {workshop?.name && <span className="font-medium text-blue-700">{workshop.name}</span>}
          </p>
        </div>

        {activeWorkshopId && user?.role === 'admin' && (
          <Button
            onClick={() => navigate(createPageUrl('RegistrarAtendimento') + `?workshop_id=${activeWorkshopId}`)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Registrar Atendimento
          </Button>
        )}
      </div>

      {/* Card de resumo da oficina */}
      {workshop && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-sm text-blue-600 font-medium">Plano Atual</p>
                <p className="text-2xl font-bold text-blue-900">{workshop.planoAtual || 'FREE'}</p>
              </div>
              <div>
                <p className="text-sm text-blue-600 font-medium">Fase da Oficina</p>
                <p className="text-2xl font-bold text-blue-900">Fase {workshop.maturity_level || 1}</p>
              </div>
              <div>
                <p className="text-sm text-blue-600 font-medium">Próximos Agendamentos</p>
                <p className="text-2xl font-bold text-blue-900">{proximosAtendimentos.length}</p>
              </div>
              <div>
                <p className="text-sm text-blue-600 font-medium">Atas Disponíveis</p>
                <p className="text-2xl font-bold text-blue-900">{allAtas?.length || 0}</p>
              </div>
              <div>
                <p className="text-sm text-blue-600 font-medium">Follow-ups Realizados</p>
                <p className="text-2xl font-bold text-blue-900">{followUpsRealizados?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Abas principais */}
      <Tabs defaultValue="proximos">
        <TabsList className="w-full justify-start border-b bg-white rounded-none p-0 h-auto">
          <TabsTrigger
            value="proximos"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 data-[state=active]:bg-transparent px-6 py-3 font-medium"
          >
            <Clock className="w-4 h-4 mr-2" />
            Próximos Atendimentos
            {proximosAtendimentos.length > 0 && (
              <Badge className="ml-2 bg-blue-100 text-blue-800 text-xs">{proximosAtendimentos.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="atas"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 data-[state=active]:bg-transparent px-6 py-3 font-medium"
          >
            <FileText className="w-4 h-4 mr-2" />
            Atas de Reunião
            {(allAtas?.length || 0) > 0 && (
              <Badge className="ml-2 bg-gray-100 text-gray-700 text-xs">{allAtas?.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="followups"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 data-[state=active]:bg-transparent px-6 py-3 font-medium"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Follow-ups
            {(followUpsRealizados?.length || 0) > 0 && (
              <Badge className="ml-2 bg-green-100 text-green-700 text-xs">{followUpsRealizados?.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="eventos"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 data-[state=active]:bg-transparent px-6 py-3 font-medium"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Eventos
          </TabsTrigger>
        </TabsList>

        {/* ABA 1: Próximos Atendimentos */}
        <TabsContent value="proximos" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="w-5 h-5 text-blue-600" />
                Reuniões futuras — ordenadas do mais próximo ao mais distante
              </CardTitle>
            </CardHeader>
            <CardContent>
              {proximosAtendimentos.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Calendar className="w-14 h-14 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">Nenhum atendimento agendado</p>
                  <p className="text-sm mt-1">Novos agendamentos aparecerão aqui.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {proximosAtendimentos.map((atendimento) => (
                    <div
                      key={atendimento.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <Badge className={getStatusColor(atendimento.status)}>
                              {atendimento.status}
                            </Badge>
                            <span className="text-sm font-medium text-gray-800">
                              {getTipoLabel(atendimento.tipo_atendimento)}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Calendar className="w-4 h-4 text-blue-500" />
                              {format(new Date(atendimento.data_agendada), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Clock className="w-4 h-4 text-blue-500" />
                              {format(new Date(atendimento.data_agendada), "HH:mm")}
                              {atendimento.duracao_minutos && ` — ${atendimento.duracao_minutos} min`}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <User className="w-4 h-4 text-blue-500" />
                              {atendimento.consultor_nome || 'Consultor não definido'}
                            </div>
                            {atendimento.participantes?.length > 0 && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Users className="w-4 h-4 text-blue-500" />
                                {atendimento.participantes.length} participante(s)
                              </div>
                            )}
                          </div>

                          {atendimento.objetivos?.length > 0 && (
                            <div className="mt-3">
                              <p className="text-sm font-medium text-gray-700 flex items-center gap-1 mb-1">
                                <Target className="w-4 h-4" /> Objetivos:
                              </p>
                              <ul className="text-sm text-gray-600 ml-5 list-disc space-y-0.5">
                                {atendimento.objetivos.slice(0, 3).map((obj, idx) => (
                                  <li key={idx}>{obj}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {atendimento.google_meet_link && (
                            <a
                              href={atendimento.google_meet_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block mt-3 text-sm text-blue-600 underline hover:text-blue-800"
                            >
                              🎥 Entrar na reunião (Google Meet)
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 2: Atas de Reunião */}
        <TabsContent value="atas" className="mt-4">
          {/* Filtros */}
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

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="w-5 h-5 text-gray-600" />
                Atas de Reunião ({atasFiltradas?.length || 0})
                <span className="text-sm font-normal text-gray-500">— mais recente primeiro</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!atasFiltradas || atasFiltradas.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-14 h-14 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">Nenhuma ata encontrada</p>
                  <p className="text-sm mt-1">As atas geradas após os atendimentos aparecem aqui.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {atasFiltradas.map((ata) => {
                    const atendimento = allAtendimentos?.find(a => a.ata_id === ata.id);
                    return (
                      <div key={ata.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <Badge className={ata.status === 'finalizada' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                                {ata.status === 'finalizada' ? 'Finalizada' : 'Rascunho'}
                              </Badge>
                              <span className="text-sm font-medium text-gray-900">{ata.code}</span>
                              {ata.tipo_aceleracao && (
                                <Badge variant="outline" className="text-red-600 border-red-600 text-xs">
                                  {ata.tipo_aceleracao?.toUpperCase()}
                                </Badge>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                {format(new Date(ata.meeting_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                {ata.meeting_time && ` — ${ata.meeting_time}`}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <User className="w-4 h-4 text-gray-400" />
                                {ata.consultor_name || 'Consultor'}
                              </div>
                            </div>

                            {ata.pautas && (
                              <p className="mt-3 text-sm text-gray-600 line-clamp-2">
                                {ata.pautas.substring(0, 160)}...
                              </p>
                            )}
                          </div>

                          {/* Ações */}
                          <div className="flex flex-col gap-2 items-end shrink-0">
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    const ataCompleta = await base44.entities.MeetingMinutes.get(ata.id);
                                    setSelectedAtendimento({ ...atendimento, ata_ia: ataCompleta.pautas });
                                    setShowAta(true);
                                  } catch {
                                    toast.error("Erro ao carregar ATA");
                                  }
                                }}
                              >
                                <Eye className="w-4 h-4 mr-1" /> Ver
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePrintAta(atendimento || {})}
                                title="Imprimir Ata"
                              >
                                <Printer className="w-4 h-4" />
                              </Button>
                            </div>

                            {atendimento?.id && (
                              <div className="flex gap-2 pt-2 border-t w-full justify-end">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-green-600 hover:bg-green-50"
                                  title="Enviar via WhatsApp"
                                  onClick={async () => {
                                    try {
                                      const response = await base44.functions.invoke('enviarAtaWhatsApp', { atendimento_id: atendimento.id });
                                      const phone = response.data.phone?.replace(/\D/g, '') || '';
                                      const message = encodeURIComponent(response.data.whatsapp_message);
                                      window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
                                      toast.success("WhatsApp aberto!");
                                    } catch (e) {
                                      toast.error("Erro: " + e.message);
                                    }
                                  }}
                                >
                                  <MessageSquare className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-blue-600 hover:bg-blue-50"
                                  title="Enviar via E-mail"
                                  onClick={async () => {
                                    try {
                                      await base44.functions.invoke('enviarAtaEmail', { atendimento_id: atendimento.id });
                                      toast.success("Ata enviada por email!");
                                    } catch (e) {
                                      toast.error("Erro: " + e.message);
                                    }
                                  }}
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
        </TabsContent>

        {/* ABA 3: Follow-ups Realizados */}
        <TabsContent value="followups" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Histórico de Follow-ups Realizados ({followUpsRealizados?.length || 0})
                <span className="text-sm font-normal text-gray-500">— mais recente primeiro</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!followUpsRealizados || followUpsRealizados.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <CheckCircle2 className="w-14 h-14 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">Nenhum follow-up realizado ainda</p>
                  <p className="text-sm mt-1">Os follow-ups concluídos pelo consultor aparecem aqui.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {followUpsRealizados.map((fu) => {
                    const atendimento = allAtendimentos?.find(a => a.id === fu.atendimento_id);
                    return (
                      <div key={fu.id} className="border border-green-100 rounded-lg p-4 bg-green-50/40 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Realizado
                              </Badge>
                              {fu.sequence_number && (
                                <span className="text-xs text-gray-500 font-medium">
                                  Follow-up #{fu.sequence_number} · {fu.days_since_meeting} dias após atendimento
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Calendar className="w-4 h-4 text-green-500" />
                                <span>
                                  Data prevista: {fu.reminder_date
                                    ? format(new Date(fu.reminder_date), "dd/MM/yyyy", { locale: ptBR })
                                    : '—'}
                                </span>
                              </div>
                              {fu.completed_at && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                                  <span>
                                    Concluído em: {format(new Date(fu.completed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <User className="w-4 h-4 text-green-500" />
                                {fu.consultor_nome || 'Consultor'}
                              </div>
                              {atendimento && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <FileText className="w-4 h-4 text-green-500" />
                                  Ref: {atendimento.tipo_atendimento
                                    ? atendimento.tipo_atendimento.replace(/_/g, ' ')
                                    : 'Atendimento vinculado'}
                                </div>
                              )}
                            </div>

                            {fu.notes && (
                              <div className="mt-3 bg-white rounded-md border border-green-100 p-3">
                                <p className="text-xs font-medium text-gray-500 mb-1">Observações:</p>
                                <p className="text-sm text-gray-700">{fu.notes}</p>
                              </div>
                            )}

                            {!fu.notes && fu.message && (
                              <p className="mt-2 text-sm text-gray-500 italic line-clamp-2">{fu.message}</p>
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
        </TabsContent>
        {/* ABA 4: Eventos */}
        <TabsContent value="eventos" className="mt-4">
          {workshop ? (
            <EventosTab
              workshop={workshop}
              activeWorkshopId={activeWorkshopId}
              planoAtual={workshop.planoAtual || workshop.data?.planoAtual}
              user={user}
            />
          ) : (
            <div className="flex items-center justify-center py-16 text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3" />
              Carregando dados da oficina...
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal Ata */}
      {showAta && selectedAtendimento && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle>Ata da Reunião</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowAta(false)}>✕</Button>
              </div>
              {selectedAtendimento.data_realizada && (
                <p className="text-sm text-gray-600">
                  {format(new Date(selectedAtendimento.data_realizada), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              )}
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
          <AtaPrintLayout atendimento={selectedAtendimento} workshop={workshop} />
        </div>
      )}
    </div>
  );
}