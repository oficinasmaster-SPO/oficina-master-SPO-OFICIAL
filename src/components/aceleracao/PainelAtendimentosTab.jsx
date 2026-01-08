import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Edit, Copy, CheckCircle, FileText, Send, AlertTriangle, FilePlus, Play, StopCircle, CalendarClock } from "lucide-react";
import GerarAtaModal from "./GerarAtaModal";
import VisualizarAtaModal from "./VisualizarAtaModal";
import ReagendarAtendimentoModal from "./ReagendarAtendimentoModal";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

export default function PainelAtendimentosTab({ user }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showGerarAta, setShowGerarAta] = useState(false);
  const [showVisualizarAta, setShowVisualizarAta] = useState(false);
  const [showReagendar, setShowReagendar] = useState(false);
  const [selectedAtendimento, setSelectedAtendimento] = useState(null);
  const [selectedAta, setSelectedAta] = useState(null);
  const [filtros, setFiltros] = useState({
    dataInicio: "",
    dataFim: "",
    cliente: "",
    consultor: "",
    tipo: "",
    status: ""
  });

  const { data: atendimentos, isLoading } = useQuery({
    queryKey: ['todos-atendimentos'],
    queryFn: () => base44.entities.ConsultoriaAtendimento.list('-data_agendada'),
    refetchInterval: 30000 // Atualiza a cada 30s
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

  // Verificar atendimentos atrasados
  useEffect(() => {
    if (!atendimentos) return;
    
    const now = new Date();

    atendimentos.forEach(atendimento => {
      const dataAtendimento = new Date(atendimento.data_agendada);
      
      // Se passou da data agendada e não está realizado/participando
      if (now > dataAtendimento && 
          !['realizado', 'participando', 'atrasado'].includes(atendimento.status)) {
        marcarAtrasadoMutation.mutate(atendimento.id);
      }
    });
  }, [atendimentos]);

  const marcarAtrasadoMutation = useMutation({
    mutationFn: (id) => base44.entities.ConsultoriaAtendimento.update(id, { status: 'atrasado' }),
    onSuccess: () => queryClient.invalidateQueries(['todos-atendimentos'])
  });

  const iniciarMutation = useMutation({
    mutationFn: (id) => base44.entities.ConsultoriaAtendimento.update(id, { 
      status: 'participando',
      hora_inicio_real: new Date().toISOString()
    }),
    onSuccess: () => {
      toast.success('Reunião iniciada!');
      queryClient.invalidateQueries(['todos-atendimentos']);
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
      queryClient.invalidateQueries(['todos-atendimentos']);
    }
  });

  const getStatusColor = (status) => {
    const colors = {
      agendado: "bg-red-100 text-red-800 border-red-300",
      confirmado: "bg-yellow-100 text-yellow-800 border-yellow-300",
      participando: "bg-blue-100 text-blue-800 border-blue-300 animate-pulse",
      em_andamento: "bg-orange-100 text-orange-800 border-orange-300 animate-pulse",
      realizado: "bg-green-100 text-green-800 border-green-300",
      atrasado: "bg-red-500 text-white border-red-700 animate-pulse"
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const atendimentosFiltrados = atendimentos?.filter(a => {
    if (filtros.status && a.status !== filtros.status) return false;
    if (filtros.cliente && a.workshop_id !== filtros.cliente) return false;
    if (filtros.tipo && a.tipo_atendimento !== filtros.tipo) return false;
    return true;
  }).sort((a, b) => {
    // Atrasados sempre no topo
    if (a.status === 'atrasado' && b.status !== 'atrasado') return -1;
    if (a.status !== 'atrasado' && b.status === 'atrasado') return 1;
    return new Date(b.data_agendada) - new Date(a.data_agendada);
  }) || [];

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

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Input
              type="date"
              placeholder="Data Início"
              value={filtros.dataInicio}
              onChange={(e) => setFiltros({...filtros, dataInicio: e.target.value})}
            />
            <Input
              type="date"
              placeholder="Data Fim"
              value={filtros.dataFim}
              onChange={(e) => setFiltros({...filtros, dataFim: e.target.value})}
            />
            <Select value={filtros.cliente} onValueChange={(v) => setFiltros({...filtros, cliente: v})}>
              <SelectTrigger>
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Todos</SelectItem>
                {workshops?.map(w => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filtros.tipo} onValueChange={(v) => setFiltros({...filtros, tipo: v})}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Todos</SelectItem>
                <SelectItem value="diagnostico_inicial">Diagnóstico</SelectItem>
                <SelectItem value="acompanhamento_mensal">Acompanhamento</SelectItem>
                <SelectItem value="reuniao_estrategica">Estratégica</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtros.status} onValueChange={(v) => setFiltros({...filtros, status: v})}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Todos</SelectItem>
                <SelectItem value="agendado">Agendado</SelectItem>
                <SelectItem value="confirmado">Confirmado</SelectItem>
                <SelectItem value="participando">Participando</SelectItem>
                <SelectItem value="realizado">Realizado</SelectItem>
                <SelectItem value="atrasado">Atrasado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Atendimentos */}
      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Data</th>
                  <th className="text-left py-3 px-4">Cliente</th>
                  <th className="text-left py-3 px-4">Tipo</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Consultor</th>
                  <th className="text-right py-3 px-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {atendimentosFiltrados.map((atendimento) => {
                  const workshop = workshops?.find(w => w.id === atendimento.workshop_id);
                  return (
                    <tr key={atendimento.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        {format(new Date(atendimento.data_agendada), "dd/MM/yyyy HH:mm")}
                      </td>
                      <td className="py-3 px-4 font-medium">{workshop?.name || '-'}</td>
                      <td className="py-3 px-4 text-sm">
                        {atendimento.tipo_atendimento.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={getStatusColor(atendimento.status)}>
                          {atendimento.status === 'atrasado' && <AlertTriangle className="w-3 h-3 mr-1" />}
                          {atendimento.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm">{atendimento.consultor_nome}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          {(atendimento.status === 'agendado' || atendimento.status === 'confirmado' || atendimento.status === 'reagendado') && (
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

                          {atendimento.status === 'participando' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => finalizarMutation.mutate(atendimento.id)}
                              title="Finalizar"
                            >
                              <StopCircle className="w-4 h-4 text-green-600" />
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

                          {atendimento.ata_id ? (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={async () => {
                                const ata = atas?.find(a => a.id === atendimento.ata_id);
                                if (ata) {
                                  setSelectedAta(ata);
                                  setShowVisualizarAta(true);
                                }
                              }}
                              title="Ver ATA"
                            >
                              <FileText className="w-4 h-4 text-green-600" />
                            </Button>
                          ) : atendimento.status === 'realizado' && (
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
  );
}