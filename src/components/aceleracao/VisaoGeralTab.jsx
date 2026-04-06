import React, { useState } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Calendar, TrendingUp, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDateTimeBR } from "@/utils/timezone";
import AgendaVisual from "./AgendaVisual";
import GraficoAtendimentos from "./GraficoAtendimentos";
import StatusClientesCard from "./StatusClientesCard";
import ClientesDetalhesModal from "./ClientesDetalhesModal";
import ReunioesDetalhesModal from "./ReunioesDetalhesModal";
import GargalosConsultoresRealtime from "./GargalosConsultoresRealtime";

function getMouseEnterSide(e) {
  const rect = e.currentTarget.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const w = rect.width;
  const h = rect.height;
  const fromTop = y;
  const fromBottom = h - y;
  const fromLeft = x;
  const fromRight = w - x;
  const min = Math.min(fromTop, fromBottom, fromLeft, fromRight);
  if (min === fromRight) return "left";
  if (min === fromLeft) return "right";
  if (min === fromTop) return "bottom";
  return "top";
}

export default function VisaoGeralTab({ user, filtros = {} }) {
  const consultorFiltrado = filtros.consultorId && filtros.consultorId !== "todos" ? filtros.consultorId : null;
  const dataInicioStr = filtros.dataInicio || null;
  const dataFimStr = filtros.dataFim || null;
  const [modalClientes, setModalClientes] = useState({ isOpen: false, tipo: null, clientes: [] });
  const [modalReunioes, setModalReunioes] = useState({ isOpen: false, tipo: null, reunioes: [] });
  const [hoverSides, setHoverSides] = useState({});

  const { data: workshops } = useQuery({
    queryKey: ['workshops-ativos'],
    queryFn: async () => {
      const all = await base44.entities.Workshop.list();
      return all.filter(w => w.planoAtual && w.planoAtual !== 'FREE');
    }
  });

  const { data: atendimentos } = useQuery({
    queryKey: ['atendimentos-acelerador', user?.id, consultorFiltrado, user?.role],
    queryFn: async () => {
      let query = {};
      // Se tem filtro específico de consultor, aplica
      if (consultorFiltrado) {
        query.consultor_id = consultorFiltrado;
      } else if (user?.role !== 'admin') {
        // Se não é admin, mostra apenas seus atendimentos
        query.consultor_id = user.id;
      }
      // Se é admin e não tem filtro = mostra todos os atendimentos
      return await base44.entities.ConsultoriaAtendimento.filter(query, null, 10000);
    },
    enabled: !!user?.id
  });

  const { data: planos } = useQuery({
    queryKey: ['planos-acelerador'],
    queryFn: async () => {
      const plans = await base44.entities.Plan.filter({ consultant_id: user.id });
      return plans;
    },
    enabled: !!user?.id
  });

  const { data: gargalos } = useQuery({
    queryKey: ['gargalos-consultores'],
    queryFn: async () => {
      const response = await base44.functions.invoke('calcularGargalosConsultores');
      return response.data;
    }
  });

  const clientesAtivos = workshops?.length || 0;
  // Data atual no fuso de Brasília como string "YYYY-MM-DD" para comparação segura
  const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

  // Aplica filtro de período apenas para os cards de stats de reuniões realizadas e pendentes
  const atendimentosPeriodo = (atendimentos || []).filter(a => {
    if (!dataInicioStr || !dataFimStr) return true;
    const dataAtendBR = new Date(a.data_agendada).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    return dataAtendBR >= dataInicioStr && dataAtendBR <= dataFimStr;
  });

  const reunioesRealizadas = atendimentosPeriodo.filter(a => a.status === 'realizado').length || 0;
  
  const futurasList = (atendimentos || []).filter(a => {
    if (!['agendado', 'confirmado'].includes(a.status)) return false;
    const dataAtendBR = new Date(a.data_agendada).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    return dataAtendBR >= hoje;
  });
  const reunioesFuturas = futurasList.length;

  // Calcular horas: Total Contratado - Total Realizado
  const totalHorasContratadas = planos?.reduce((acc, plan) => acc + (plan.hours_contracted || 0), 0) || 0;
  const totalHorasRealizadas = atendimentos?.filter(a => a.status === 'realizado')
    .reduce((acc, a) => acc + (a.duracao_real_minutos || a.duracao_minutos || 0), 0) || 0;
  const horasDisponiveis = totalHorasContratadas - Math.round(totalHorasRealizadas / 60);

  const tarefasPendentes = atendimentosPeriodo.filter(a => {
    if (a.status === 'realizado') return false;
    const dataAtendBR = new Date(a.data_agendada).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    return dataAtendBR < hoje;
  }) || [];

  // Filtra atendimentos futuros comparando apenas a data (sem hora) no fuso Brasil
  // Evita bug de timezone onde meia-noite UTC vira dia anterior no Brasil
  const proximosAtendimentos = atendimentos?.filter(a => {
    if (!['agendado', 'confirmado'].includes(a.status)) return false;
    const dataAtendBR = new Date(a.data_agendada).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    return dataAtendBR >= hoje;
  }).slice(0, 5) || [];

  const handleClientesClick = () => {
    setModalClientes({
      isOpen: true,
      tipo: 'ativos',
      clientes: workshops || []
    });
  };

  const handleReunioesRealizadasClick = () => {
    const realizadas = atendimentosPeriodo.filter(a => a.status === 'realizado') || [];
    setModalReunioes({
      isOpen: true,
      tipo: 'realizadas',
      reunioes: realizadas
    });
  };

  const handleReunioesFuturasClick = () => {
    setModalReunioes({
      isOpen: true,
      tipo: 'futuras',
      reunioes: futurasList
    });
  };

  const handleAtrasadosClick = () => {
    setModalReunioes({
      isOpen: true,
      tipo: 'atrasadas',
      reunioes: tarefasPendentes
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleClientesClick}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 hover:text-blue-700">{clientesAtivos}</div>
            <p className="text-xs text-gray-600">Com planos habilitados</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleReunioesRealizadasClick}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Reuniões Realizadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 hover:text-green-700">{reunioesRealizadas}</div>
            <p className="text-xs text-gray-600">No período</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleReunioesFuturasClick}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Reuniões Futuras</CardTitle>
            <Calendar className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 hover:text-purple-700">{reunioesFuturas}</div>
            <p className="text-xs text-gray-600">A partir de hoje</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Horas Disponíveis</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{horasDisponiveis}h</div>
            <p className="text-xs text-gray-600">
              Contratadas: {totalHorasContratadas}h | Realizadas: {Math.round(totalHorasRealizadas / 60)}h
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Status dos Clientes */}
        <StatusClientesCard
          workshops={workshops}
          atendimentos={atendimentos || []}
          onStatusClick={(tipo, clientes) => {
            setModalClientes({ isOpen: true, tipo, clientes });
          }}
        />

        {/* Próximos Atendimentos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Próximos Atendimentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {proximosAtendimentos.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Nenhum atendimento próximo</p>
            ) : (
              <div className="space-y-3">
                {proximosAtendimentos.map((atendimento) => (
                  <HoverCard key={atendimento.id} openDelay={80} closeDelay={80}>
                    <HoverCardTrigger asChild>
                      <div
                        className="border-l-4 border-blue-500 pl-3 py-2 rounded-r cursor-pointer hover:bg-blue-50 transition-colors"
                        onMouseEnter={(e) => {
                          const side = getMouseEnterSide(e);
                          setHoverSides(prev => ({ ...prev, [atendimento.id]: side }));
                        }}
                      >
                        <p className="font-medium text-sm">{atendimento.tipo_atendimento}</p>
                        <p className="text-xs text-gray-600">{formatDateTimeBR(atendimento.data_agendada)}</p>
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-52 p-3" side={hoverSides[atendimento.id] || "right"} align="center">
                      <div className="space-y-2">
                        <div>
                          <p className="font-semibold text-sm text-gray-900">{atendimento.tipo_atendimento}</p>
                          <p className="text-xs text-blue-600 font-medium mt-0.5">{formatDateTimeBR(atendimento.data_agendada)}</p>
                        </div>
                        {atendimento.duracao_minutos && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <Clock className="w-3 h-3" />
                            <span>{atendimento.duracao_minutos} min</span>
                          </div>
                        )}
                        {atendimento.participantes?.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-gray-700 mb-0.5">Participantes</p>
                            {atendimento.participantes.slice(0, 2).map((p, i) => (
                              <p key={i} className="text-xs text-gray-600 truncate">• {p.nome}</p>
                            ))}
                            {atendimento.participantes.length > 2 && (
                              <p className="text-xs text-gray-400">+{atendimento.participantes.length - 2} mais</p>
                            )}
                          </div>
                        )}
                        {atendimento.objetivos?.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-gray-700 mb-0.5">Objetivos</p>
                            {atendimento.objetivos.slice(0, 1).map((o, i) => (
                              <p key={i} className="text-xs text-gray-600 line-clamp-2">• {o}</p>
                            ))}
                          </div>
                        )}
                        {atendimento.pauta?.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-gray-700 mb-0.5">Pauta</p>
                            {atendimento.pauta.slice(0, 1).map((p, i) => (
                              <p key={i} className="text-xs text-gray-600 line-clamp-2">• {p.titulo}</p>
                            ))}
                          </div>
                        )}
                        {atendimento.google_meet_link && (
                          <a href={atendimento.google_meet_link} target="_blank" rel="noopener noreferrer" className="block text-xs text-blue-500 hover:underline truncate">
                            🎥 Google Meet
                          </a>
                        )}
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                ))}
                </div>
                )}
                </CardContent>
                </Card>

                {/* Atendimentos Atrasados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Atendimentos Atrasados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tarefasPendentes.length === 0 ? (
              <div className="text-center py-4">
                <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-2" />
                <p className="text-gray-500">Tudo em dia!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tarefasPendentes.slice(0, 5).map((atendimento) => (
                  <div key={atendimento.id} className="border-l-4 border-red-500 pl-3 py-2">
                    <p className="font-medium text-sm">{atendimento.tipo_atendimento}</p>
                    <p className="text-xs text-red-600">
                      Previsto: {formatDateTimeBR(atendimento.data_agendada)}
                    </p>
                  </div>
                ))}
                {tarefasPendentes.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={handleAtrasadosClick}
                  >
                    Ver Todos ({tarefasPendentes.length})
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modais */}
      <ClientesDetalhesModal
        isOpen={modalClientes.isOpen}
        onClose={() => setModalClientes({ isOpen: false, tipo: null, clientes: [] })}
        clientes={modalClientes.clientes}
        tipo={modalClientes.tipo}
        atendimentos={atendimentos || []}
      />

      <ReunioesDetalhesModal
        isOpen={modalReunioes.isOpen}
        onClose={() => setModalReunioes({ isOpen: false, tipo: null, reunioes: [] })}
        reunioes={modalReunioes.reunioes}
        tipo={modalReunioes.tipo}
        workshops={workshops || []}
      />

      <div className="grid md:grid-cols-2 gap-6">
        {/* Gráfico de Atendimentos */}
        <GraficoAtendimentos atendimentos={atendimentosPeriodo} />

        {/* Agenda Visual */}
        <AgendaVisual
          atendimentos={atendimentos || []}
          workshops={workshops || []}
        />
      </div>

      {/* Análise de Gargalos com Backlog */}
      <GargalosConsultoresRealtime />
    </div>
  );
}