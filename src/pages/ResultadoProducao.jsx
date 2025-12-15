import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, AlertTriangle, AlertCircle, Home, TrendingUp, DollarSign, Target, Lightbulb, ArrowRight, Sparkles } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import ActionPlanCard from "../components/diagnostics/ActionPlanCard";
import ActionPlanDetails from "../components/diagnostics/ActionPlanDetails";
import ActionPlanFeedbackModal from "../components/diagnostics/ActionPlanFeedbackModal";

export default function ResultadoProducao() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [diagnostic, setDiagnostic] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [showActionPlanDetails, setShowActionPlanDetails] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: actionPlan } = useQuery({
    queryKey: ['action-plan', diagnostic?.id],
    queryFn: async () => {
      const plans = await base44.entities.DiagnosticActionPlan.filter({
        diagnostic_id: diagnostic.id,
        diagnostic_type: 'ProductivityDiagnostic'
      });
      return plans.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
    },
    enabled: !!diagnostic?.id
  });

  const generatePlanMutation = useMutation({
    mutationFn: async () => base44.functions.invoke('generateActionPlanProductivity', { diagnostic_id: diagnostic.id }),
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

      const diagnostics = await base44.entities.ProductivityDiagnostic.list();
      const diag = diagnostics.find(d => d.id === id);
      
      if (!diag) {
        navigate(createPageUrl("Home"));
        return;
      }

      setDiagnostic(diag);

      const employees = await base44.entities.Employee.list();
      const emp = employees.find(e => e.id === diag.employee_id);
      setEmployee(emp);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (!diagnostic || !employee) return null;

  const getClassificationInfo = () => {
    const configs = {
      ideal: {
        title: "Ideal",
        color: "from-green-500 to-emerald-500",
        icon: CheckCircle2,
        iconColor: "text-green-600",
        badgeColor: "bg-green-100 text-green-800"
      },
      limite: {
        title: "No Limite",
        color: "from-yellow-500 to-amber-500",
        icon: AlertTriangle,
        iconColor: "text-yellow-600",
        badgeColor: "bg-yellow-100 text-yellow-800"
      },
      aceitavel: {
        title: "Aceitável",
        color: "from-blue-500 to-cyan-500",
        icon: CheckCircle2,
        iconColor: "text-blue-600",
        badgeColor: "bg-blue-100 text-blue-800"
      },
      acima_aceitavel: {
        title: "Acima do Aceitável",
        color: "from-red-500 to-orange-500",
        icon: AlertCircle,
        iconColor: "text-red-600",
        badgeColor: "bg-red-100 text-red-800"
      }
    };

    return configs[diagnostic.classification] || configs.ideal;
  };

  const classInfo = getClassificationInfo();
  const ClassIcon = classInfo.icon;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercentage = (value) => {
    return (value * 100).toFixed(2) + '%';
  };

  const getRoleLabel = (role) => {
    const labels = {
      tecnico: "Técnico",
      tecnico_lider: "Técnico Líder",
      vendas: "Vendas"
    };
    return labels[role] || role;
  };

  const getThreshold = () => {
    if (diagnostic.employee_role === "tecnico" || diagnostic.employee_role === "tecnico_lider") {
      return 0.09; // 9%
    }
    return 0.04; // 4%
  };

  const chartData = [
    { 
      name: "Custo Total", 
      value: diagnostic.total_cost, 
      color: "#ef4444" 
    },
    { 
      name: "Produtividade", 
      value: diagnostic.total_productivity - diagnostic.total_cost, 
      color: "#10b981" 
    }
  ];

  const totalBenefits = 
    diagnostic.benefits.meal_voucher +
    diagnostic.benefits.transport_voucher +
    diagnostic.benefits.health_insurance +
    diagnostic.benefits.other_benefits;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 bg-gradient-to-br ${classInfo.color}`}>
            <ClassIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Análise de Produtividade Concluída
          </h1>
          <div className="flex items-center justify-center gap-2 text-gray-600">
            <span className="font-semibold">{employee.full_name}</span>
            <span>•</span>
            <span>{employee.position}</span>
            <span>•</span>
            <span>{getRoleLabel(diagnostic.employee_role)}</span>
          </div>
          <p className="text-gray-500 mt-1">
            Período: {new Date(diagnostic.period_month + "-01").toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Resultado Principal */}
        <Card className={`shadow-xl border-2 mb-8 bg-gradient-to-br ${classInfo.color}`}>
          <CardHeader className="text-white">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-3xl mb-2">{classInfo.title}</CardTitle>
                <Badge className="bg-white/20 text-white border-white/30 text-base">
                  Percentual de Custo: {formatPercentage(diagnostic.cost_percentage)}
                </Badge>
              </div>
              <div className="text-7xl font-bold opacity-20">
                {formatPercentage(diagnostic.cost_percentage)}
              </div>
            </div>
          </CardHeader>
          <CardContent className="bg-white rounded-b-xl p-6">
            <p className="text-lg text-gray-700 leading-relaxed">
              {diagnostic.recommendation}
            </p>
          </CardContent>
        </Card>

        {/* Cards de Métricas */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-red-600" />
                </div>
                <CardTitle className="text-lg">Custo Total</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(diagnostic.total_cost)}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Salário + Comissões + Benefícios
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <CardTitle className="text-lg">Produtividade</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(diagnostic.total_productivity)}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {diagnostic.employee_role === "vendas" ? "Total de Vendas" : "Serviços + Peças"}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Target className="w-5 h-5 text-blue-600" />
                </div>
                <CardTitle className="text-lg">Meta Ideal</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">
                {formatPercentage(getThreshold())}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Threshold para {getRoleLabel(diagnostic.employee_role)}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Gráfico */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Distribuição Custo vs Produtividade</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ value }) => formatCurrency(value)}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Detalhamento de Custos */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Detalhamento de Custos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">Salário Base</span>
                <span className="font-semibold text-gray-900">{formatCurrency(diagnostic.salary_base)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">Comissão</span>
                <span className="font-semibold text-gray-900">{formatCurrency(diagnostic.commission)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">Total de Benefícios</span>
                <span className="font-semibold text-gray-900">{formatCurrency(totalBenefits)}</span>
              </div>
              <div className="h-px bg-gray-300"></div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border-2 border-green-200">
                <span className="font-semibold text-gray-900">Custo Total</span>
                <span className="font-bold text-green-700 text-lg">{formatCurrency(diagnostic.total_cost)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

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
          <Card className="mb-8 border-2 border-dashed border-green-300 bg-green-50">
            <CardContent className="p-8 text-center">
              <Sparkles className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Plano de Otimização de Produtividade com IA
              </h3>
              <p className="text-gray-600 mb-6">
                Gere um plano para melhorar a produtividade de {employee.full_name}.
              </p>
              <Button
                onClick={() => generatePlanMutation.mutate()}
                disabled={generatePlanMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
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

        {/* Insights e Ações */}
        <Card className="shadow-lg mb-8">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-t-xl">
            <div className="flex items-center gap-3">
              <Lightbulb className="w-6 h-6" />
              <CardTitle className="text-2xl">Insights e Recomendações</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {diagnostic.classification === "ideal" && (
              <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                <h3 className="font-semibold text-green-900 mb-2">🎯 Continue Assim!</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>• Mantenha o monitoramento mensal da produtividade</li>
                  <li>• Use este colaborador como referência para a equipe</li>
                  <li>• Considere recompensas para incentivar o alto desempenho</li>
                </ul>
              </div>
            )}

            {diagnostic.classification === "limite" && (
              <div className="p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Atenção Necessária</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>• Monitore semanalmente os indicadores</li>
                  <li>• Estabeleça metas claras de crescimento</li>
                  <li>• Verifique se há gargalos operacionais</li>
                </ul>
              </div>
            )}

            {diagnostic.classification === "aceitavel" && (
              <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                <h3 className="font-semibold text-blue-900 mb-2">✅ Dentro do Esperado</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>• Continue investindo no desenvolvimento da equipe</li>
                  <li>• Monitore a produtividade do time sob gestão</li>
                  <li>• Busque formas de aumentar eficiência operacional</li>
                </ul>
              </div>
            )}

            {diagnostic.classification === "acima_aceitavel" && (
              <div className="p-4 bg-red-50 rounded-lg border-l-4 border-red-500">
                <h3 className="font-semibold text-red-900 mb-2">🚨 Ação Urgente Necessária</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>• Revisar metas e processos de trabalho imediatamente</li>
                  <li>• Verificar se há desperdício de materiais ou tempo</li>
                  <li>• Considerar treinamento adicional ou readequação</li>
                  <li>• Avaliar se a estrutura de comissionamento está adequada</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

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
            onClick={() => navigate(createPageUrl("DiagnosticoProducao"))}
            className="px-8 bg-green-600 hover:bg-green-700"
          >
            Analisar Outro Colaborador
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}