import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, AlertTriangle, FilePlus, Play, StopCircle, CalendarClock, FileText, CheckCircle, Trash2, Clock, ChevronDown, Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import GerarAtaModal from "./GerarAtaModal";
import VisualizarAtaModal from "./VisualizarAtaModal";
import ReagendarAtendimentoModal from "./ReagendarAtendimentoModal";
import FinalizarAtendimentoModal from "./FinalizarAtendimentoModal";
import FiltrosAtendimentos from "./FiltrosAtendimentos";
import DashboardAtendimentos from "./DashboardAtendimentos";
import { ATENDIMENTO_STATUS, ATENDIMENTO_STATUS_COLORS, ATENDIMENTO_STATUS_LABELS } from "@/components/lib/ataConstants";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { toBrazilDate, formatDateTimeBR } from "@/utils/timezone";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import RegistrarAtendimento from "@/pages/RegistrarAtendimento";


export default function PainelAtendimentosTab({ user }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showGerarAta, setShowGerarAta] = useState(false);
  const [showVisualizarAta, setShowVisualizarAta] = useState(false);
  const [showReagendar, setShowReagendar] = useState(false);
  const [showFinalizar, setShowFinalizar] = useState(false);
  const [showEditarAtendimento, setShowEditarAtendimento] = useState(false);
  const [editarAtendimentoId, setEditarAtendimentoId] = useState(null);
  const [selectedAtendimento, setSelectedAtendimento] = useState(null);
  const [atendimentoFinalizar, setAtendimentoFinalizar] = useState(null);
  const [selectedAta, setSelectedAta] = useState(null);
  const processedIdsRef = useRef(new Set());
  const [activeTab, setActiveTab] = useState("todos");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [filtrosAtas, setFiltrosAtas] = useState({
    searchTerm: "",
    workshop_id: "",
    consultor_id: "",
    status: "",
    tipo_atendimento: "",
    preset: "mes_atual",
    dateFrom: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    dateTo: format(endOfMonth(new Date()), "yyyy-MM-dd")
  });

  const { data: atendimentos, isLoading } = useQuery({
    queryKey: ['todos-atendimentos'],
    queryFn: () => base44.entities.ConsultoriaAtendimento.list('-data_agendada', 5000),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000
  });

  const { data: workshops } = useQuery({
    queryKey: ['workshops-ativos'],
    queryFn: async () => {
      const all = await base44.entities.Workshop.list(null, 5000);
      return all.filter(w => w.planoAtual && w.planoAtual !== 'FREE');
    }
  });

  const { data: atas } = useQuery({
    queryKey: ['meeting-minutes'],
    queryFn: () => base44.entities.MeetingMinutes.list('-created_date', 5000)
  });

  const { data: planos } = useQuery({
    queryKey: ['planos-aceleracao'],
    queryFn: () => base44.entities.MonthlyAccelerationPlan.list('-created_date')
  });

  const { data: consultores } = useQuery({
    queryKey: ['consultores-list'],
    queryFn: async () => {
      const employees = await base44.entities.Employee.filter({
        tipo_vinculo: 'interno',
        status: 'ativo'
      }, null, 1000);
      return employees;
    }
  });

  const processedOnceRef = useRef(false);
  useEffect(() => {
    if (!atendimentos || processedOnceRef.current) return;
    processedOnceRef.current = true;
    
    const now = toBrazilDate(new Date());

    // Collect IDs to update, then batch with small delay to avoid rate limit
    const idsToUpdate = [];
    atendimentos.forEach(atendimento => {
      if (processedIdsRef.current.has(atendimento.id)) return;
      
      const dataAtendimento = toBrazilDate(atendimento.data_agendada);
      
      if (now > dataAtendimento && 
          ![ATENDIMENTO_STATUS.REALIZADO, ATENDIMENTO_STATUS.PARTICIPANDO, ATENDIMENTO_STATUS.ATRASADO, ATENDIMENTO_STATUS.REAGENDADO].includes(atendimento.status)) {
        idsToUpdate.push(atendimento.id);
        processedIdsRef.current.add(atendimento.id);
      }
    });

    // Batch updates with staggered timing to avoid rate limit
    idsToUpdate.slice(0, 10).forEach((id, idx) => {
      setTimeout(() => marcarAtrasadoMutation.mutate(id), idx * 500);
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

      {showEditarAtendimento && editarAtendimentoId && (
        <RegistrarAtendimento
          isModal={true}
          atendimentoId={editarAtendimentoId}
          onClose={() => {
            setShowEditarAtendimento(false);
            setEditarAtendimentoId(null);
            queryClient.invalidateQueries(['todos-atendimentos']);
            queryClient.invalidateQueries(['meeting-minutes']);
          }}
        />
      )}



      {/* Dashboard de Estatísticas */}
      <DashboardAtendimentos atendimentos={atendimentosFiltrados} />



      {/* Tabela de Atendimentos */}
      <div className="w-full">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="inline-flex items-center rounded-lg bg-gray-100 p-1 gap-1">
          {[
            { value: 'todos', label: 'Todos' },
            { value: ATENDIMENTO_STATUS.AGENDADO, label: 'Agendados' },
            { value: ATENDIMENTO_STATUS.CONFIRMADO, label: 'Confirmados' },
            { value: ATENDIMENTO_STATUS.ATRASADO, label: 'Atrasados' },
            { value: ATENDIMENTO_STATUS.REAGENDADO, label: 'Reagendados' },
            { value: ATENDIMENTO_STATUS.REALIZADO, label: 'Realizados' },
          ].map(tab => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none
                ${activeTab === tab.value 
                  ? 'bg-red-600 text-white shadow-sm' 
                  : 'text-gray-600 hover:bg-red-600 hover:text-white'}`}
            >
              {tab.label}
            </button>
          ))}
          </div>
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              placeholder="Buscar cliente, tipo, consultor..."
              value={filtrosAtas.searchTerm || ""}
              onChange={(e) => setFiltrosAtas(prev => ({ ...prev, searchTerm: e.target.value }))}
              className="h-9 pl-8 text-sm bg-white border-gray-200 shadow-sm"
            />
            {filtrosAtas.searchTerm && (
              <button
                onClick={() => setFiltrosAtas(prev => ({ ...prev, searchTerm: "" }))}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <Select
            value={filtrosAtas.consultor_id || "all"}
            onValueChange={(v) => setFiltrosAtas(prev => ({ ...prev, consultor_id: v === "all" ? "" : v }))}
          >
            <SelectTrigger className="h-9 w-[180px] text-sm bg-white border-gray-200 shadow-sm">
              <SelectValue placeholder="Consultor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Consultores</SelectItem>
              {consultores?.map((c) => (
                <SelectItem key={c.id} value={c.user_id || c.id}>
                  {c.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/50">
                    <th className="text-left py-4 px-3 text-sm font-semibold text-gray-700 border-r border-gray-100">Consultor</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 border-r border-gray-100 last:border-r-0">ID ATA</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 border-r border-gray-100 last:border-r-0">Data</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 border-r border-gray-100 last:border-r-0">Cliente</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 border-r border-gray-100 last:border-r-0">Tipo</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 border-r border-gray-100 last:border-r-0">Status</th>
                    <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700 border-r border-gray-100 last:border-r-0">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {atendimentosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center">
                        <p className="text-gray-400 text-sm">Nada para ver aqui</p>
                      </td>
                    </tr>
                  ) : atendimentosFiltrados.map((atendimento) => {
                    const workshop = workshops?.find(w => w.id === atendimento.workshop_id);
                    const ataVinculada = atas?.find(a => a.id === atendimento.ata_id);
                    return (
                      <tr key={atendimento.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-3 text-sm text-gray-600 border-r border-gray-100 font-medium">
                          {atendimento.consultor_nome || '-'}
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-600 border-r border-gray-100 last:border-r-0">
                          <div className="flex items-center justify-center">
                            {ataVinculada?.code ? (
                              <span className="font-mono text-xs bg-blue-50 px-3 py-2.5 rounded border border-blue-200 whitespace-nowrap inline-flex items-center justify-center min-h-[2.5rem]">
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
                          {atendimento.status === ATENDIMENTO_STATUS.REALIZADO && !atendimento.ata_id ? (
                            <Badge className="bg-orange-100 text-orange-700 border-orange-300 animate-pulse flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              Realizado
                            </Badge>
                          ) : (
                            <Badge className={ATENDIMENTO_STATUS_COLORS[atendimento.status] || 'bg-gray-100 text-gray-800 border-gray-300'}>
                              {atendimento.status === ATENDIMENTO_STATUS.ATRASADO && <AlertTriangle className="w-3 h-3 mr-1" />}
                              {ATENDIMENTO_STATUS_LABELS[atendimento.status] || atendimento.status || 'Indefinido'}
                            </Badge>
                          )}
                        </td>
                        <td className="py-4 px-6 border-r border-gray-100 last:border-r-0">
                          <div className="flex items-center justify-end gap-1">
                            {(atendimento.status === ATENDIMENTO_STATUS.AGENDADO || 
                              atendimento.status === ATENDIMENTO_STATUS.CONFIRMADO || 
                              atendimento.status === ATENDIMENTO_STATUS.REAGENDADO || 
                              atendimento.status === ATENDIMENTO_STATUS.ATRASADO ||
                              !atendimento.status) && (
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

                            {(atendimento.status === ATENDIMENTO_STATUS.PARTICIPANDO || !atendimento.status) && (
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
                              atendimento.status === ATENDIMENTO_STATUS.ATRASADO ||
                              !atendimento.status) && (
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
                              onClick={() => {
                                setEditarAtendimentoId(atendimento.id);
                                setShowEditarAtendimento(true);
                              }}
                              title="Editar"
                            >
                              <Edit className="w-4 h-4 text-gray-600" />
                            </Button>

                            {atendimento.ata_id && (
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
                              onClick={() => setDeleteConfirm(atendimento)}
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
      </div>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              {deleteConfirm?.ata_id ? 'Excluir ATA' : 'Excluir Atendimento'}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                {deleteConfirm?.ata_id
                  ? 'Tem certeza que deseja excluir esta ATA? Esta ação não pode ser desfeita.'
                  : 'Tem certeza que deseja excluir este registro de atendimento? Esta ação não pode ser desfeita.'}
              </p>
              {deleteConfirm && (
                <div className="bg-gray-50 rounded-lg p-3 mt-3 text-sm text-gray-700 space-y-1">
                  <p><span className="font-medium">Tipo:</span> {deleteConfirm.tipo_atendimento?.replace(/_/g, ' ')}</p>
                  <p><span className="font-medium">Data:</span> {formatDateTimeBR(deleteConfirm.data_agendada)}</p>
                  <p><span className="font-medium">Consultor:</span> {deleteConfirm.consultor_nome || '-'}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={async (e) => {
                e.preventDefault();
                if (!deleteConfirm) return;
                setIsDeleting(true);
                try {
                  if (deleteConfirm.ata_id) {
                    await base44.functions.invoke('deleteAta', { ata_id: deleteConfirm.ata_id });
                    toast.success('ATA excluída com sucesso!');
                    queryClient.invalidateQueries(['meeting-minutes']);
                  } else {
                    await base44.entities.ConsultoriaAtendimento.delete(deleteConfirm.id);
                    toast.success('Atendimento excluído com sucesso!');
                  }
                  queryClient.invalidateQueries(['todos-atendimentos']);
                } catch (error) {
                  toast.error('Erro ao excluir: ' + error.message);
                } finally {
                  setIsDeleting(false);
                  setDeleteConfirm(null);
                }
              }}
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}