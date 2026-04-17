import React, { useState, useMemo } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Calendar, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { formatDateTimeBR } from "@/utils/timezone";
import AgendaVisual from "./AgendaVisual";
import GraficoAtendimentos from "./GraficoAtendimentos";
import StatusClientesCard from "./StatusClientesCard";
import BucketARealizarCard from "./BucketARealizarCard";
import ClientesDetalhesModal from "./ClientesDetalhesModal";
import ReunioesDetalhesModal from "./ReunioesDetalhesModal";
import GargalosConsultoresRealtime from "./GargalosConsultoresRealtime";

const STATUS_FINALIZADOS = ['realizado', 'concluido', 'cancelado', 'faltou', 'remarcado'];

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

export default function VisaoGeralTab({ state }) {
  const { user, workshops, workshopMap, atendimentos, atendimentosPeriodo, setActiveTab, setPendingSubTab } = state;
  const [modalClientes, setModalClientes] = useState({ isOpen: false, tipo: null, clientes: [] });
  const [modalReunioes, setModalReunioes] = useState({ isOpen: false, tipo: null, reunioes: [] });
  const [hoverSides, setHoverSides] = useState({});

  const hoje = useMemo(() => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }), []);

  const { reunioesRealizadas, totalHorasRealizadas } = useMemo(() => {
    const realizados = atendimentosPeriodo.filter(a => a.status === 'realizado' || a.status === 'concluido');
    return {
      reunioesRealizadas: realizados.length,
      totalHorasRealizadas: realizados.reduce((acc, a) => acc + (a.duracao_real_minutos || a.duracao_minutos || 0), 0),
    };
  }, [atendimentosPeriodo]);

  const tarefasPendentes = useMemo(() => {
    return atendimentos.filter(a => {
      if (STATUS_FINALIZADOS.includes(a.status)) return false;
      const d = new Date(a.data_agendada).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
      return d < hoje;
    });
  }, [atendimentos, hoje]);

  const futurasList = useMemo(() => atendimentos.filter(a => {
    if (!['agendado', 'confirmado'].includes(a.status)) return false;
    const d = new Date(a.data_agendada).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    return d >= hoje;
  }), [atendimentos, hoje]);

  const proximosAtendimentos = useMemo(() => futurasList.slice(0, 5), [futurasList]);
  const clientesAtivos = workshops.length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setModalClientes({ isOpen: true, tipo: 'ativos', clientes: workshops })}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{clientesAtivos}</div>
            <p className="text-xs text-gray-600">Com planos habilitados</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setModalReunioes({ isOpen: true, tipo: 'realizadas', reunioes: atendimentosPeriodo.filter(a => a.status === 'realizado' || a.status === 'concluido') })}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Reuniões Realizadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{reunioesRealizadas}</div>
            <p className="text-xs text-gray-600">No período</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setModalReunioes({ isOpen: true, tipo: 'futuras', reunioes: futurasList })}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Reuniões Futuras</CardTitle>
            <Calendar className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{futurasList.length}</div>
            <p className="text-xs text-gray-600">A partir de hoje</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Horas Realizadas</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(totalHorasRealizadas / 60)}h</div>
            <p className="text-xs text-gray-600">{reunioesRealizadas} reuniões concluídas</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="space-y-4">
          <StatusClientesCard
            workshops={workshops}
            atendimentos={atendimentos}
            onStatusClick={(tipo, clientes) => setModalClientes({ isOpen: true, tipo, clientes })}
          />
          <BucketARealizarCard onNavigate={() => {
            setPendingSubTab("bucket");
            setActiveTab("atendimentos");
          }} />
        </div>

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
                       className="border-l-4 border-blue-500 pl-3 py-2 rounded-r cursor-pointer hover:bg-blue-50 transition-colors flex items-end justify-between gap-2"
                       onMouseEnter={(e) => {
                         const side = getMouseEnterSide(e);
                         setHoverSides(prev => ({ ...prev, [atendimento.id]: side }));
                       }}
                      >
                       <div className="min-w-0">
                         <p className="font-medium text-sm">{atendimento.tipo_atendimento}</p>
                         <p className="text-xs text-gray-600">{formatDateTimeBR(atendimento.data_agendada)}</p>
                       </div>
                       <p className="text-xs text-gray-500 font-medium text-right truncate flex-shrink-0 max-w-[45%]">
                         {workshopMap?.[atendimento.workshop_id]?.name || ''}
                       </p>
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

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Atendimentos Atrasados
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col flex-1">
            {tarefasPendentes.length === 0 ? (
              <div className="py-8 flex flex-col items-center justify-center flex-1">
                <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-2" />
                <p className="text-gray-500">Tudo em dia!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tarefasPendentes.slice(0, 5).map((atendimento) => (
                  <div key={atendimento.id} className="border-l-4 border-red-500 pl-3 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm break-all">{atendimento.tipo_atendimento}</p>
                      {atendimento.consultor_nome && (
                        <p className="text-xs text-gray-500 font-medium text-right truncate flex-shrink-0 max-w-[45%]">
                          {atendimento.consultor_nome}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-xs text-red-600">Previsto: {formatDateTimeBR(atendimento.data_agendada)}</p>
                      {workshopMap?.[atendimento.workshop_id]?.name && (
                        <p className="text-xs text-gray-400 text-right truncate flex-shrink-0 max-w-[50%]">
                          {workshopMap[atendimento.workshop_id].name}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {tarefasPendentes.length > 0 && (
                  <Button variant="outline" size="sm" className="w-full mt-2"
                    onClick={() => setModalReunioes({ isOpen: true, tipo: 'atrasadas', reunioes: tarefasPendentes })}>
                    Ver Todos ({tarefasPendentes.length})
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ClientesDetalhesModal
        isOpen={modalClientes.isOpen}
        onClose={() => setModalClientes({ isOpen: false, tipo: null, clientes: [] })}
        clientes={modalClientes.clientes}
        tipo={modalClientes.tipo}
        atendimentos={atendimentos}
      />

      <ReunioesDetalhesModal
        isOpen={modalReunioes.isOpen}
        onClose={() => setModalReunioes({ isOpen: false, tipo: null, reunioes: [] })}
        reunioes={modalReunioes.reunioes}
        tipo={modalReunioes.tipo}
        workshops={workshops}
      />

      <div className="grid md:grid-cols-2 gap-6">
        <GraficoAtendimentos
          atendimentos={atendimentosPeriodo}
          workshops={workshops}
          onStatusClick={(status) => {
            setPendingSubTab(status);
            setActiveTab("atendimentos");
          }}
        />
        <AgendaVisual atendimentos={atendimentos} workshops={workshops} user={user} />
      </div>

      <GargalosConsultoresRealtime />
    </div>
  );
}