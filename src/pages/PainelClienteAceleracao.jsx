import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, CheckCircle, Clock, FileText, Target, AlertCircle, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import FaseOficinaCard from "../components/aceleracao/FaseOficinaCard";
import AtividadesImplementacao from "../components/aceleracao/AtividadesImplementacao";
import PlanoAceleracaoMensal from "../components/aceleracao/PlanoAceleracaoMensal";
import FeedbackPlanoModal from "../components/aceleracao/FeedbackPlanoModal";
import AtasSection from "../components/aceleracao/AtasSection";

export default function PainelClienteAceleracao() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showPlanDetails, setShowPlanDetails] = useState(false);
  
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

  const { data: atas = [] } = useQuery({
    queryKey: ['meeting-minutes', workshop?.id],
    queryFn: () => base44.entities.MeetingMinutes.filter(
      { workshop_id: workshop.id, status: 'finalizada' },
      '-meeting_date'
    ),
    enabled: !!workshop?.id
  });

  // Buscar Plano de Aceleração do Mês Atual
  const currentMonth = new Date().toISOString().substring(0, 7);
  const { data: monthlyPlan, isLoading: loadingPlan } = useQuery({
    queryKey: ['monthly-plan', workshop?.id, currentMonth],
    queryFn: async () => {
      const plans = await base44.entities.MonthlyAccelerationPlan.filter(
        { 
          workshop_id: workshop.id, 
          reference_month: currentMonth,
          status: 'ativo'
        },
        '-version',
        1
      );
      return plans?.[0] || null;
    },
    enabled: !!workshop?.id
  });

  // Mutation para gerar plano
  const generatePlanMutation = useMutation({
    mutationFn: async () => {
      if (!lastDiagnostic) {
        throw new Error('É necessário realizar um diagnóstico antes de gerar o plano');
      }
      
      const response = await base44.functions.invoke('generateMonthlyPlan', {
        workshop_id: workshop.id,
        diagnostic_id: lastDiagnostic.id,
        phase: lastDiagnostic.phase || workshop.maturity_level || 1,
        reference_month: currentMonth
      });
      
      return response.data.plan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['monthly-plan']);
      toast.success('Plano de Aceleração gerado com sucesso!');
      setShowPlanDetails(true);
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao gerar plano');
    }
  });

  // Mutation para refinar plano
  const refinePlanMutation = useMutation({
    mutationFn: async (feedbackData) => {
      const response = await base44.functions.invoke('refineMonthlyPlan', {
        plan_id: monthlyPlan.id,
        feedback_content: feedbackData.content,
        feedback_type: feedbackData.type,
        audio_url: feedbackData.audio_url
      });
      
      return response.data.refined_plan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['monthly-plan']);
      toast.success('Plano refinado com sucesso!');
      setShowFeedbackModal(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao refinar plano');
    }
  });

  // Mutation para atualizar atividade
  const updateActivityMutation = useMutation({
    mutationFn: async ({ activityIndex, newStatus }) => {
      const updatedSchedule = [...monthlyPlan.plan_data.implementation_schedule];
      updatedSchedule[activityIndex].status = newStatus;
      if (newStatus === 'concluida') {
        updatedSchedule[activityIndex].completed_date = new Date().toISOString();
      }

      const activitiesDone = updatedSchedule.filter(a => a.status === 'concluida').length;
      const newPercentage = Math.round((activitiesDone / updatedSchedule.length) * 100);

      await base44.entities.MonthlyAccelerationPlan.update(monthlyPlan.id, {
        plan_data: {
          ...monthlyPlan.plan_data,
          implementation_schedule: updatedSchedule
        },
        completion_percentage: newPercentage
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['monthly-plan']);
      toast.success('Atividade atualizada!');
    }
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

  const handleGeneratePlan = async () => {
    if (!lastDiagnostic) {
      toast.error('Realize um diagnóstico da oficina antes de gerar o plano');
      navigate(createPageUrl("SelecionarDiagnostico"));
      return;
    }
    await generatePlanMutation.mutateAsync();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg p-6">
        <h1 className="text-3xl font-bold">Bem-vindo ao seu Painel de Aceleração</h1>
        <p className="text-blue-100 mt-2">{workshop?.name}</p>
      </div>

      {/* Fase da Oficina e Progresso */}
      <div className="grid md:grid-cols-2 gap-6">
        <FaseOficinaCard workshop={workshop} diagnostic={lastDiagnostic} />

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

      {/* Plano de Aceleração Mensal */}
      {loadingPlan ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-gray-600">Carregando plano de aceleração...</p>
          </CardContent>
        </Card>
      ) : !monthlyPlan ? (
        <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="py-12 text-center">
            <Sparkles className="w-16 h-16 mx-auto text-blue-600 mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Seu Plano de Aceleração Mensal
            </h3>
            <p className="text-gray-600 max-w-2xl mx-auto mb-6">
              A IA irá analisar seu diagnóstico e criar um plano estruturado e executável 
              para os próximos 90 dias, focado na evolução da sua oficina.
            </p>
            <Button 
              onClick={handleGeneratePlan}
              disabled={generatePlanMutation.isPending}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 gap-2"
            >
              {generatePlanMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Gerando Plano com IA...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Gerar Plano de Aceleração
                </>
              )}
            </Button>
            {!lastDiagnostic && (
              <p className="text-sm text-orange-600 mt-4">
                ⚠️ Realize um diagnóstico antes de gerar o plano
              </p>
            )}
          </CardContent>
        </Card>
      ) : showPlanDetails ? (
        <>
          <PlanoAceleracaoMensal 
            plan={monthlyPlan}
            workshop={workshop}
            onRefine={() => setShowFeedbackModal(true)}
            onUpdateActivity={(index, status) => updateActivityMutation.mutate({ activityIndex: index, newStatus: status })}
          />
          <Button 
            variant="outline" 
            onClick={() => setShowPlanDetails(false)}
            className="w-full"
          >
            Voltar ao Resumo
          </Button>
        </>
      ) : (
        <Card className="border-2 border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-green-900">
                <CheckCircle className="w-6 h-6" />
                Plano Ativo - {format(new Date(monthlyPlan.reference_month + '-01'), "MMMM 'de' yyyy", { locale: ptBR })}
              </CardTitle>
              <Badge className="bg-green-600 text-white">
                {monthlyPlan.completion_percentage}% Concluído
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700">
              Você possui um plano ativo para este mês. Continue executando as atividades 
              para evoluir para a próxima fase.
            </p>
            <div className="flex gap-3">
              <Button 
                onClick={() => setShowPlanDetails(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                Ver Plano Completo
              </Button>
              <Button 
                variant="outline"
                onClick={() => setShowFeedbackModal(true)}
              >
                Refinar Plano
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* ATAs de Reunião */}
      <AtasSection atas={atas} workshop={workshop} />

      {/* Modal de Feedback */}
      <FeedbackPlanoModal
        open={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        onSubmit={(feedbackData) => refinePlanMutation.mutate(feedbackData)}
        isLoading={refinePlanMutation.isPending}
      />
    </div>
  );
}