import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, Users, BarChart3, Rocket, ArrowRight, PieChart as PieChartIcon, FileText, Share2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ExecutiveSummary from "../components/resultado/ExecutiveSummary";
import ActionPlanCard from "../components/diagnostics/ActionPlanCard";
import ActionPlanDetails from "../components/diagnostics/ActionPlanDetails";
import ActionPlanFeedbackModal from "../components/diagnostics/ActionPlanFeedbackModal";
import DiagnosticPDFGenerator from "../components/diagnostics/DiagnosticPDFGenerator";

export default function Resultado() {
  const navigate = useNavigate();
  const [diagnostic, setDiagnostic] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phaseDistribution, setPhaseDistribution] = useState(null);
  const [showActionPlanDetails, setShowActionPlanDetails] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: actionPlan } = useQuery({
    queryKey: ['action-plan', diagnostic?.id],
    queryFn: async () => {
      const plans = await base44.entities.DiagnosticActionPlan.filter({
        diagnostic_id: diagnostic.id,
        diagnostic_type: 'Diagnostic'
      });
      return plans.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
    },
    enabled: !!diagnostic?.id
  });

  const generatePlanMutation = useMutation({
    mutationFn: async () => {
      return await base44.functions.invoke('generateActionPlanDiagnostic', {
        diagnostic_id: diagnostic.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['action-plan', diagnostic.id]);
      toast.success('Plano de ação gerado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao gerar plano: ' + error.message);
    }
  });

  const refinePlanMutation = useMutation({
    mutationFn: async ({ feedback }) => {
      return await base44.functions.invoke('refineActionPlan', {
        plan_id: actionPlan.id,
        feedback_content: feedback.content,
        feedback_type: feedback.type,
        audio_url: feedback.audio_url
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['action-plan', diagnostic.id]);
      setShowFeedbackModal(false);
      toast.success('Plano refinado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao refinar plano: ' + error.message);
    }
  });

  const updateActivityMutation = useMutation({
    mutationFn: async ({ activityIndex, status }) => {
      const updatedSchedule = [...actionPlan.plan_data.implementation_schedule];
      updatedSchedule[activityIndex].status = status;
      if (status === 'concluida') {
        updatedSchedule[activityIndex].completed_date = new Date().toISOString();
      }

      const completedCount = updatedSchedule.filter(a => a.status === 'concluida').length;
      const totalCount = updatedSchedule.length;
      const completionPercentage = Math.round((completedCount / totalCount) * 100);

      return await base44.entities.DiagnosticActionPlan.update(actionPlan.id, {
        plan_data: {
          ...actionPlan.plan_data,
          implementation_schedule: updatedSchedule
        },
        completion_percentage: completionPercentage
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['action-plan', diagnostic.id]);
      toast.success('Atividade atualizada!');
    }
  });

  useEffect(() => {
    loadDiagnostic();
  }, []);

  const loadDiagnostic = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("id");
      
      if (!id) {
        navigate(createPageUrl("Home"));
        return;
      }

      const diagnostics = await base44.entities.Diagnostic.list();
      const diag = diagnostics.find(d => d.id === id);
      
      if (!diag) {
        navigate(createPageUrl("Home"));
        return;
      }

      setDiagnostic(diag);

      // Carregar workshop se existir
      if (diag.workshop_id) {
        const workshops = await base44.entities.Workshop.list();
        const ws = workshops.find(w => w.id === diag.workshop_id);
        setWorkshop(ws);

        // Carregar dados do sócio/proprietário
        if (ws?.owner_id) {
          try {
            const users = await base44.entities.User.list();
            const ownerUser = users.find(u => u.id === ws.owner_id);
            setOwner(ownerUser);
          } catch (error) {
            console.error("Erro ao carregar proprietário:", error);
          }
        }
      }

      calculatePhaseDistribution(diag);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePhaseDistribution = (diag) => {
    const letterToPhase = {
      'D': 1,
      'A': 2,
      'C': 3,
      'B': 4
    };

    const phaseCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
    
    diag.answers.forEach(answer => {
      const phase = letterToPhase[answer.selected_option];
      if (phase) {
        phaseCounts[phase]++;
      }
    });

    const totalQuestions = diag.answers.length;

    const distribution = Object.keys(phaseCounts).map(phase => {
      const count = phaseCounts[phase];
      const percent = Math.round((count / totalQuestions) * 100);
      
      return {
        phase: parseInt(phase),
        count,
        percent,
        ...getPhaseInfo(parseInt(phase))
      };
    });

    setPhaseDistribution(distribution);
  };

  const getPhaseInfo = (phase) => {
    const phases = {
      1: {
        title: "Sobrevivência e Geração de Lucro",
        shortTitle: "Sobrevivência",
        description: "Sua oficina está na fase inicial, focada em gerar lucro para consolidar o negócio. Nesta etapa, é fundamental trabalhar com foco em resultados imediatos, controlar custos rigorosamente e estabelecer uma base sólida de clientes.",
        icon: TrendingUp,
        color: "from-red-500 to-orange-500",
        bgColor: "bg-red-50",
        textColor: "text-red-700",
        borderColor: "border-red-200",
        chartColor: "#ef4444"
      },
      2: {
        title: "Crescimento e Ampliação de Time",
        shortTitle: "Crescimento",
        description: "Sua oficina está em crescimento! Já tem lucro razoável e agora precisa aumentar a equipe para continuar expandindo. É hora de contratar pessoas certas e começar a estruturar processos básicos de gestão.",
        icon: Users,
        color: "from-yellow-500 to-amber-500",
        bgColor: "bg-yellow-50",
        textColor: "text-yellow-700",
        borderColor: "border-yellow-200",
        chartColor: "#f59e0b"
      },
      3: {
        title: "Organização, Processos e Liderança",
        shortTitle: "Organização",
        description: "Sua oficina está se organizando! Você já tem uma equipe formada e agora precisa estabelecer processos claros, desenvolver liderança e criar indicadores para medir resultados. Foco em estruturação e eficiência.",
        icon: BarChart3,
        color: "from-blue-500 to-cyan-500",
        bgColor: "bg-blue-50",
        textColor: "text-blue-700",
        borderColor: "border-blue-200",
        chartColor: "#3b82f6"
      },
      4: {
        title: "Consolidação e Escala",
        shortTitle: "Consolidação",
        description: "Parabéns! Sua oficina está consolidada no mercado. Você tem processos estabelecidos, equipe engajada e pode focar em planejamento estratégico de longo prazo. É hora de pensar em expansão e escala.",
        icon: Rocket,
        color: "from-green-500 to-emerald-500",
        bgColor: "bg-green-50",
        textColor: "text-green-700",
        borderColor: "border-green-200",
        chartColor: "#10b981"
      }
    };
    return phases[phase] || phases[1];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!diagnostic || !phaseDistribution) {
    return null;
  }

  const dominantPhase = phaseDistribution.reduce((prev, current) => 
    current.count > prev.count ? current : prev
  );

  const DominantIcon = dominantPhase.icon;

  const barChartData = phaseDistribution.map(p => ({
    name: `Fase ${p.phase}`,
    respostas: p.count,
    percentual: p.percent
  }));

  const pieChartData = phaseDistribution.map(p => ({
    name: `Fase ${p.phase} (${p.percent}%)`,
    value: p.count,
    color: p.chartColor
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
      {/* Print Header - Only visible on print */}
      <div className="print:block hidden">
        <div className="bg-blue-600 text-white p-4 mb-6">
          <h1 className="text-xl font-bold">OFICINAS MASTER - Educação Empresarial</h1>
          <p className="text-sm">Diagnóstico de Fase da Oficina</p>
          <p className="text-xs">{workshop?.name || 'Oficina'} | {new Date().toLocaleDateString('pt-BR')}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Fase Dominante - Destaque Principal */}
        <Card id="dominant-phase-card" className={`shadow-2xl border-4 ${dominantPhase.borderColor} mb-8 page-break-inside-avoid`}>
          <CardHeader className={`${dominantPhase.bgColor} border-b-4 ${dominantPhase.borderColor}`}>
            <div className="flex items-center gap-4">
              <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${dominantPhase.color} flex items-center justify-center flex-shrink-0`}>
                <DominantIcon className="w-10 h-10 text-white" />
              </div>
              <div className="flex-1">
                <Badge className={`mb-2 ${dominantPhase.bgColor} ${dominantPhase.textColor}`}>
                  SUA FASE PRINCIPAL
                </Badge>
                <CardTitle className="text-2xl md:text-3xl text-gray-900">
                  Fase {dominantPhase.phase} – {dominantPhase.title}
                </CardTitle>
                <p className="text-gray-700 mt-2">
                  {dominantPhase.count} de {diagnostic.answers.length} respostas ({dominantPhase.percent}%) apontam para esta fase
                </p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-8">
            <p className="text-lg text-gray-700 leading-relaxed mb-6">
              {dominantPhase.description}
            </p>

            <div className={`p-6 rounded-xl ${dominantPhase.bgColor} border-2 ${dominantPhase.borderColor}`}>
              <h3 className="font-semibold text-gray-900 mb-3">
                Suas Respostas Predominantes:
              </h3>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${dominantPhase.color} flex items-center justify-center text-white font-bold text-xl`}>
                  {diagnostic.dominant_letter}
                </div>
                <div className="text-gray-700">
                  A maioria das suas respostas indicou características da <span className="font-semibold">Fase {dominantPhase.phase}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumo Executivo com IA */}
        <div id="executive-summary-section" className="mb-8 page-break-inside-avoid">
          <ExecutiveSummary 
            diagnostic={diagnostic}
            workshop={workshop}
            phaseDistribution={phaseDistribution}
          />
        </div>

        {/* Plano de Ação com IA */}
        {showActionPlanDetails && actionPlan ? (
          <div id="action-plan-section" className="mb-8">
            <ActionPlanDetails
              plan={actionPlan}
              onUpdateActivity={(index, status) => updateActivityMutation.mutate({ activityIndex: index, status })}
              onBack={() => setShowActionPlanDetails(false)}
            />
          </div>
        ) : actionPlan ? (
          <div id="action-plan-section" className="mb-8">
            <ActionPlanCard
              plan={actionPlan}
              onViewDetails={() => setShowActionPlanDetails(true)}
              onRefine={() => setShowFeedbackModal(true)}
            />
          </div>
        ) : (
          <Card id="action-plan-section" className="mb-8 border-2 border-dashed border-blue-300 bg-blue-50">
            <CardContent className="p-8 text-center">
              <Sparkles className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Gere seu Plano de Ação Personalizado com IA
              </h3>
              <p className="text-gray-600 mb-6">
                Nossa IA vai criar um plano de ação específico para sua fase, com cronograma, ações práticas e indicadores de acompanhamento.
              </p>
              <Button
                onClick={() => generatePlanMutation.mutate()}
                disabled={generatePlanMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                {generatePlanMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Gerando Plano...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Gerar Plano com IA
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Dashboard de Distribuição */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Análise Completa do Diagnóstico
          </h2>
          <p className="text-gray-600 mb-6">
            Sua oficina apresenta características de diferentes fases. Veja a distribuição completa:
          </p>

          {/* Cards das 4 Fases */}
          <div id="phases-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {phaseDistribution.map((phase) => {
              const PhaseIcon = phase.icon;
              const isDominant = phase.phase === dominantPhase.phase;
              
              return (
                <Card 
                  key={phase.phase} 
                  className={`shadow-lg transition-all ${
                    isDominant ? `border-4 ${phase.borderColor} shadow-xl` : 'hover:shadow-xl'
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${phase.color} flex items-center justify-center`}>
                        <PhaseIcon className="w-7 h-7 text-white" />
                      </div>
                      {isDominant && (
                        <Badge className="bg-blue-600 text-white">
                          Principal
                        </Badge>
                      )}
                    </div>
                    
                    <h3 className="font-bold text-gray-900 mb-1">
                      Fase {phase.phase}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {phase.shortTitle}
                    </p>
                    
                    <div className="space-y-2">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-gray-900">
                          {phase.count}
                        </span>
                        <span className="text-sm text-gray-600">
                          de {diagnostic.answers.length} respostas
                        </span>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full bg-gradient-to-r ${phase.color}`}
                          style={{ width: `${phase.percent}%` }}
                        />
                      </div>
                      
                      <div className="text-right">
                        <span className={`text-2xl font-bold ${phase.textColor}`}>
                          {phase.percent}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Gráficos */}
          <div id="charts-for-pdf" className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Gráfico de Barras */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Distribuição por Fase
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="respostas" name="Número de Respostas">
                      {barChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={phaseDistribution[index].chartColor} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Gráfico de Pizza */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-blue-600" />
                  Percentual de Cada Fase
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name }) => `${name}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Interpretação e Insights */}
        <Card id="insights-section" className="shadow-lg mb-8 border-l-4 border-blue-500 page-break-inside-avoid">
          <CardHeader className="bg-blue-50">
            <CardTitle className="text-xl">
              💡 O que isso significa para sua oficina?
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <p className="text-gray-700 leading-relaxed">
                <strong>Fase Principal:</strong> Sua oficina está predominantemente na <strong>Fase {dominantPhase.phase} - {dominantPhase.shortTitle}</strong>, 
                o que significa que suas maiores necessidades e prioridades estão relacionadas a {dominantPhase.shortTitle.toLowerCase()}.
              </p>
              
              {phaseDistribution.filter(p => p.percent >= 15 && p.phase !== dominantPhase.phase).length > 0 && (
                <p className="text-gray-700 leading-relaxed">
                  <strong>Características Secundárias:</strong> Você também apresenta características significativas de:
                </p>
              )}
              
              <ul className="list-disc list-inside space-y-2 ml-4">
                {phaseDistribution
                  .filter(p => p.percent >= 15 && p.phase !== dominantPhase.phase)
                  .sort((a, b) => b.percent - a.percent)
                  .map(phase => (
                    <li key={phase.phase} className="text-gray-700">
                      <strong>Fase {phase.phase} - {phase.shortTitle}</strong> ({phase.percent}% das respostas)
                    </li>
                  ))}
              </ul>

              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>💡 Dica:</strong> É normal que sua oficina apresente características de múltiplas fases. 
                  O plano de ação vai priorizar as necessidades da sua fase principal, mas também vai abordar 
                  aspectos das outras fases identificadas.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feedback Modal */}
        <ActionPlanFeedbackModal
          open={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
          onSubmit={(feedback) => refinePlanMutation.mutate({ feedback })}
          isLoading={refinePlanMutation.isPending}
        />

        {/* Print Footer - Only visible on print */}
        <div className="print:block hidden mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-600">
          <p>Oficinas Master - Educação Empresarial | www.oficinamaster.com.br</p>
          <p>Gerado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-col sm:flex-row gap-4 print:hidden">
          
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl("Home"))}
            className="flex-1 py-6"
          >
            Voltar ao Início
          </Button>
          
          <DiagnosticPDFGenerator
            diagnostic={diagnostic}
            workshop={workshop}
            phaseDistribution={phaseDistribution}
            dominantPhase={dominantPhase}
            owner={owner}
            executiveSummary={diagnostic?.ai_summary}
            actionPlan={actionPlan}
          />
          
          <Button variant="outline" className="flex-1 py-6" onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            toast.success("Link copiado!");
          }}>
            <Share2 className="w-5 h-5 mr-2" />
            Compartilhar
          </Button>
        </div>
      </div>
    </div>
  );
}