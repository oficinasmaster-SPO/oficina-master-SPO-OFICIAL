import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Home, RotateCcw, Users, Briefcase, Sparkles } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Cell } from "recharts";
import { profileInfo } from "../components/disc/DISCQuestions";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import ActionPlanCard from "../components/diagnostics/ActionPlanCard";
import ActionPlanDetails from "../components/diagnostics/ActionPlanDetails";
import ActionPlanFeedbackModal from "../components/diagnostics/ActionPlanFeedbackModal";

export default function ResultadoDISC() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [diagnostic, setDiagnostic] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [teamComparison, setTeamComparison] = useState(null);
  const [showActionPlanDetails, setShowActionPlanDetails] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: actionPlan } = useQuery({
    queryKey: ['action-plan', diagnostic?.id],
    queryFn: async () => {
      const plans = await base44.entities.DiagnosticActionPlan.filter({
        diagnostic_id: diagnostic.id,
        diagnostic_type: 'DISCDiagnostic'
      });
      return plans.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
    },
    enabled: !!diagnostic?.id
  });

  const generatePlanMutation = useMutation({
    mutationFn: async () => base44.functions.invoke('generateActionPlanDISC', { diagnostic_id: diagnostic.id }),
    onSuccess: () => {
      queryClient.invalidateQueries(['action-plan', diagnostic.id]);
      toast.success('Plano gerado!');
    }
  });

  const refinePlanMutation = useMutation({
    mutationFn: async ({ feedback }) => base44.functions.invoke('refineActionPlan', {
      plan_id: actionPlan.id,
      feedback_content: feedback.content,
      feedback_type: feedback.type,
      audio_url: feedback.audio_url
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['action-plan', diagnostic.id]);
      setShowFeedbackModal(false);
      toast.success('Plano refinado!');
    }
  });

  const updateActivityMutation = useMutation({
    mutationFn: async ({ activityIndex, status }) => {
      const updatedSchedule = [...actionPlan.plan_data.implementation_schedule];
      updatedSchedule[activityIndex].status = status;
      if (status === 'concluida') updatedSchedule[activityIndex].completed_date = new Date().toISOString();
      const completion = Math.round((updatedSchedule.filter(a => a.status === 'concluida').length / updatedSchedule.length) * 100);
      return await base44.entities.DiagnosticActionPlan.update(actionPlan.id, {
        plan_data: { ...actionPlan.plan_data, implementation_schedule: updatedSchedule },
        completion_percentage: completion
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['action-plan', diagnostic.id]);
      toast.success('Atividade atualizada!');
    }
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const diagnosticId = urlParams.get("id");

      if (!diagnosticId) {
        toast.error("Diagnóstico não encontrado");
        navigate(createPageUrl("Home"));
        return;
      }

      const diagnostics = await base44.entities.DISCDiagnostic.list();
      const currentDiagnostic = diagnostics.find(d => d.id === diagnosticId);

      if (!currentDiagnostic) {
        toast.error("Diagnóstico não encontrado");
        navigate(createPageUrl("Home"));
        return;
      }

      setDiagnostic(currentDiagnostic);

      const employees = await base44.entities.Employee.list();
      const emp = employees.find(e => e.id === currentDiagnostic.employee_id);
      setEmployee(emp);

      // Carregar comparação de equipe se tiver team_name
      if (currentDiagnostic.team_name) {
        await loadTeamComparison(currentDiagnostic.team_name, currentDiagnostic);
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar resultado");
    } finally {
      setLoading(false);
    }
  };

  const loadTeamComparison = async (teamName, currentDiag) => {
    try {
      const allDiagnostics = await base44.entities.DISCDiagnostic.list();
      const teamDiagnostics = allDiagnostics.filter(d => 
        d.team_name === teamName && d.completed && d.id !== currentDiag.id
      );

      if (teamDiagnostics.length > 0) {
        const avgScores = {
          executor_d: 0,
          comunicador_i: 0,
          planejador_s: 0,
          analista_c: 0
        };

        teamDiagnostics.forEach(diag => {
          avgScores.executor_d += diag.profile_scores.executor_d;
          avgScores.comunicador_i += diag.profile_scores.comunicador_i;
          avgScores.planejador_s += diag.profile_scores.planejador_s;
          avgScores.analista_c += diag.profile_scores.analista_c;
        });

        const count = teamDiagnostics.length;
        Object.keys(avgScores).forEach(key => {
          avgScores[key] = avgScores[key] / count;
        });

        setTeamComparison({
          teamName,
          avgScores,
          memberCount: count
        });
      }
    } catch (error) {
      console.error("Erro ao carregar comparação de equipe:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!diagnostic) return null;

  const scores = diagnostic.profile_scores;
  const dominantProfile = profileInfo[diagnostic.dominant_profile];

  // Dados para gráfico de barras
  const barChartData = [
    { name: "Executor (D)", value: scores.executor_d, color: "#ef4444" },
    { name: "Comunicador (I)", value: scores.comunicador_i, color: "#f59e0b" },
    { name: "Planejador (S)", value: scores.planejador_s, color: "#22c55e" },
    { name: "Analista (C)", value: scores.analista_c, color: "#3b82f6" }
  ];

  // Dados para radar chart
  const radarData = [
    { profile: "Executor", score: scores.executor_d },
    { profile: "Comunicador", score: scores.comunicador_i },
    { profile: "Planejador", score: scores.planejador_s },
    { profile: "Analista", score: scores.analista_c }
  ];

  // Dados para comparação com equipe
  const comparisonData = teamComparison ? [
    {
      profile: "Executor (D)",
      Líder: diagnostic.is_leader ? scores.executor_d : 0,
      Avaliado: !diagnostic.is_leader ? scores.executor_d : 0,
      Equipe: teamComparison.avgScores.executor_d
    },
    {
      profile: "Comunicador (I)",
      Líder: diagnostic.is_leader ? scores.comunicador_i : 0,
      Avaliado: !diagnostic.is_leader ? scores.comunicador_i : 0,
      Equipe: teamComparison.avgScores.comunicador_i
    },
    {
      profile: "Planejador (S)",
      Líder: diagnostic.is_leader ? scores.planejador_s : 0,
      Avaliado: !diagnostic.is_leader ? scores.planejador_s : 0,
      Equipe: teamComparison.avgScores.planejador_s
    },
    {
      profile: "Analista (C)",
      Líder: diagnostic.is_leader ? scores.analista_c : 0,
      Avaliado: !diagnostic.is_leader ? scores.analista_c : 0,
      Equipe: teamComparison.avgScores.analista_c
    }
  ] : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Resultado - Teste DISC
          </h1>
          {employee && (
            <p className="text-xl text-gray-600">
              {employee.full_name} - {employee.position}
            </p>
          )}
          {diagnostic.is_leader && (
            <span className="inline-block bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-semibold mt-2">
              👑 Líder
            </span>
          )}
        </div>

        {/* Perfil Predominante */}
        <Card className="border-2 shadow-xl" style={{ borderColor: dominantProfile.color }}>
          <CardContent className="p-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4" 
                   style={{ backgroundColor: dominantProfile.color + '20' }}>
                <span className="text-4xl font-bold" style={{ color: dominantProfile.color }}>
                  {diagnostic.dominant_profile.charAt(0).toUpperCase()}
                </span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Perfil Predominante: {dominantProfile.title}
              </h2>
              <p className="text-lg text-gray-600 mb-6">{dominantProfile.description}</p>
              <div className="text-6xl font-bold mb-2" style={{ color: dominantProfile.color }}>
                {scores[diagnostic.dominant_profile].toFixed(0)}%
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Distribuição dos Perfis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Barras */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuição DISC</CardTitle>
              <CardDescription>Percentual de cada perfil comportamental</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-15} textAnchor="end" height={80} />
                  <YAxis label={{ value: 'Percentual (%)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                  <Bar dataKey="value">
                    {barChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Gráfico Radar */}
          <Card>
            <CardHeader>
              <CardTitle>Visão Radar</CardTitle>
              <CardDescription>Visualização multidimensional do perfil</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="profile" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar name="Pontuação" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.6} />
                  <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Comparação com Equipe */}
        {teamComparison && comparisonData && (
          <Card className="border-2 border-purple-200">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-purple-600" />
                <div>
                  <CardTitle>Comparação com a Equipe</CardTitle>
                  <CardDescription>
                    Equipe: {teamComparison.teamName} | Membros avaliados: {teamComparison.memberCount}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="profile" />
                  <YAxis label={{ value: 'Percentual (%)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                  <Legend />
                  {diagnostic.is_leader && <Bar dataKey="Líder" fill="#8b5cf6" />}
                  {!diagnostic.is_leader && <Bar dataKey="Avaliado" fill="#6366f1" />}
                  <Bar dataKey="Equipe" fill="#94a3b8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Características do Perfil Predominante */}
        <Card>
          <CardHeader>
            <CardTitle>Características Principais</CardTitle>
            <CardDescription>{dominantProfile.title}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {dominantProfile.characteristics.map((char, index) => (
                <li key={index} className="flex items-start gap-2 bg-gray-50 rounded-lg p-3">
                  <span className="text-lg" style={{ color: dominantProfile.color }}>✓</span>
                  <span className="text-gray-700">{char}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Funções Recomendadas */}
        <Card className="border-2 border-indigo-200">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Briefcase className="w-6 h-6 text-indigo-600" />
              <div>
                <CardTitle>Funções Recomendadas</CardTitle>
                <CardDescription>Baseado no perfil DISC identificado</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {diagnostic.recommended_roles?.map((role, index) => (
                <div key={index} className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                  <p className="font-semibold text-indigo-900">{role}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Todos os Perfis */}
        <Card>
          <CardHeader>
            <CardTitle>Detalhamento Completo dos Perfis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(profileInfo).map(([key, profile]) => (
                <div key={key} className="rounded-lg p-4 border-2" style={{ borderColor: profile.color }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                         style={{ backgroundColor: profile.color }}>
                      {key.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{profile.title}</h3>
                      <p className="text-2xl font-bold" style={{ color: profile.color }}>
                        {scores[key].toFixed(0)}%
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full transition-all"
                      style={{ width: `${scores[key]}%`, backgroundColor: profile.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Plano Personalizado com IA */}
        {showActionPlanDetails && actionPlan ? (
          <div className="mb-6">
            <ActionPlanDetails
              plan={actionPlan}
              onUpdateActivity={(index, status) => updateActivityMutation.mutate({ activityIndex: index, status })}
              onBack={() => setShowActionPlanDetails(false)}
            />
          </div>
        ) : actionPlan ? (
          <div className="mb-6">
            <ActionPlanCard
              plan={actionPlan}
              onViewDetails={() => setShowActionPlanDetails(true)}
              onRefine={() => setShowFeedbackModal(true)}
            />
          </div>
        ) : (
          <Card className="mb-6 border-2 border-dashed border-indigo-300 bg-indigo-50">
            <CardContent className="p-8 text-center">
              <Sparkles className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Plano de Desenvolvimento Comportamental com IA
              </h3>
              <p className="text-gray-600 mb-6">
                Gere um plano para otimizar comunicação e trabalho em equipe baseado no perfil DISC.
              </p>
              <Button
                onClick={() => generatePlanMutation.mutate()}
                disabled={generatePlanMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700"
                size="lg"
              >
                {generatePlanMutation.isPending ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Gerando...</>
                ) : (
                  <><Sparkles className="w-5 h-5 mr-2" />Gerar Plano com IA</>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        <ActionPlanFeedbackModal
          open={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
          onSubmit={(feedback) => refinePlanMutation.mutate({ feedback })}
          isLoading={refinePlanMutation.isPending}
        />

        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl("Home"))}
            className="px-8"
          >
            <Home className="w-4 h-4 mr-2" />
            Voltar ao Início
          </Button>
          <Button
            onClick={() => navigate(createPageUrl("DiagnosticoDISC"))}
            className="px-8 bg-indigo-600 hover:bg-indigo-700"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Avaliar Outro Colaborador
          </Button>
        </div>
      </div>
    </div>
  );
}