import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Home, RotateCcw, CheckCircle2, AlertTriangle, XCircle, Star, TrendingUp, DollarSign, Sparkles } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatCurrency } from "@/components/utils/formatters";
import ActionPlanCard from "../components/diagnostics/ActionPlanCard";
import ActionPlanDetails from "../components/diagnostics/ActionPlanDetails";
import ActionPlanFeedbackModal from "../components/diagnostics/ActionPlanFeedbackModal";

export default function ResultadoOS() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [diagnostic, setDiagnostic] = useState(null);
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

      const diagnostics = await base44.entities.ServiceOrderDiagnostic.list();
      const currentDiagnostic = diagnostics.find(d => d.id === diagnosticId);

      if (!currentDiagnostic) {
        toast.error("Diagnóstico não encontrado");
        navigate(createPageUrl("Home"));
        return;
      }

      setDiagnostic(currentDiagnostic);
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

  if (!diagnostic) return null;

  const { data: actionPlan } = useQuery({
    queryKey: ['action-plan', diagnostic.id],
    queryFn: async () => {
      const plans = await base44.entities.DiagnosticActionPlan.filter({
        diagnostic_id: diagnostic.id,
        diagnostic_type: 'ServiceOrderDiagnostic'
      });
      return plans.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
    },
    enabled: !!diagnostic?.id
  });

  const generatePlanMutation = useMutation({
    mutationFn: async () => base44.functions.invoke('generateActionPlanServiceOrder', { diagnostic_id: diagnostic.id }),
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

  const classificationConfig = {
    perfeita: {
      title: "OS PERFEITA",
      color: "from-green-500 to-emerald-600",
      icon: Star,
      description: "Alta rentabilidade e precificação ideal"
    },
    aprovada: {
      title: "APROVADA",
      color: "from-blue-500 to-blue-600",
      icon: CheckCircle2,
      description: "Dentro dos parâmetros aceitáveis"
    },
    alerta_renda: {
      title: "ALERTA - Renda Baixa",
      color: "from-yellow-500 to-amber-600",
      icon: AlertTriangle,
      description: "Renda abaixo de 70% - Ajustes recomendados"
    },
    alerta_investimento: {
      title: "ALERTA - Investimento Alto",
      color: "from-orange-500 to-orange-600",
      icon: AlertTriangle,
      description: "Investimento acima de 30% - Revisar custos"
    },
    reprovada: {
      title: "REPROVADA",
      color: "from-red-500 to-red-600",
      icon: XCircle,
      description: "Não enviar ao cliente - Ajustar precificação"
    }
  };

  const config = classificationConfig[diagnostic.classification] || classificationConfig.aprovada;
  const Icon = config.icon;

  // Dados para gráfico R70/I30
  const r70i30Data = [
    { name: "Renda (R70)", value: diagnostic.revenue_percentage, color: "#22c55e" },
    { name: "Investimento (I30)", value: diagnostic.investment_percentage, color: "#3b82f6" }
  ];

  // Dados para gráfico de comparação TCMP²
  const tcmp2Data = [
    { name: "Valor Cobrado", value: diagnostic.total_services },
    { name: "Valor Ideal TCMP²", value: diagnostic.tcmp2_ideal_value }
  ];

  // Calcular investimento total para exibição
  const totalInvestment = (diagnostic.total_parts_cost || 0) + (diagnostic.total_third_party_costs || 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Resultado - OS {diagnostic.os_number}
          </h1>
          <p className="text-xl text-gray-600">
            Diagnóstico R70/I30 + TCMP²
          </p>
        </div>

        {/* Classificação */}
        <Card className={`border-2 shadow-xl bg-gradient-to-br ${config.color}`}>
          <CardContent className="p-8 text-white">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <Icon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold">{config.title}</h2>
                <p className="text-white/90 text-lg">{config.description}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Métricas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Valor Total OS</span>
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(diagnostic.total_os)}
              </p>
              <div className="mt-2 text-xs text-gray-500">
                Peças: {formatCurrency(diagnostic.total_parts_sale)} | 
                Serviços: {formatCurrency(diagnostic.total_services)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Renda (R70)</span>
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <p className={`text-3xl font-bold ${diagnostic.revenue_percentage >= 70 ? 'text-green-600' : 'text-red-600'}`}>
                {diagnostic.revenue_percentage?.toFixed(1)}%
              </p>
              <div className="mt-2 text-xs text-gray-500">
                Meta: ≥ 70% | Mão de obra: {formatCurrency(diagnostic.total_services)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Investimento (I30)</span>
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <p className={`text-3xl font-bold ${diagnostic.investment_percentage <= 30 ? 'text-green-600' : 'text-red-600'}`}>
                {diagnostic.investment_percentage?.toFixed(1)}%
              </p>
              <div className="mt-2 text-xs text-gray-500">
                Meta: ≤ 30% | Custos: {formatCurrency(totalInvestment)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Gráfico R70/I30 */}
          <Card>
            <CardHeader>
              <CardTitle>Análise R70/I30</CardTitle>
              <CardDescription>Distribuição entre renda e investimento (Peças + Terceiros)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={r70i30Data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value?.toFixed(1)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {r70i30Data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value?.toFixed(1)}%`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Gráfico TCMP² */}
          <Card>
            <CardHeader>
              <CardTitle>Análise TCMP²</CardTitle>
              <CardDescription>Comparação entre valor cobrado e ideal</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={tcmp2Data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="value" fill={diagnostic.tcmp2_difference >= -1 ? "#22c55e" : "#ef4444"} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 text-center">
                <p className={`text-lg font-semibold ${diagnostic.tcmp2_difference >= -1 ? 'text-green-600' : 'text-red-600'}`}>
                  Diferença: {diagnostic.tcmp2_difference >= 0 ? '+' : ''}{formatCurrency(diagnostic.tcmp2_difference)}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Valor Hora Ideal: {formatCurrency(diagnostic.ideal_hour_value)} | 
                  Atual: {formatCurrency(diagnostic.current_hour_value)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detalhamento de Peças */}
        {diagnostic.parts?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Detalhamento de Peças</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-2">Peça</th>
                      <th className="text-right p-2">Total Venda</th>
                      <th className="text-right p-2">Total Custo</th>
                      <th className="text-right p-2">Margem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diagnostic.parts.map((part, index) => {
                      const margin = part.sale_value > 0 
                        ? ((part.sale_value - part.cost_value) / part.sale_value) * 100 
                        : 0;
                      
                      return (
                        <tr key={index} className="border-t">
                          <td className="p-2">
                            {part.name}
                            {part.is_commodity && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Commodity</span>}
                          </td>
                          <td className="text-right p-2 font-semibold">{formatCurrency(part.sale_value)}</td>
                          <td className="text-right p-2">{formatCurrency(part.cost_value)}</td>
                          <td className={`text-right p-2 font-semibold ${margin >= 50 ? 'text-green-600' : margin >= 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {margin.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detalhamento de Serviços */}
        {diagnostic.services?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Detalhamento de Serviços</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {diagnostic.services.map((service, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4 border">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{service.name}</h4>
                      <span className="text-lg font-bold text-green-600">{formatCurrency(service.charged_value)}</span>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      Tempo calculado: {service.estimated_time?.toFixed(2)}h | 
                      TCMP² (×2): {(service.estimated_time * 2).toFixed(2)}h
                    </div>
                    {service.description_steps && (
                      <div className="text-sm text-gray-700 bg-white rounded p-2 border-l-4 border-blue-500">
                        <strong>Passos:</strong> {service.description_steps}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detalhamento de Serviços Terceiros */}
        {diagnostic.third_party_services?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Serviços de Terceiros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-2">Serviço</th>
                      <th className="text-right p-2">Custo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diagnostic.third_party_services.map((service, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-2">{service.name}</td>
                        <td className="text-right p-2 font-semibold">{formatCurrency(service.cost)}</td>
                      </tr>
                    ))}
                    <tr className="border-t bg-gray-50 font-bold">
                      <td className="p-2">Total</td>
                      <td className="text-right p-2">{formatCurrency(diagnostic.total_third_party_costs)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recomendações */}
        {diagnostic.recommendations?.length > 0 && (
          <Card className="border-2 border-purple-200">
            <CardHeader>
              <CardTitle className="text-purple-900">Recomendações e Pontos de Melhoria</CardTitle>
              <CardDescription>Ações sugeridas para otimizar a rentabilidade</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {diagnostic.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-3 bg-purple-50 rounded-lg p-3 border border-purple-200">
                    <CheckCircle2 className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span className="text-purple-900">{rec}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

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
          <Card className="mb-6 border-2 border-dashed border-green-300 bg-green-50">
            <CardContent className="p-8 text-center">
              <Sparkles className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Plano de Otimização de OS com IA
              </h3>
              <p className="text-gray-600 mb-6">
                Gere um plano para melhorar precificação e processos da OS.
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
            onClick={() => navigate(createPageUrl("DiagnosticoOS"))}
            className="px-8 bg-green-600 hover:bg-green-700"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Nova Análise de OS
          </Button>
        </div>
      </div>
    </div>
  );
}