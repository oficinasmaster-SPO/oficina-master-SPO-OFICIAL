import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, CheckCircle, Clock, FileText, Target, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import FaseOficinaCard from "../components/aceleracao/FaseOficinaCard";
import AtividadesImplementacao from "../components/aceleracao/AtividadesImplementacao";

export default function PainelClienteAceleracao() {
  const navigate = useNavigate();
  
  const { data: user, isLoading: loadingUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: workshop } = useQuery({
    queryKey: ['workshop', user?.workshop_id],
    queryFn: () => base44.entities.Workshop.get(user.workshop_id),
    enabled: !!user?.workshop_id
  });

  const { data: atendimentos, isLoading: loadingAtendimentos } = useQuery({
    queryKey: ['meus-atendimentos', workshop?.id],
    queryFn: async () => {
      return await base44.entities.ConsultoriaAtendimento.filter(
        { workshop_id: workshop.id },
        '-data_agendada'
      );
    },
    enabled: !!workshop?.id
  });

  const { data: progresso } = useQuery({
    queryKey: ['meu-progresso', workshop?.id],
    queryFn: async () => {
      return await base44.entities.CronogramaProgresso.filter({
        workshop_id: workshop.id
      });
    },
    enabled: !!workshop?.id
  });

  // Buscar atividades do Cronograma de Implementação
  const { data: cronogramaItems, isLoading: loadingCronograma } = useQuery({
    queryKey: ['cronograma-implementacao', workshop?.id],
    queryFn: async () => {
      return await base44.entities.CronogramaImplementacao.filter(
        { workshop_id: workshop.id },
        '-created_date'
      );
    },
    enabled: !!workshop?.id
  });

  // Buscar último diagnóstico para mostrar a fase
  const { data: lastDiagnostic } = useQuery({
    queryKey: ['last-diagnostic', workshop?.id],
    queryFn: async () => {
      const diagnostics = await base44.entities.Diagnostic.filter(
        { workshop_id: workshop.id, completed: true },
        '-created_date',
        1
      );
      return diagnostics?.[0] || null;
    },
    enabled: !!workshop?.id
  });

  if (loadingUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Verificar se o cliente tem plano habilitado
  // Planos válidos: START, BRONZE, PRATA, GOLD, IOM, MILLIONS
  const planosValidos = ['START', 'BRONZE', 'PRATA', 'GOLD', 'IOM', 'MILLIONS'];
  const temPlanoAtivo = workshop?.planoAtual && planosValidos.includes(workshop.planoAtual);

  if (!temPlanoAtivo) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Plano de Aceleração Não Ativo</h2>
          <p className="text-gray-600 mb-6">
            Para acessar o painel de aceleração, você precisa ter um plano habilitado.
            {workshop?.planoAtual && (
              <span className="block mt-2 text-sm">
                Plano atual: <strong>{workshop.planoAtual}</strong> (não habilitado para aceleração)
              </span>
            )}
          </p>
          <Button onClick={() => navigate(createPageUrl("Planos"))}>
            Ver Planos Disponíveis
          </Button>
        </div>
      </div>
    );
  }

  const proximosAtendimentos = atendimentos?.filter(a => 
    ['agendado', 'confirmado'].includes(a.status) && 
    new Date(a.data_agendada) >= new Date()
  ).slice(0, 3) || [];

  const atasDisponiveis = atendimentos?.filter(a => 
    a.status === 'realizado' && a.ata_ia
  ).slice(0, 5) || [];

  const tarefasPendentes = progresso?.filter(p => 
    p.situacao === 'em_andamento' || p.situacao === 'nao_iniciado'
  ) || [];

  const progressoGeral = progresso?.length > 0 
    ? Math.round((progresso.filter(p => p.situacao === 'concluido').length / progresso.length) * 100)
    : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg p-6">
        <h1 className="text-3xl font-bold">Bem-vindo ao seu Painel de Aceleração</h1>
        <p className="text-blue-100 mt-2">{workshop?.name}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Fase da Oficina */}
        <FaseOficinaCard workshop={workshop} diagnostic={lastDiagnostic} />

        {/* Progresso do Plano */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-green-600" />
              Progresso do Plano - {workshop?.planoAtual}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Progresso Geral</span>
                <span className="font-bold text-2xl text-blue-600">{progressoGeral}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div 
                  className="bg-blue-600 h-4 rounded-full transition-all duration-500"
                  style={{ width: `${progressoGeral}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {progresso?.filter(p => p.situacao === 'concluido').length || 0}
                  </p>
                  <p className="text-xs text-gray-600">Concluídos</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-600">
                    {progresso?.filter(p => p.situacao === 'em_andamento').length || 0}
                  </p>
                  <p className="text-xs text-gray-600">Em Andamento</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-600">
                    {progresso?.filter(p => p.situacao === 'nao_iniciado').length || 0}
                  </p>
                  <p className="text-xs text-gray-600">Não Iniciados</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Atividades de Implementação do Cronograma */}
      <AtividadesImplementacao items={cronogramaItems} workshop={workshop} />

      <div className="grid md:grid-cols-2 gap-6">
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
              <p className="text-gray-500 text-center py-4">Nenhum atendimento agendado</p>
            ) : (
              <div className="space-y-3">
                {proximosAtendimentos.map((atendimento) => (
                  <div key={atendimento.id} className="border rounded-lg p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {atendimento.tipo_atendimento.replace(/_/g, ' ')}
                        </p>
                        <p className="text-sm text-gray-600">
                          {format(new Date(atendimento.data_agendada), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Com: {atendimento.consultor_nome}
                        </p>
                      </div>
                      <Badge className="bg-blue-100 text-blue-700">
                        {atendimento.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tarefas Pendentes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Tarefas Pendentes
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
                {tarefasPendentes.slice(0, 5).map((tarefa) => (
                  <div key={tarefa.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{tarefa.modulo_nome}</p>
                      <p className="text-xs text-gray-600">
                        {tarefa.atividades_previstas - tarefa.atividades_realizadas} atividades pendentes
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Atas Disponíveis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Atas de Reuniões
          </CardTitle>
        </CardHeader>
        <CardContent>
          {atasDisponiveis.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Nenhuma ata disponível</p>
          ) : (
            <div className="space-y-3">
              {atasDisponiveis.map((atendimento) => (
                <div key={atendimento.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">
                      {format(new Date(atendimento.data_realizada), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                    <p className="text-sm text-gray-600">{atendimento.tipo_atendimento}</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <FileText className="w-4 h-4 mr-2" />
                    Ver ATA
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}