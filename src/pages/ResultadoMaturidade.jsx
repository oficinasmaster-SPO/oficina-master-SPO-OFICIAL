import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, ArrowRight, Home, User, Target, Lightbulb, Sparkles } from "lucide-react";
import { maturityLevels } from "../components/maturity/MaturityQuestions";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import ActionPlanCard from "../components/diagnostics/ActionPlanCard";
import ActionPlanDetails from "../components/diagnostics/ActionPlanDetails";
import ActionPlanFeedbackModal from "../components/diagnostics/ActionPlanFeedbackModal";

export default function ResultadoMaturidade() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [diagnostic, setDiagnostic] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [showActionPlanDetails, setShowActionPlanDetails] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const queryClient = useQueryClient();

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

      const diagnostics = await base44.entities.CollaboratorMaturityDiagnostic.list();
      const diag = diagnostics.find(d => d.id === id);
      
      if (!diag) {
        navigate(createPageUrl("Home"));
        return;
      }

      setDiagnostic(diag);

      const employees = await base44.entities.Employee.list();
      const emp = employees.find(e => e.id === diag.employee_id);
      setEmployee(emp);

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
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!diagnostic || !employee) return null;

  const levelInfo = maturityLevels[diagnostic.maturity_level];

  // Buscar plano de ação
  const { data: actionPlan } = useQuery({
    queryKey: ['action-plan', diagnostic?.id],
    queryFn: async () => {
      const plans = await base44.entities.DiagnosticActionPlan.filter({
        diagnostic_id: diagnostic.id,
        diagnostic_type: 'CollaboratorMaturityDiagnostic'
      });
      return plans.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
    },
    enabled: !!diagnostic?.id
  });

  const generatePlanMutation = useMutation({
    mutationFn: async () => {
      return await base44.functions.invoke('generateActionPlanMaturity', {
        diagnostic_id: diagnostic.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['action-plan', diagnostic.id]);
      toast.success('Plano de desenvolvimento gerado!');
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
  
  const chartData = [
    { name: "Bebê (Direção)", value: diagnostic.maturity_scores.bebe, color: "#ef4444" },
    { name: "Criança (Orientação)", value: diagnostic.maturity_scores.crianca, color: "#f59e0b" },
    { name: "Adolescente (Apoio)", value: diagnostic.maturity_scores.adolescente, color: "#3b82f6" },
    { name: "Adulto (Delegação)", value: diagnostic.maturity_scores.adulto, color: "#10b981" }
  ];

  const barData = [
    { name: "Bebê", value: diagnostic.maturity_scores.bebe, fill: "#ef4444" },
    { name: "Criança", value: diagnostic.maturity_scores.crianca, fill: "#f59e0b" },
    { name: "Adolescente", value: diagnostic.maturity_scores.adolescente, fill: "#3b82f6" },
    { name: "Adulto", value: diagnostic.maturity_scores.adulto, fill: "#10b981" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
            <CheckCircle2 className="w-8 h-8 text-purple-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Análise de Maturidade Concluída
          </h1>
          <div className="flex items-center justify-center gap-2 text-gray-600">
            <User className="w-5 h-5" />
            <span className="font-semibold">{employee.full_name}</span>
            <span>•</span>
            <span>{employee.position}</span>
          </div>
          {workshop && (
            <p className="text-gray-500 mt-1">{workshop.name}</p>
          )}
        </div>

        {/* Nível Identificado */}
        <Card className={`shadow-xl border-2 mb-8 bg-gradient-to-br ${levelInfo.color}`}>
          <CardHeader className="text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold opacity-90 mb-1">{levelInfo.name}</div>
                <CardTitle className="text-3xl mb-2">{levelInfo.title}</CardTitle>
                <Badge className="bg-white/20 text-white border-white/30 text-base">
                  Estilo de Gestão: {levelInfo.subtitle}
                </Badge>
              </div>
              <div className="text-7xl font-bold opacity-20">
                {diagnostic.maturity_level === "bebe" ? "1" : 
                 diagnostic.maturity_level === "crianca" ? "2" :
                 diagnostic.maturity_level === "adolescente" ? "3" : "4"}
              </div>
            </div>
          </CardHeader>
          <CardContent className="bg-white rounded-b-xl p-6">
            <p className="text-lg text-gray-700 leading-relaxed">
              {levelInfo.description}
            </p>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Gráfico Pizza */}
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
                    label={({ value }) => value > 0 ? value : ""}
                    outerRadius={90}
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

          {/* Gráfico Barras */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Pontuação por Nível</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Características */}
        <Card className="shadow-lg mb-8">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-t-xl">
            <div className="flex items-center gap-3">
              <Target className="w-6 h-6" />
              <CardTitle className="text-2xl">Características Identificadas</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <ul className="grid md:grid-cols-2 gap-4">
              {levelInfo.characteristics.map((char, index) => (
                <li key={index} className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{char}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Estilo de Gestão */}
        <Card className="shadow-lg mb-8 border-2 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Lightbulb className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Como Gerenciar Este Colaborador</h3>
                <p className="text-lg text-gray-700 leading-relaxed">
                  {levelInfo.managementStyle}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Plano de Ação Básico */}
        <Card className="shadow-lg mb-8">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-t-xl">
            <CardTitle className="text-2xl">Plano de Ação Recomendado</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {levelInfo.actionPlan.map((action, index) => (
                <div key={index} className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <p className="text-gray-700 flex-1">{action}</p>
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
          <Card className="mb-8 border-2 border-dashed border-purple-300 bg-purple-50">
            <CardContent className="p-8 text-center">
              <Sparkles className="w-12 h-12 text-purple-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Plano de Desenvolvimento Personalizado com IA
              </h3>
              <p className="text-gray-600 mb-6">
                Gere um plano específico de desenvolvimento para {employee.full_name} baseado no nível de maturidade identificado.
              </p>
              <Button
                onClick={() => generatePlanMutation.mutate()}
                disabled={generatePlanMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700"
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
        <div className="flex flex-wrap justify-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl("Home"))}
            className="px-8"
          >
            <Home className="w-4 h-4 mr-2" />
            Voltar ao Início
          </Button>
          <Button
            onClick={() => navigate(createPageUrl("DiagnosticoMaturidade"))}
            className="px-8 bg-purple-600 hover:bg-purple-700"
          >
            Avaliar Outro Colaborador
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}