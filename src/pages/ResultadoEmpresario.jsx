import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, ArrowRight, Home, Sparkles } from "lucide-react";
import { profilesInfo } from "../components/entrepreneur/EntrepreneurQuestions";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import ActionPlanCard from "../components/diagnostics/ActionPlanCard";
import ActionPlanDetails from "../components/diagnostics/ActionPlanDetails";
import ActionPlanFeedbackModal from "../components/diagnostics/ActionPlanFeedbackModal";

export default function ResultadoEmpresario() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [diagnostic, setDiagnostic] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [showActionPlanDetails, setShowActionPlanDetails] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: actionPlan } = useQuery({
    queryKey: ['action-plan', diagnostic?.id],
    queryFn: async () => {
      const plans = await base44.entities.DiagnosticActionPlan.filter({
        diagnostic_id: diagnostic.id,
        diagnostic_type: 'EntrepreneurDiagnostic'
      });
      return plans.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
    },
    enabled: !!diagnostic?.id
  });

  const generatePlanMutation = useMutation({
    mutationFn: async () => base44.functions.invoke('generateActionPlanEntrepreneur', { diagnostic_id: diagnostic.id }),
    onSuccess: () => {
      queryClient.invalidateQueries(['action-plan', diagnostic.id]);
      toast.success('Plano de desenvolvimento gerado!');
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
    loadDiagnostic();
  }, []);

  const loadDiagnostic = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const id = urlParams.get("id");
      
      if (!id) {
        navigate(createPageUrl("Home"));
        return;
      }

      const diagnostics = await base44.entities.EntrepreneurDiagnostic.list();
      const diag = diagnostics.find(d => d.id === id);
      
      if (!diag) {
        navigate(createPageUrl("Home"));
        return;
      }

      setDiagnostic(diag);

      if (diag.workshop_id) {
        const workshops = await base44.entities.Workshop.list();
        const ws = workshops.find(w => w.id === diag.workshop_id);
        setWorkshop(ws);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
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

  const profileInfo = profilesInfo[diagnostic.dominant_profile];
  const chartData = [
    { name: "Aventureiro", value: diagnostic.profile_scores.aventureiro, color: "#ef4444" },
    { name: "Empreendedor", value: diagnostic.profile_scores.empreendedor, color: "#f59e0b" },
    { name: "Gestor", value: diagnostic.profile_scores.gestor, color: "#10b981" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Diagnóstico Concluído!
          </h1>
          {workshop && (
            <p className="text-gray-600">
              {workshop.name}
            </p>
          )}
        </div>

        {/* Perfil Dominante */}
        <Card className={`shadow-xl border-2 mb-8 bg-gradient-to-br ${profileInfo.color}`}>
          <CardHeader className="text-white">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-3xl mb-2">{profileInfo.title}</CardTitle>
                <Badge className="bg-white/20 text-white border-white/30">
                  Duração Típica: {profileInfo.duration}
                </Badge>
              </div>
              <div className="text-6xl font-bold opacity-20">
                {diagnostic.dominant_profile.charAt(0).toUpperCase()}
              </div>
            </div>
          </CardHeader>
          <CardContent className="bg-white rounded-b-xl p-6">
            <p className="text-lg text-gray-700 leading-relaxed mb-6">
              {profileInfo.description}
            </p>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Distribuição */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Distribuição de Respostas</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Características */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Características do seu Perfil</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {profileInfo.characteristics.map((char, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{char}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Próximos Passos */}
        <Card className="shadow-lg mb-8">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-xl">
            <CardTitle className="text-2xl">Próximos Passos Recomendados</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {profileInfo.nextSteps.map((step, index) => (
                <div key={index} className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <p className="text-gray-700 flex-1">{step}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Plano Personalizado com IA */}
        {showActionPlanDetails && actionPlan ? (
          <div className="mb-8">
            <ActionPlanDetails
              plan={actionPlan}
              onUpdateActivity={(index, status) => updateActivityMutation.mutate({ activityIndex: index, status })}
              onBack={() => setShowActionPlanDetails(false)}
            />
          </div>
        ) : actionPlan ? (
          <div className="mb-8">
            <ActionPlanCard
              plan={actionPlan}
              onViewDetails={() => setShowActionPlanDetails(true)}
              onRefine={() => setShowFeedbackModal(true)}
            />
          </div>
        ) : (
          <Card className="mb-8 border-2 border-dashed border-blue-300 bg-blue-50">
            <CardContent className="p-8 text-center">
              <Sparkles className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Plano de Desenvolvimento Personalizado com IA
              </h3>
              <p className="text-gray-600 mb-6">
                Gere um plano específico para evoluir seu perfil empreendedor baseado no diagnóstico.
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
                    Gerando...
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

        <ActionPlanFeedbackModal
          open={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
          onSubmit={(feedback) => refinePlanMutation.mutate({ feedback })}
          isLoading={refinePlanMutation.isPending}
        />

        {/* Ações */}
        <div className="flex justify-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl("Home"))}
            className="px-8"
          >
            <Home className="w-4 h-4 mr-2" />
            Voltar ao Início
          </Button>
          <Button
            onClick={() => navigate(createPageUrl("DiagnosticoEmpresario"))}
            className="px-8 bg-blue-600 hover:bg-blue-700"
          >
            Fazer Novo Diagnóstico
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}