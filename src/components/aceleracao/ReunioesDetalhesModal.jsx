import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Clock, Building2, CheckCircle, AlertCircle, Play, StopCircle, CalendarClock, Edit, FileText, FilePlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { ATENDIMENTO_STATUS, ATENDIMENTO_STATUS_COLORS, ATENDIMENTO_STATUS_LABELS } from "@/components/lib/ataConstants";

import GerarAtaModal from "./GerarAtaModal";
import VisualizarAtaModal from "./VisualizarAtaModal";
import ReagendarAtendimentoModal from "./ReagendarAtendimentoModal";
import FinalizarAtendimentoModal from "./FinalizarAtendimentoModal";

export default function ReunioesDetalhesModal({ isOpen, onClose, reunioes, tipo, workshops = [] }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showGerarAta, setShowGerarAta] = useState(false);
  const [showVisualizarAta, setShowVisualizarAta] = useState(false);
  const [showReagendar, setShowReagendar] = useState(false);
  const [showFinalizar, setShowFinalizar] = useState(false);
  const [selectedAtendimento, setSelectedAtendimento] = useState(null);
  const [selectedAta, setSelectedAta] = useState(null);

  const iniciarMutation = useMutation({
    mutationFn: (id) => base44.entities.ConsultoriaAtendimento.update(id, { 
      status: 'participando',
      hora_inicio_real: new Date().toISOString()
    }),
    onSuccess: (_, id) => {
      toast.success('Reunião iniciada!');
      queryClient.invalidateQueries(['atendimentos-acelerador']);
      queryClient.invalidateQueries(['todos-atendimentos']);
      navigate(createPageUrl('RegistrarAtendimento') + `?atendimento_id=${id}`);
      onClose();
    }
  });

  const finalizarMutation = useMutation({
    mutationFn: (id) => base44.entities.ConsultoriaAtendimento.update(id, { 
      status: 'realizado',
      data_realizada: new Date().toISOString(),
      hora_fim_real: new Date().toISOString()
    }),
    onSuccess: () => {
      toast.success('Atendimento finalizado!');
      queryClient.invalidateQueries(['atendimentos-acelerador']);
      queryClient.invalidateQueries(['todos-atendimentos']);
      onClose();
    }
  });

  const handleAtaSaved = () => {
    queryClient.invalidateQueries(['atendimentos-acelerador']);
    queryClient.invalidateQueries(['todos-atendimentos']);
    queryClient.invalidateQueries(['meeting-minutes']);
    setShowGerarAta(false);
    setShowReagendar(false);
    setShowFinalizar(false);
    setSelectedAtendimento(null);
    onClose();
  };
  const getTitulo = () => {
    if (tipo === 'realizadas') return 'Reuniões Realizadas';
    if (tipo === 'futuras') return 'Reuniões Agendadas';
    if (tipo === 'atrasadas') return 'Atendimentos Atrasados';
    return 'Reuniões';
  };

  // getStatusColor removed in favor of ATENDIMENTO_STATUS_COLORS

  const getWorkshopName = (workshopId) => {
    const workshop = workshops.find(w => w.id === workshopId);
    return workshop ? workshop.name : 'Cliente não identificado';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            {getTitulo()}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3">
          {reunioes && reunioes.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Nenhuma reunião encontrada</p>
          ) : (
            reunioes?.map((reuniao) => (
              <div key={reuniao.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1">
                    {tipo === 'atrasadas' ? (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    ) : tipo === 'realizadas' ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <Calendar className="w-5 h-5 text-blue-500" />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {reuniao.tipo_atendimento?.replace(/_/g, ' ').toUpperCase() || 'Atendimento'}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                        <Building2 className="w-4 h-4" />
                        <span>{getWorkshopName(reuniao.workshop_id)}</span>
                      </div>
                    </div>
                  </div>
                  <Badge className={ATENDIMENTO_STATUS_COLORS[reuniao.status] || "bg-gray-100 text-gray-800"}>
                    {ATENDIMENTO_STATUS_LABELS[reuniao.status] || reuniao.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {format(
                        new Date(reuniao.data_realizada || reuniao.data_agendada), 
                        "dd 'de' MMMM 'de' yyyy", 
                        { locale: ptBR }
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>
                      {format(new Date(reuniao.data_agendada), "HH:mm", { locale: ptBR })} 
                      {' - '}
                      {reuniao.duracao_real_minutos || reuniao.duracao_minutos || 60}min
                    </span>
                  </div>
                </div>

                {reuniao.consultor_nome && (
                  <div className="mt-2 text-sm text-gray-600">
                    Consultor: <span className="font-medium">{reuniao.consultor_nome}</span>
                  </div>
                )}

                {tipo === 'atrasadas' && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-red-600 font-medium mb-3">
                      ⚠️ Atendimento não foi realizado na data prevista
                    </p>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t flex items-center justify-end gap-2">
                  {(reuniao.status === 'agendado' || 
                    reuniao.status === 'confirmado' || 
                    reuniao.status === 'reagendado' || 
                    reuniao.status === 'atrasado') && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => iniciarMutation.mutate(reuniao.id)}
                        title="Iniciar"
                      >
                        <Play className="w-4 h-4 text-blue-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedAtendimento(reuniao);
                          setShowReagendar(true);
                        }}
                        title="Reagendar"
                      >
                        <CalendarClock className="w-4 h-4 text-purple-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedAtendimento(reuniao);
                          setShowFinalizar(true);
                        }}
                        title="Finalizar Atendimento"
                      >
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </Button>
                    </>
                  )}

                  {reuniao.status === 'participando' && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => finalizarMutation.mutate(reuniao.id)}
                        title="Finalizar Rápido"
                      >
                        <StopCircle className="w-4 h-4 text-green-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedAtendimento(reuniao);
                          setShowFinalizar(true);
                        }}
                        title="Finalizar com Detalhes"
                      >
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </Button>
                    </>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(createPageUrl('RegistrarAtendimento') + `?atendimento_id=${reuniao.id}`)}
                    title="Editar"
                  >
                    <Edit className="w-4 h-4 text-gray-600" />
                  </Button>

                  {reuniao.ata_id && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={async () => {
                        try {
                          const ata = await base44.entities.MeetingMinutes.get(reuniao.ata_id);
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
                  
                  {!reuniao.ata_id && reuniao.status === 'realizado' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedAtendimento(reuniao);
                        setShowGerarAta(true);
                      }}
                      title="Gerar ATA"
                    >
                      <FilePlus className="w-4 h-4 text-blue-600" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {showGerarAta && selectedAtendimento && (
          <GerarAtaModal
            atendimento={selectedAtendimento}
            workshop={workshops?.find(w => w.id === selectedAtendimento.workshop_id)}
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
            workshop={workshops?.find(w => w.id === selectedAta.workshop_id || (selectedAtendimento && w.id === selectedAtendimento.workshop_id))}
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

        {showFinalizar && selectedAtendimento && (
          <FinalizarAtendimentoModal
            atendimento={selectedAtendimento}
            onClose={() => {
              setShowFinalizar(false);
              setSelectedAtendimento(null);
              // Refresh queries but don't close main modal necessarily, or maybe yes
              queryClient.invalidateQueries(['atendimentos-acelerador']);
              queryClient.invalidateQueries(['todos-atendimentos']);
              onClose(); 
            }}
          />
        )}

      </DialogContent>
    </Dialog>
  );
}