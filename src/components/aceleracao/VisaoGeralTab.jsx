import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Calendar, TrendingUp, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import AgendaVisual from "./AgendaVisual";
import GraficoAtendimentos from "./GraficoAtendimentos";
import StatusClientesCard from "./StatusClientesCard";
import ClientesDetalhesModal from "./ClientesDetalhesModal";
import ReunioesDetalhesModal from "./ReunioesDetalhesModal";
import AIInsightsCard from "../ai/AIInsightsCard";
import { useAIInsights } from "../hooks/useAIInsights";

export default function VisaoGeralTab({ user }) {
  const [modalClientes, setModalClientes] = useState({ isOpen: false, tipo: null, clientes: [] });
  const [modalReunioes, setModalReunioes] = useState({ isOpen: false, tipo: null, reunioes: [] });
  
  const { data: aiInsights = [], isLoading: loadingInsights } = useAIInsights('overview');

  const { data: workshops } = useQuery({
    queryKey: ['workshops-ativos'],
    queryFn: async () => {
      const all = await base44.entities.Workshop.list();
      return all.filter(w => w.planoAtual && w.planoAtual !== 'FREE');
    }
  });

  const { data: atendimentos } = useQuery({
    queryKey: ['atendimentos-acelerador', user?.id],
    queryFn: async () => {
      const all = await base44.entities.ConsultoriaAtendimento.filter({
        consultor_id: user.id
      });
      return all;
    },
    enabled: !!user?.id
  });

  const { data: planos } = useQuery({
    queryKey: ['planos-acelerador'],
    queryFn: async () => {
      const plans = await base44.entities.Plan.filter({
        consultant_id: user.id
      });
      return plans;
    },
    enabled: !!user?.id
  });

  // Filtrar atendimentos do mês atual
  const atendimentosMes = atendimentos?.filter(a => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return new Date(a.data_agendada) >= firstDay;
  }) || [];

  const clientesAtivos = workshops?.length || 0;
  const reunioesRealizadas = atendimentosMes?.filter(a => a.status === 'realizado').length || 0;
  const reunioesFuturas = atendimentosMes?.filter(a => 
    ['agendado', 'confirmado'].includes(a.status)
  ).length || 0;
  
  // Calcular horas: Total Contratado - Total Realizado
  const totalHorasContratadas = planos?.reduce((acc, plan) => acc + (plan.hours_contracted || 0), 0) || 0;
  const totalHorasRealizadas = atendimentos?.filter(a => a.status === 'realizado')
    .reduce((acc, a) => acc + (a.duracao_real_minutos || a.duracao_minutos || 0), 0) || 0;
  const horasDisponiveis = totalHorasContratadas - Math.round(totalHorasRealizadas / 60);
  
  const tarefasPendentes = atendimentosMes?.filter(a => 
    a.status !== 'realizado' && new Date(a.data_agendada) < new Date()
  ) || [];

  const proximosAtendimentos = atendimentos?.filter(a => 
    ['agendado', 'confirmado'].includes(a.status) && 
    new Date(a.data_agendada) >= new Date()
  ).slice(0, 5) || [];

  const handleClientesClick = () => {
    setModalClientes({ 
      isOpen: true, 
      tipo: 'ativos', 
      clientes: workshops || [] 
    });
  };

  const handleReunioesRealizadasClick = () => {
    const realizadas = atendimentosMes?.filter(a => a.status === 'realizado') || [];
    setModalReunioes({ 
      isOpen: true, 
      tipo: 'realizadas', 
      reunioes: realizadas 
    });
  };

  const handleReunioesFuturasClick = () => {
    const futuras = atendimentosMes?.filter(a => 
      ['agendado', 'confirmado'].includes(a.status)
    ) || [];
    setModalReunioes({ 
      isOpen: true, 
      tipo: 'futuras', 
      reunioes: futuras 
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
      <AIInsightsCard insights={aiInsights} loading={loadingInsights} />

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
            <p className="text-xs text-gray-600">Neste mês</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleReunioesFuturasClick}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Reuniões Futuras</CardTitle>
            <Calendar className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 hover:text-purple-700">{reunioesFuturas}</div>
            <p className="text-xs text-gray-600">Agendadas</p>
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
                  <div key={atendimento.id} className="border-l-4 border-blue-500 pl-3 py-2">
                    <p className="font-medium text-sm">{atendimento.tipo_atendimento}</p>
                    <p className="text-xs text-gray-600">
                      {format(new Date(atendimento.data_agendada), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tarefas Atrasadas */}
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
                      Previsto: {format(new Date(atendimento.data_agendada), "dd/MM/yyyy", { locale: ptBR })}
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
        <GraficoAtendimentos atendimentos={atendimentosMes} />

        {/* Agenda Visual */}
        <AgendaVisual atendimentos={atendimentos || []} />
      </div>
    </div>
  );
}