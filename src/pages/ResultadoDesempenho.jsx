import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Home, RotateCcw, TrendingUp, AlertCircle, Award, Target, Sparkles } from "lucide-react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ZAxis, ReferenceArea } from "recharts";
import { classificationRules } from "../components/performance/PerformanceCriteria";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import ActionPlanCard from "../components/diagnostics/ActionPlanCard";
import ActionPlanDetails from "../components/diagnostics/ActionPlanDetails";
import ActionPlanFeedbackModal from "../components/diagnostics/ActionPlanFeedbackModal";

export default function ResultadoDesempenho() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [diagnostic, setDiagnostic] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [showActionPlanDetails, setShowActionPlanDetails] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const queryClient = useQueryClient();

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

      const diagnostics = await base44.entities.PerformanceMatrixDiagnostic.list();
      const currentDiagnostic = diagnostics.find(d => d.id === diagnosticId);

      if (!currentDiagnostic) {
        toast.error("Diagnóstico não encontrado");
        navigate(createPageUrl("Home"));
        return;
      }

      setDiagnostic(currentDiagnostic);

      const employees = await base44.entities.Employee.list();
      const currentEmployee = employees.find(e => e.id === currentDiagnostic.employee_id);
      setEmployee(currentEmployee);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar resultado");
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

  if (!diagnostic || !employee) return null;

  const { data: actionPlan } = useQuery({
    queryKey: ['action-plan', diagnostic.id],
    queryFn: async () => {
      const plans = await base44.entities.DiagnosticActionPlan.filter({
        diagnostic_id: diagnostic.id,
        diagnostic_type: 'PerformanceMatrixDiagnostic'
      });
      return plans.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
    },
    enabled: !!diagnostic?.id
  });

  const generatePlanMutation = useMutation({
    mutationFn: async () => base44.functions.invoke('generateActionPlanPerformance', { diagnostic_id: diagnostic.id }),
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

  const classificationInfo = classificationRules[diagnostic.classification];
  
  const colorMap = {
    red: "#ef4444",
    orange: "#f97316",
    yellow: "#eab308",
    blue: "#3b82f6",
    green: "#22c55e",
    purple: "#a855f7"
  };

  const bgColorMap = {
    red: "from-red-500 to-red-600",
    orange: "from-orange-500 to-orange-600",
    yellow: "from-yellow-500 to-yellow-600",
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    purple: "from-purple-500 to-purple-600"
  };

  const matrixData = [{
    x: diagnostic.technical_average,
    y: diagnostic.emotional_average,
    z: 300
  }];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border">
          <p className="font-semibold">{employee?.full_name}</p>
          <p className="text-sm">Técnica: {payload[0].value.toFixed(1)}</p>
          <p className="text-sm">Emocional: {payload[1].value.toFixed(1)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Resultado da Avaliação de Desempenho
          </h1>
          {employee && (
            <p className="text-xl text-gray-600">
              {employee.full_name} - {employee.position}
            </p>
          )}
        </div>

        {/* Classificação */}
        <Card className={`border-2 shadow-xl bg-gradient-to-br ${bgColorMap[classificationInfo.color]}`}>
          <CardContent className="p-8 text-white">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <Award className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold">{classificationInfo.title}</h2>
                <p className="text-white/90 text-lg">{classificationInfo.description}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Médias */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-2 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <Target className="w-5 h-5" />
                Competência Técnica
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-5xl font-bold text-blue-600 mb-2">
                  {diagnostic.technical_average.toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">de 10,0 pontos</div>
                <div className="mt-4 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 rounded-full transition-all"
                    style={{ width: `${(diagnostic.technical_average / 10) * 100}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-700">
                <TrendingUp className="w-5 h-5" />
                Competência Emocional
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-5xl font-bold text-purple-600 mb-2">
                  {diagnostic.emotional_average.toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">de 10,0 pontos</div>
                <div className="mt-4 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-600 rounded-full transition-all"
                    style={{ width: `${(diagnostic.emotional_average / 10) * 100}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Matriz de Decisão - Gráfico */}
        <Card>
          <CardHeader>
            <CardTitle>Posicionamento na Matriz de Decisão</CardTitle>
            <CardDescription>
              Visualização do colaborador no gráfico de competências
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={500}>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 40 }}>
                {/* Zonas de fundo coloridas */}
                <ReferenceArea x1={0} x2={5} y1={0} y2={5} fill="#fee2e2" opacity={0.4} />
                <ReferenceArea x1={0} x2={5} y1={5} y2={7} fill="#fed7aa" opacity={0.4} />
                <ReferenceArea x1={5} x2={7} y1={0} y2={5} fill="#fef3c7" opacity={0.4} />
                <ReferenceArea x1={5} x2={7} y1={5} y2={7} fill="#dbeafe" opacity={0.4} />
                <ReferenceArea x1={7} x2={10} y1={5} y2={7} fill="#d1fae5" opacity={0.4} />
                <ReferenceArea x1={7} x2={10} y1={7} y2={10} fill="#e9d5ff" opacity={0.4} />
                
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  type="number" 
                  dataKey="x" 
                  name="Técnica" 
                  domain={[0, 10]}
                  label={{ value: 'Competências Técnicas - Habilidade/Conhecimento', position: 'bottom', offset: 20 }}
                  ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
                />
                <YAxis 
                  type="number" 
                  dataKey="y" 
                  name="Emocional" 
                  domain={[0, 10]}
                  label={{ value: 'Competências Emocionais - Atitude/Caráter', angle: -90, position: 'left', offset: 10 }}
                  ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
                />
                <ZAxis type="number" dataKey="z" range={[200, 400]} />
                <Tooltip content={<CustomTooltip />} />

                <Scatter name="Colaborador" data={matrixData} fill={colorMap[classificationInfo.color]}>
                  {matrixData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colorMap[classificationInfo.color]} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>

            {/* Legenda das zonas */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-6">
              {Object.entries(classificationRules).map(([key, rule]) => (
                <div key={key} className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded" 
                    style={{ backgroundColor: colorMap[rule.color] }}
                  />
                  <span className="text-sm">{rule.title}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recomendação */}
        <Card className="border-2 border-amber-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              Recomendações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 leading-relaxed">
              {diagnostic.recommendation}
            </p>
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
                Plano de Desenvolvimento com IA
              </h3>
              <p className="text-gray-600 mb-6">
                Gere um plano para desenvolver competências de {employee?.full_name}.
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
            onClick={() => navigate(createPageUrl("DiagnosticoDesempenho"))}
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