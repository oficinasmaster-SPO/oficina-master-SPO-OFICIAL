import React, { useState, useEffect } from "react";
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
import SprintClientSection from "../components/aceleracao/sprint-client/SprintClientSection";

export default function PainelClienteAceleracao() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showPlanDetails, setShowPlanDetails] = useState(false);
  
  const { data: user, isLoading: loadingUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
    retry: false
  });

  // Detect admin/assistance mode from URL
  const urlParams = new URLSearchParams(window.location.search);
  const adminWorkshopId = urlParams.get('workshop_id');
  const isAdminMode = !!adminWorkshopId;
  const workshopIdToUse = adminWorkshopId || user?.data?.workshop_id || user?.workshop_id;

  const { data: workshop } = useQuery({
    queryKey: ['workshop-painel', workshopIdToUse],
    queryFn: () => base44.entities.Workshop.get(workshopIdToUse),
    enabled: !!workshopIdToUse,
    staleTime: 5 * 60 * 1000,
    retry: false
  });

  const { data: atendimentos, isLoading: loadingAtendimentos } = useQuery({
    queryKey: ['meus-atendimentos', workshop?.id],
    queryFn: async () => {
      return await base44.entities.ConsultoriaAtendimento.filter(
        { workshop_id: workshop.id },
        '-data_agendada'
      );
    },
    enabled: !!workshop?.id,
    staleTime: 5 * 60 * 1000,
    retry: false
  });

  // Buscar recursos do plano
  const { data: planFeatures = [] } = useQuery({
    queryKey: ['plan-features'],
    queryFn: () => base44.entities.PlanFeature.list(),
    enabled: !!workshop?.id,
    staleTime: 5 * 60 * 1000,
    retry: false
  });

  // Buscar regras de atendimento do plano
  const { data: planAttendanceRules = [] } = useQuery({
    queryKey: ['plan-attendance-rules', workshop?.planoAtual],
    queryFn: async () => {
      if (!workshop?.planoAtual) return [];
      return await base44.entities.PlanAttendanceRule.filter({ 
        plan_id: workshop.planoAtual, 
        is_active: true 
      });
    },
    enabled: !!workshop?.planoAtual,
    staleTime: 5 * 60 * 1000,
    retry: false
  });

  // Buscar progresso do cronograma de implementação
  const { data: cronogramaItems = [] } = useQuery({
    queryKey: ['progresso-implementacao', workshop?.id],
    queryFn: () => base44.entities.CronogramaImplementacao.filter({ workshop_id: workshop.id }),
    enabled: !!workshop?.id,
    staleTime: 0, // Força sempre buscar do servidor
    refetchInterval: 5000, // Refetch a cada 5 segundos enquanto página ativa
    retry: false
  });

  // Hook: Escutar mudanças em ATAs e invalidar cache do cronograma
  useEffect(() => {
    if (!workshop?.id) return;
    
    const unsubscribe = base44.entities.MeetingMinutes.subscribe((event) => {
      if (event.type === 'update' && event.data?.workshop_id === workshop.id) {
        queryClient.invalidateQueries(['progresso-implementacao', workshop.id]);
      }
    });

    return unsubscribe;
  }, [workshop?.id, queryClient]);

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
    enabled: !!workshop?.id,
    staleTime: 5 * 60 * 1000,
    retry: false
  });

  const { data: atas = [] } = useQuery({
    queryKey: ['meeting-minutes', workshop?.id],
    queryFn: () => base44.entities.MeetingMinutes.filter(
      { workshop_id: workshop.id, status: 'finalizada' },
      '-meeting_date'
    ),
    enabled: !!workshop?.id,
    staleTime: 5 * 60 * 1000,
    retry: false
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
    enabled: !!workshop?.id,
    staleTime: 5 * 60 * 1000,
    retry: false
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
  // Admins e modo admin sempre podem acessar
  const planosValidos = ['START', 'BRONZE', 'PRATA', 'GOLD', 'IOM', 'MILLIONS'];
  const temPlanoAtivo = workshop?.planoAtual && planosValidos.includes(workshop.planoAtual);
  const canBypassPlanCheck = user?.role === 'admin' || isAdminMode;

  if (!temPlanoAtivo && !canBypassPlanCheck) {
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

  // Configuração do plano atual
  const currentPlanData = planFeatures.find(p => p.plan_id === workshop?.planoAtual);
  
  // Combinar itens do cronograma com itens configurados no plano
  const allPlanItems = [
    ...(currentPlanData?.cronograma_features || []).map(f => ({
      codigo: f,
      nome: f.replace(/_/g, ' ').toUpperCase(),
      tipo: 'funcionalidade'
    })),
    ...(currentPlanData?.cronograma_modules || []).map(m => ({
      codigo: m,
      nome: m,
      tipo: 'modulo'
    })),
    ...planAttendanceRules.map(rule => ({
      codigo: rule.attendance_type_id,
      nome: `${rule.attendance_type_name} (${rule.total_allowed}x)`,
      tipo: 'atendimento'
    }))
  ];

  // Mesclar itens do plano com itens já rastreados no cronograma
  const allItemsForPanel = allPlanItems.map(planItem => {
    const cronogramaItem = cronogramaItems.find(c => c.item_id === planItem.codigo || c.item_nome === planItem.nome);
    
    if (cronogramaItem) {
      return cronogramaItem;
    }
    
    // Item não iniciado - criar virtual
    return {
      id: `virtual-${planItem.codigo}-${Date.now()}`,
      item_nome: planItem.nome,
      item_tipo: planItem.tipo,
      item_id: planItem.codigo,
      status: 'a_fazer',
      workshop_id: workshop?.id,
      created_date: workshop?.created_date || new Date().toISOString(),
      data_inicio_previsto: null,
      data_termino_previsto: null,
      not_started: true
    };
  });

  // Calcular se tarefa está atrasada
  const isTaskOverdue = (item) => {
    if (item.status === 'concluido') return false;
    
    // Se há data de início previsto customizada, usar ela. Senão, usar 7 dias após criação
    const dataInicioPrevisto = item.data_inicio_previsto 
      ? new Date(item.data_inicio_previsto)
      : new Date(new Date(item.created_date).getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const hoje = new Date();
    
    // Atrasada se passou a data de início previsto
    if (hoje > dataInicioPrevisto) return true;
    
    // Atrasada se há data de término previsto e passou 1 dia após ela
    if (item.data_termino_previsto) {
      const dataTerminoPrevisto = new Date(item.data_termino_previsto);
      const dataTerminoComToleranciA = new Date(dataTerminoPrevisto.getTime() + 1 * 24 * 60 * 60 * 1000);
      if (hoje > dataTerminoComToleranciA) return true;
    }
    
    return false;
  };

  const tarefasPendentes = allItemsForPanel?.filter(p => 
    p.status !== 'concluido'
  ).map(p => ({
    ...p,
    isOverdue: isTaskOverdue(p)
  })) || [];

  const progressoGeral = allItemsForPanel?.length > 0 
    ? Math.round((allItemsForPanel.filter(p => p.status === 'concluido').length / allItemsForPanel.length) * 100)
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
                    {allItemsForPanel?.filter(p => p.status === 'concluido').length || 0}
                  </p>
                  <p className="text-xs text-gray-600">Concluídos</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-600">
                    {allItemsForPanel?.filter(p => p.status === 'em_andamento').length || 0}
                  </p>
                  <p className="text-xs text-gray-600">Em Andamento</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-600">
                    {allItemsForPanel?.filter(p => p.status === 'a_fazer').length || 0}
                  </p>
                  <p className="text-xs text-gray-600">A Fazer</p>
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

      {/* Sprints de Aceleração - Colaborativo */}
      {workshop?.id && user && (
        <SprintClientSection workshopId={workshop.id} user={user} workshop={workshop} />
      )}

      {/* Atividades de Implementação do Cronograma */}
      <AtividadesImplementacao items={allItemsForPanel} workshop={workshop} />

      <div className="grid md:grid-cols-1 gap-6">
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
                 {(Array.isArray(tarefasPendentes) ? tarefasPendentes : []).slice(0, 5).map((tarefa) => (
                   <div 
                     key={tarefa.id} 
                     className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                       tarefa.isOverdue ? 'border-red-300 bg-red-50' : 'hover:bg-gray-50'
                     }`}
                     onClick={() => navigate(createPageUrl("CronogramaImplementacao"))}
                   >
                     <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                       tarefa.isOverdue ? 'text-red-600' : 'text-orange-500'
                     }`} />
                     <div className="flex-1">
                       <p className="font-medium text-sm">{tarefa.item_nome}</p>
                       <p className="text-xs text-gray-600">
                         Status: {tarefa.status === 'em_andamento' ? 'Em andamento' : 'A fazer'}
                       </p>
                       {tarefa.isOverdue && (
                         <p className="text-xs text-red-600 font-semibold mt-1">⚠️ Atrasada</p>
                       )}
                     </div>
                   </div>
                 ))}
               </div>
             )}
           </CardContent>
         </Card>
      </div>

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