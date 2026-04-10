import React, { useState, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@/components/hooks/useDebounce";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, AlertTriangle, FilePlus, Play, StopCircle, CalendarClock, FileText, CheckCircle, Trash2, Clock, Search, X, CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import GerarAtaModal from "./GerarAtaModal";
import VisualizarAtaModal from "./VisualizarAtaModal";
import ReagendarAtendimentoModal from "./ReagendarAtendimentoModal";
import FinalizarAtendimentoModal from "./FinalizarAtendimentoModal";
import DashboardAtendimentos from "./DashboardAtendimentos";
import { ATENDIMENTO_STATUS, ATENDIMENTO_STATUS_COLORS, ATENDIMENTO_STATUS_LABELS } from "@/components/lib/ataConstants";
import { format } from "date-fns";
import { toBrazilDate, formatDateTimeBR } from "@/utils/timezone";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import RegistrarAtendimento from "@/pages/RegistrarAtendimento";

export default function PainelAtendimentosTab({ state }) {
  const { user, workshops, workshopMap, atendimentos, consultores, atas, atasMap, planos, filtros, setFiltros } = state;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ── UI state (local only — not filter state) ──
  const [showGerarAta, setShowGerarAta] = useState(false);
  const [showVisualizarAta, setShowVisualizarAta] = useState(false);
  const [showReagendar, setShowReagendar] = useState(false);
  const [showFinalizar, setShowFinalizar] = useState(false);
  const [showEditarAtendimento, setShowEditarAtendimento] = useState(false);
  const [editarAtendimentoId, setEditarAtendimentoId] = useState(null);
  const [selectedAtendimento, setSelectedAtendimento] = useState(null);
  const [atendimentoFinalizar, setAtendimentoFinalizar] = useState(null);
  const [selectedAta, setSelectedAta] = useState(null);
  const [activeTab, setActiveTab] = useState("todos");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteFollowUp, setDeleteFollowUp] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Filtros LOCAIS da aba (apenas search — datas vêm da URL via filtros) ──
  const [localFilters, setLocalFilters] = useState({
    searchTerm: ""
  });

  // Auto-mark de atrasados agora é feito server-side via markAtrasados function
  // Chamado uma vez no ControleAceleracaoView ao montar

  const iniciarMutation = useMutation({
    mutationFn: (id) => base44.entities.ConsultoriaAtendimento.update(id, { 
      status: ATENDIMENTO_STATUS.PARTICIPANDO,
      hora_inicio_real: new Date().toISOString()
    }),
    onSuccess: (_, id) => {
      toast.success('Reunião iniciada!');
      queryClient.invalidateQueries({ queryKey: ['atendimentos-acelerador'] });
      navigate(createPageUrl('RegistrarAtendimento') + `?atendimento_id=${id}`);
    }
  });



  // ── Debounce search for perf ──
  const debouncedSearch = useDebounce(localFilters.searchTerm, 300);

  // ── Filtragem local (memoized) ──
  const atendimentosFiltrados = useMemo(() => {
    return atendimentos
      .filter(a => {
        if (activeTab !== "todos" && a.status !== activeTab) return false;
        
        if (filtros.dataInicio) {
          if (new Date(a.data_agendada) < new Date(filtros.dataInicio)) return false;
        }
        if (filtros.dataFim) {
          const df = new Date(filtros.dataFim);
          df.setHours(23, 59, 59, 999);
          if (new Date(a.data_agendada) > df) return false;
        }
        
        if (debouncedSearch) {
          const s = debouncedSearch.toLowerCase();
          const ws = workshopMap[a.workshop_id];
          if (!(ws?.name?.toLowerCase().includes(s) ||
                a.tipo_atendimento?.toLowerCase().includes(s) ||
                a.consultor_nome?.toLowerCase().includes(s))) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.data_agendada) - new Date(a.data_agendada));
  }, [atendimentos, activeTab, filtros.dataInicio, filtros.dataFim, debouncedSearch, workshopMap]);

  const handleAtaSaved = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['atendimentos-acelerador'] });
    queryClient.invalidateQueries({ queryKey: ['meeting-minutes'] });
    setShowGerarAta(false);
    setSelectedAtendimento(null);
  }, [queryClient]);

  return (
    <div className="space-y-6">
      {showGerarAta && selectedAtendimento && (
        <GerarAtaModal
          atendimento={selectedAtendimento}
          workshop={workshops.find(w => w.id === selectedAtendimento.workshop_id)}
          planoAceleracao={planos.find(p => p.workshop_id === selectedAtendimento.workshop_id)}
          onClose={() => { setShowGerarAta(false); setSelectedAtendimento(null); }}
          onSaved={handleAtaSaved}
        />
      )}

      {showVisualizarAta && selectedAta && (
        <VisualizarAtaModal ata={selectedAta} onClose={() => { setShowVisualizarAta(false); setSelectedAta(null); }} />
      )}

      {showReagendar && selectedAtendimento && (
        <ReagendarAtendimentoModal
          atendimento={selectedAtendimento}
          workshop={workshops.find(w => w.id === selectedAtendimento.workshop_id)}
          onClose={() => { setShowReagendar(false); setSelectedAtendimento(null); }}
          onSaved={handleAtaSaved}
        />
      )}

      {showFinalizar && atendimentoFinalizar && (
        <FinalizarAtendimentoModal
          atendimento={atendimentoFinalizar}
          onClose={() => {
            setShowFinalizar(false);
            setAtendimentoFinalizar(null);
            queryClient.invalidateQueries({ queryKey: ['atendimentos-acelerador'] });
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
            queryClient.invalidateQueries({ queryKey: ['atendimentos-acelerador'] });
            queryClient.invalidateQueries({ queryKey: ['meeting-minutes'] });
          }}
        />
      )}

      <DashboardAtendimentos atendimentos={atendimentosFiltrados} />

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
              value={localFilters.searchTerm}
              onChange={(e) => setLocalFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
              className="h-9 pl-8 pr-16 text-sm bg-white border-gray-200 shadow-sm"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {localFilters.searchTerm && (
                <button onClick={() => setLocalFilters(prev => ({ ...prev, searchTerm: "" }))} className="text-gray-400 hover:text-gray-600 p-0.5">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <Popover>
                <PopoverTrigger asChild>
                  <button className={`p-0.5 rounded transition-colors ${filtros.preset !== 'mes_atual' ? 'text-red-600' : 'text-gray-400 hover:text-gray-600'}`}>
                    <CalendarDays className="w-4 h-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3" align="end">
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-gray-700">Filtrar por data</p>
                    <div className="flex gap-2">
                      {[{v:'7d',l:'7d'},{v:'15d',l:'15d'},{v:'30d',l:'30d'},{v:'mes_atual',l:'Mês'}].map(p => (
                        <button
                          key={p.v}
                          onClick={() => setFiltros({ ...filtros, preset: p.v })}
                          className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                            filtros.preset === p.v ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-gray-200 hover:border-red-300'
                          }`}
                        >
                          {p.l}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-500">De</Label>
                      <Input type="date" value={filtros.dataInicio || ''} onChange={(e) => setFiltros({ ...filtros, preset: 'custom', dataInicio: e.target.value })} className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-500">Até</Label>
                      <Input type="date" value={filtros.dataFim || ''} onChange={(e) => setFiltros({ ...filtros, preset: 'custom', dataFim: e.target.value })} className="h-8 text-xs" />
                    </div>
                    {filtros.preset !== 'mes_atual' && (
                      <button onClick={() => setFiltros({ ...filtros, preset: 'mes_atual' })} className="text-xs text-red-600 hover:underline w-full text-center">
                        Limpar datas
                      </button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          {/* Consultor info — read-only, controlled by global filter */}
          {state.consultorEfetivo && (
            <div className="h-9 px-3 flex items-center text-sm text-gray-500 bg-gray-50 border rounded-md">
              Consultor: {consultores.find(c => c.id === state.consultorEfetivo)?.full_name || 'Selecionado'}
            </div>
          )}
        </div>

        <Card>
          <CardContent className="pt-4 px-2 sm:px-3 lg:px-4 xl:px-5">
            <div className="w-full overflow-x-auto">
              <table className="w-full" style={{ minWidth: '900px' }}>
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/50">
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-100" style={{ width: '120px' }}>Consultor</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-100" style={{ width: '110px' }}>ID ATA</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-100" style={{ width: '130px' }}>Criado em</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-100" style={{ width: '130px' }}>Data</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-100">Cliente</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-100" style={{ width: '110px' }}>Tipo</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-100" style={{ width: '110px' }}>Status</th>
                    <th className="text-right py-3 px-3 text-xs font-semibold text-gray-600 uppercase tracking-wider" style={{ width: '220px', minWidth: '220px' }}>Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {atendimentosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center">
                        <p className="text-gray-400 text-sm">Nada para ver aqui</p>
                      </td>
                    </tr>
                  ) : atendimentosFiltrados.map((atendimento) => {
                    const workshop = workshopMap[atendimento.workshop_id];
                    const ataVinculada = atasMap[atendimento.ata_id];
                    return (
                      <tr key={atendimento.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-3 text-sm text-gray-700 border-r border-gray-100 font-medium truncate" title={atendimento.consultor_nome || '-'}>
                          {atendimento.consultor_nome || '-'}
                        </td>
                        <td className="py-3 px-3 text-sm text-gray-600 border-r border-gray-100">
                          <div className="flex items-center justify-center">
                            {ataVinculada?.code ? (
                              <span className="font-mono text-[11px] bg-blue-50 px-2 py-1.5 rounded border border-blue-200 whitespace-nowrap inline-flex items-center justify-center">
                                {ataVinculada.code.replace('IT.', 'AT.')}
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center gap-1 text-amber-600 bg-amber-50 px-2 py-1.5 rounded border border-amber-200 text-[11px] font-medium whitespace-nowrap">
                                <Clock className="w-3 h-3" />
                                Pendente
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-sm text-gray-500 border-r border-gray-100 whitespace-nowrap">
                          {atendimento.created_date ? formatDateTimeBR(atendimento.created_date) : '-'}
                        </td>
                        <td className="py-3 px-3 text-sm text-gray-600 border-r border-gray-100 whitespace-nowrap">
                          {formatDateTimeBR(atendimento.data_agendada)}
                        </td>
                        <td className="py-3 px-3 text-sm text-gray-700 border-r border-gray-100 font-medium truncate" title={workshop?.name || '-'}>
                          {workshop?.name || '-'}
                        </td>
                        <td className="py-3 px-3 text-sm text-gray-600 border-r border-gray-100 capitalize truncate" title={atendimento.tipo_atendimento?.replace(/_/g, ' ') || '-'}>
                          {atendimento.tipo_atendimento?.replace(/_/g, ' ') || '-'}
                        </td>
                        <td className="py-3 px-3 text-sm text-gray-600 border-r border-gray-100">
                          {atendimento.status === ATENDIMENTO_STATUS.REALIZADO && !atendimento.ata_id ? (
                            <Badge className="bg-orange-100 text-orange-700 border-orange-300 animate-pulse inline-flex items-center gap-1 text-[11px] px-2 py-1">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              Realizado
                            </Badge>
                          ) : (
                            <Badge className={`${ATENDIMENTO_STATUS_COLORS[atendimento.status] || 'bg-gray-100 text-gray-800 border-gray-300'} text-[11px] px-2 py-1 inline-flex items-center`}>
                              {atendimento.status === ATENDIMENTO_STATUS.ATRASADO && <AlertTriangle className="w-3 h-3 mr-1" />}
                              {ATENDIMENTO_STATUS_LABELS[atendimento.status] || atendimento.status || 'Indefinido'}
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center justify-end gap-0 flex-nowrap flex-shrink-0">
                            {(atendimento.status === ATENDIMENTO_STATUS.AGENDADO || 
                              atendimento.status === ATENDIMENTO_STATUS.CONFIRMADO || 
                              atendimento.status === ATENDIMENTO_STATUS.REAGENDADO || 
                              atendimento.status === ATENDIMENTO_STATUS.ATRASADO ||
                              !atendimento.status) && (
                              <>
                                <Button variant="ghost" size="sm" onClick={() => iniciarMutation.mutate(atendimento.id)} title="Iniciar">
                                  <Play className="w-4 h-4 text-blue-600" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => { setSelectedAtendimento(atendimento); setShowReagendar(true); }} title="Reagendar">
                                  <CalendarClock className="w-4 h-4 text-purple-600" />
                                </Button>
                              </>
                            )}



                            {(atendimento.status === ATENDIMENTO_STATUS.PARTICIPANDO || 
                              atendimento.status === ATENDIMENTO_STATUS.AGENDADO || 
                              atendimento.status === ATENDIMENTO_STATUS.CONFIRMADO || 
                              atendimento.status === ATENDIMENTO_STATUS.REAGENDADO || 
                              atendimento.status === ATENDIMENTO_STATUS.ATRASADO ||
                              !atendimento.status) && (
                              <Button variant="ghost" size="sm" onClick={() => { setAtendimentoFinalizar(atendimento); setShowFinalizar(true); }} title="Finalizar Atendimento">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              </Button>
                            )}

                            <Button variant="ghost" size="sm" onClick={() => { setEditarAtendimentoId(atendimento.id); setShowEditarAtendimento(true); }} title="Editar">
                              <Edit className="w-4 h-4 text-gray-600" />
                            </Button>

                            {atendimento.ata_id && (
                              <Button variant="ghost" size="sm"
                                onClick={async () => {
                                  const ata = await base44.entities.MeetingMinutes.get(atendimento.ata_id);
                                  if (ata) { setSelectedAta(ata); setShowVisualizarAta(true); }
                                  else toast.error("ATA não encontrada");
                                }}
                                title="Ver/Finalizar ATA"
                              >
                                <FileText className="w-4 h-4 text-green-600" />
                              </Button>
                            )}

                            {!atendimento.ata_id && atendimento.status === ATENDIMENTO_STATUS.REALIZADO && (
                              <Button variant="ghost" size="sm" onClick={() => { setSelectedAtendimento(atendimento); setShowGerarAta(true); }} title="Gerar ATA">
                                <FilePlus className="w-4 h-4 text-blue-600" />
                              </Button>
                            )}

                            <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(atendimento)} title={atendimento.ata_id ? "Excluir ATA" : "Excluir Atendimento"}>
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

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) { setDeleteConfirm(null); setDeleteFollowUp(false); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              {deleteConfirm?.ata_id ? 'Excluir ATA' : 'Excluir Atendimento'}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>{deleteConfirm?.ata_id ? 'Tem certeza que deseja excluir esta ATA?' : 'Tem certeza que deseja excluir este registro de atendimento?'}</p>
              {deleteConfirm && (
                <div className="bg-gray-50 rounded-lg p-3 mt-3 text-sm text-gray-700 space-y-1">
                  <p><span className="font-medium">Tipo:</span> {deleteConfirm.tipo_atendimento?.replace(/_/g, ' ')}</p>
                  <p><span className="font-medium">Data:</span> {formatDateTimeBR(deleteConfirm.data_agendada)}</p>
                  <p><span className="font-medium">Consultor:</span> {deleteConfirm.consultor_nome || '-'}</p>
                </div>
              )}
              {deleteConfirm?.ata_id && deleteConfirm?.google_event_id && (
                <label className="mt-4 flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-700 cursor-pointer">
                  <Checkbox checked={deleteFollowUp} onCheckedChange={(checked) => setDeleteFollowUp(checked === true)} className="mt-0.5" />
                  <span>Deletar o follow up criado para esta ATA</span>
                </label>
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
                    await base44.functions.invoke('deleteAta', { ata_id: deleteConfirm.ata_id, delete_follow_up: deleteFollowUp });
                    toast.success('ATA excluída com sucesso!');
                    queryClient.invalidateQueries({ queryKey: ['meeting-minutes'] });
                  } else {
                    await base44.entities.ConsultoriaAtendimento.delete(deleteConfirm.id);
                    toast.success('Atendimento excluído com sucesso!');
                  }
                  queryClient.invalidateQueries({ queryKey: ['atendimentos-acelerador'] });
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