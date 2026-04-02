import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, AlertTriangle, FilePlus, Play, StopCircle, CalendarClock, FileText, CheckCircle, Trash2, Clock } from "lucide-react";
import GerarAtaModal from "./GerarAtaModal";
import VisualizarAtaModal from "./VisualizarAtaModal";
import ReagendarAtendimentoModal from "./ReagendarAtendimentoModal";
import FinalizarAtendimentoModal from "./FinalizarAtendimentoModal";
import FiltrosAtendimentos from "./FiltrosAtendimentos";
import DashboardAtendimentos from "./DashboardAtendimentos";
import { ATENDIMENTO_STATUS, ATENDIMENTO_STATUS_COLORS, ATENDIMENTO_STATUS_LABELS } from "@/components/lib/ataConstants";
import { format, subDays, subMonths, addMonths } from "date-fns";
import { toBrazilDate, formatDateTimeBR } from "@/utils/timezone";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";


export default function PainelAtendimentosTab({ user }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showGerarAta, setShowGerarAta] = useState(false);
  const [showVisualizarAta, setShowVisualizarAta] = useState(false);
  const [showReagendar, setShowReagendar] = useState(false);
  const [showFinalizar, setShowFinalizar] = useState(false);
  const [selectedAtendimento, setSelectedAtendimento] = useState(null);
  const [atendimentoFinalizar, setAtendimentoFinalizar] = useState(null);
  const [selectedAta, setSelectedAta] = useState(null);
  const processedIdsRef = useRef(new Set());
  const [activeTab, setActiveTab] = useState("todos");
  const [filtrosAtas, setFiltrosAtas] = useState({
    searchTerm: "",
    workshop_id: "",
    consultor_id: "",
    status: "",
    tipo_atendimento: "",
    preset: "custom",
    dateFrom: format(subMonths(new Date(), 6), "yyyy-MM-dd"),
    dateTo: format(addMonths(new Date(), 6), "yyyy-MM-dd")
  });

  const { data: atendimentos, isLoading } = useQuery({
    queryKey: ['todos-atendimentos'],
    queryFn: () => base44.entities.ConsultoriaAtendimento.list('-data_agendada'),
    refetchInterval: 30000
  });

  const { data: workshops } = useQuery({
    queryKey: ['workshops-lista'],
    queryFn: () => base44.entities.Workshop.list()
  });

  const { data: atas } = useQuery({
    queryKey: ['meeting-minutes'],
    queryFn: () => base44.entities.MeetingMinutes.list('-created_date')
  });

  const { data: planos } = useQuery({
    queryKey: ['planos-aceleracao'],
    queryFn: () => base44.entities.MonthlyAccelerationPlan.list('-created_date')
  });

  const { data: consultores } = useQuery({
    queryKey: ['consultores-list'],
    queryFn: async () => {
      const employees = await base44.entities.Employee.list();
      return employees.filter(e => e.job_role === 'acelerador' || e.position?.toLowerCase().includes('consultor'));
    }
  });

  useEffect(() => {
    if (!atendimentos) return;
    
    const now = toBrazilDate(new Date());

    atendimentos.forEach(atendimento => {
      if (processedIdsRef.current.has(atendimento.id)) return;
      
      const dataAtendimento = toBrazilDate(atendimento.data_agendada);
      
      if (now > dataAtendimento && 
          ![ATENDIMENTO_STATUS.REALIZADO, ATENDIMENTO_STATUS.PARTICIPANDO, ATENDIMENTO_STATUS.ATRASADO].includes(atendimento.status)) {
        marcarAtrasadoMutation.mutate(atendimento.id);
        processedIdsRef.current.add(atendimento.id);
      }
    });
  }, [atendimentos]);

  const marcarAtrasadoMutation = useMutation({
    mutationFn: (id) => base44.entities.ConsultoriaAtendimento.update(id, { status: ATENDIMENTO_STATUS.ATRASADO }),
    onSuccess: () => queryClient.invalidateQueries(['todos-atendimentos'])
  });

  const iniciarMutation = useMutation({
    mutationFn: (id) => base44.entities.ConsultoriaAtendimento.update(id, { 
      status: ATENDIMENTO_STATUS.PARTICIPANDO,
      hora_inicio_real: new Date().toISOString()
    }),
    onSuccess: (_, id) => {
      toast.success('Reunião iniciada!');
      queryClient.invalidateQueries(['todos-atendimentos']);
      navigate(createPageUrl('RegistrarAtendimento') + `?atendimento_id=${id}`);
    }
  });

  const finalizarMutation = useMutation({
    mutationFn: (id) => base44.entities.ConsultoriaAtendimento.update(id, { 
      status: ATENDIMENTO_STATUS.REALIZADO,
      data_realizada: new Date().toISOString(),
      hora_fim_real: new Date().toISOString()
    }),
    onSuccess: () => {
      toast.success('Atendimento finalizado!');
      queryClient.invalidateQueries(['todos-atendimentos']);
    }
  });

  const atendimentosFiltrados = (atendimentos || [])
    .filter(atendimento => {
      if (activeTab !== "todos" && atendimento.status !== activeTab) return false;
      // Aplicar filtros
      if (filtrosAtas.workshop_id && atendimento.workshop_id !== filtrosAtas.workshop_id) return false;
      if (filtrosAtas.consultor_id && atendimento.consultor_id !== filtrosAtas.consultor_id) return false;
      if (filtrosAtas.status && atendimento.status !== filtrosAtas.status) return false;
      if (filtrosAtas.tipo_atendimento && atendimento.tipo_atendimento !== filtrosAtas.tipo_atendimento) return false;
      
      // Filtro de data
      if (filtrosAtas.dateFrom) {
        const dataAtendimento = new Date(atendimento.data_agendada);
        const dataInicio = new Date(filtrosAtas.dateFrom);
        if (dataAtendimento < dataInicio) return false;
      }
      if (filtrosAtas.dateTo) {
        const dataAtendimento = new Date(atendimento.data_agendada);
        const dataFim = new Date(filtrosAtas.dateTo);
        dataFim.setHours(23, 59, 59, 999);
        if (dataAtendimento > dataFim) return false;
      }
      
      // Filtro de busca textual
      if (filtrosAtas.searchTerm) {
        const searchLower = filtrosAtas.searchTerm.toLowerCase();
        const workshop = workshops?.find(w => w.id === atendimento.workshop_id);
        const matchesSearch = 
          workshop?.name?.toLowerCase().includes(searchLower) ||
          atendimento.tipo_atendimento?.toLowerCase().includes(searchLower) ||
          atendimento.consultor_nome?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      return new Date(b.data_agendada) - new Date(a.data_agendada);
    });

  const handleAtaSaved = () => {
    queryClient.invalidateQueries(['todos-atendimentos']);
    queryClient.invalidateQueries(['meeting-minutes']);
    setShowGerarAta(false);
    setSelectedAtendimento(null);
  };

  return (
    <div className="space-y-6">
      {showGerarAta && selectedAtendimento && (
        <GerarAtaModal
          atendimento={selectedAtendimento}
          workshop={workshops?.find(w => w.id === selectedAtendimento.workshop_id)}
          planoAceleracao={planos?.find(p => p.workshop_id === selectedAtendimento.workshop_id)}
          onClose={() => {
            setShowGerarAta(false);
            setSelectedAtendimento(null);
          }}
          onSaved={handleAtaSaved}
        />
      )}

      {showVisualizarAta && selectedAta && (
        <VisualizarAtaModal
          ata={selectedAta}
          onClose={() => {
            setShowVisualizarAta(false);
            setSelectedAta(null);
          }}
        />
      )}

      {showReagendar && selectedAtendimento && (
        <ReagendarAtendimentoModal
          atendimento={selectedAtendimento}
          workshop={workshops?.find(w => w.id === selectedAtendimento.workshop_id)}
          onClose={() => {
            setShowReagendar(false);
            setSelectedAtendimento(null);
          }}
          onSaved={handleAtaSaved}
        />
      )}

      {showFinalizar && atendimentoFinalizar && (
        <FinalizarAtendimentoModal
          atendimento={atendimentoFinalizar}
          onClose={() => {
            setShowFinalizar(false);
            setAtendimentoFinalizar(null);
            queryClient.invalidateQueries(['todos-atendimentos']);
          }}
        />
      )}

      {/* Filtros de Atendimentos */}
      <FiltrosAtendimentos
        filters={filtrosAtas}
        onFiltersChange={setFiltrosAtas}
        workshops={workshops || []}
        consultores={consultores || []}
        isLoading={isLoading}
        onClearFilters={() => setFiltrosAtas({
          searchTerm: "",
          workshop_id: "",
          consultor_id: "",
          status: "",
          tipo_atendimento: "",
          preset: "custom",
          dateFrom: format(subMonths(new Date(), 6), "yyyy-MM-dd"),
          dateTo: format(addMonths(new Date(), 6), "yyyy-MM-dd")
        })}
      />

      {/* Dashboard de Estatísticas */}
      <DashboardAtendimentos atendimentos={atendimentosFiltrados} />



      {/* Tabela de Atendimentos */}
      <Tabs defaultValue="todos" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value={ATENDIMENTO_STATUS.ATRASADO}>Atrasados</TabsTrigger>
          <TabsTrigger value={ATENDIMENTO_STATUS.CONFIRMADO}>Confirmados</TabsTrigger>
          <TabsTrigger value={ATENDIMENTO_STATUS.REALIZADO}>Realizados</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab} className="mt-0">
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 border-r border-gray-100 last:border-r-0">ID ATA</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 border-r border-gray-100 last:border-r-0">Data</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 border-r border-gray-100 last:border-r-0">Cliente</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 border-r border-gray-100 last:border-r-0">Tipo</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 border-r border-gray-100 last:border-r-0">Status</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 border-r border-gray-100 last:border-r-0">Consultor</th>
                  <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700 border-r border-gray-100 last:border-r-0">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {atendimentosFiltrados.map((atendimento) => {
                  const workshop = workshops?.find(w => w.id === atendimento.workshop_id);
                  const ataVinculada = atas?.find(a => a.id === atendimento.ata_id);
                  return (
                    <tr key={atendimento.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6 text-sm text-gray-600 border-r border-gray-100 last:border-r-0">
                        <div className="flex items-center justify-center">
                          {ataVinculada?.code ? (
                            <span className="font-mono text-xs bg-blue-50 px-3 py-2 rounded border border-blue-200 whitespace-nowrap inline-block">
                              {ataVinculada.code.replace('IT.', 'AT.')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center gap-1.5 text-amber-600 bg-amber-50 px-3 py-2 rounded border border-amber-200 text-xs font-medium whitespace-nowrap" title="Aguardando geração da ATA">
                              <Clock className="w-3 h-3" />
                              Pendente
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-600 border-r border-gray-100 last:border-r-0 whitespace-nowrap">
                        {formatDateTimeBR(atendimento.data_agendada)}
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-600 border-r border-gray-100 last:border-r-0 font-medium">
                        {workshop?.name || '-'}
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-600 border-r border-gray-100 last:border-r-0 capitalize">
                        {atendimento.tipo_atendimento.replace(/_/g, ' ')}
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-600 border-r border-gray-100 last:border-r-0">
                        <Badge className={ATENDIMENTO_STATUS_COLORS[atendimento.status]}>
                          {atendimento.status === ATENDIMENTO_STATUS.ATRASADO && <AlertTriangle className="w-3 h-3 mr-1" />}
                          {ATENDIMENTO_STATUS_LABELS[atendimento.status]}
                        </Badge>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-600 border-r border-gray-100 last:border-r-0">
                        {atendimento.consultor_nome}
                      </td>
                      <td className="py-4 px-6 border-r border-gray-100 last:border-r-0">
                        <div className="flex items-center justify-end gap-1">
                          {(atendimento.status === ATENDIMENTO_STATUS.AGENDADO || 
                            atendimento.status === ATENDIMENTO_STATUS.CONFIRMADO || 
                            atendimento.status === ATENDIMENTO_STATUS.REAGENDADO || 
                            atendimento.status === ATENDIMENTO_STATUS.ATRASADO) && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => iniciarMutation.mutate(atendimento.id)}
                                title="Iniciar"
                              >
                                <Play className="w-4 h-4 text-blue-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedAtendimento(atendimento);
                                  setShowReagendar(true);
                                }}
                                title="Reagendar"
                              >
                                <CalendarClock className="w-4 h-4 text-purple-600" />
                              </Button>
                            </>
                          )}

                          {atendimento.status === ATENDIMENTO_STATUS.PARTICIPANDO && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => finalizarMutation.mutate(atendimento.id)}
                              title="Finalizar Rápido"
                            >
                              <StopCircle className="w-4 h-4 text-green-600" />
                            </Button>
                          )}

                          {(atendimento.status === ATENDIMENTO_STATUS.PARTICIPANDO || 
                            atendimento.status === ATENDIMENTO_STATUS.AGENDADO || 
                            atendimento.status === ATENDIMENTO_STATUS.CONFIRMADO || 
                            atendimento.status === ATENDIMENTO_STATUS.REAGENDADO || 
                            atendimento.status === ATENDIMENTO_STATUS.ATRASADO) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setAtendimentoFinalizar(atendimento);
                                setShowFinalizar(true);
                              }}
                              title="Finalizar Atendimento"
                            >
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(createPageUrl('RegistrarAtendimento') + `?atendimento_id=${atendimento.id}`)}
                            title="Editar"
                          >
                            <Edit className="w-4 h-4 text-gray-600" />
                          </Button>

                          {atendimento.ata_id && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={async () => {
                                  try {
                                    const ata = await base44.entities.MeetingMinutes.get(atendimento.ata_id);
                                    if (ata) {
                                      setSelectedAta(ata);
                                      setShowVisualizarAta(true);
                                    } else {
                                      toast.error("ATA não encontrada");
                                    }
                                  } catch (error) {
                                    toast.error("Erro ao carregar ATA");
                                  }
                                }}
                                title="Ver/Finalizar ATA"
                              >
                                <FileText className="w-4 h-4 text-green-600" />
                              </Button>

                            </>
                          )}

                          {!atendimento.ata_id && atendimento.status === ATENDIMENTO_STATUS.REALIZADO && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedAtendimento(atendimento);
                                setShowGerarAta(true);
                              }}
                              title="Gerar ATA"
                            >
                              <FilePlus className="w-4 h-4 text-blue-600" />
                            </Button>
                          )}

                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={async () => {
                              const confirmMessage = atendimento.ata_id 
                                ? "Tem certeza que deseja excluir esta ATA? Esta ação não pode ser desfeita."
                                : "Tem certeza que deseja excluir este registro de atendimento?";

                              if (confirm(confirmMessage)) {
                                try {
                                  if (atendimento.ata_id) {
                                    await base44.functions.invoke('deleteAta', { ata_id: atendimento.ata_id });
                                    toast.success("ATA excluída com sucesso!");
                                    queryClient.invalidateQueries(['meeting-minutes']);
                                  } else {
                                    await base44.entities.ConsultoriaAtendimento.delete(atendimento.id);
                                    toast.success("Atendimento excluído com sucesso!");
                                  }
                                  queryClient.invalidateQueries(['todos-atendimentos']);
                                } catch (error) {
                                  console.error(error);
                                  toast.error("Erro ao excluir: " + error.message);
                                }
                              }
                            }}
                            title={atendimento.ata_id ? "Excluir ATA" : "Excluir Atendimento"}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}