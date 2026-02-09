import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, Users, DollarSign, Target, ArrowLeft, Calendar, Sparkles } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import ActionPlanCard from '../../components/diagnostics/ActionPlanCard';
import ActionPlanDetails from '../../components/diagnostics/ActionPlanDetails';
import ActionPlanFeedbackModal from '../../components/diagnostics/ActionPlanFeedbackModal';

export default function PainelMetas() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [breakdown, setBreakdown] = useState(null);
  const [managementDiagnostic, setManagementDiagnostic] = useState(null);
  const [showActionPlanDetails, setShowActionPlanDetails] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const breakdownId = urlParams.get("id");

      if (!breakdownId) {
        toast.error("Desdobramento não encontrado");
        navigate(createPageUrl("Home"));
        return;
      }

      const breakdowns = await base44.entities.GoalBreakdown.list();
      const current = breakdowns.find(b => b.id === breakdownId);

      if (!current) {
        toast.error("Desdobramento não encontrado");
        navigate(createPageUrl("Home"));
        return;
      }

      setBreakdown(current);

      // Buscar ManagementDiagnostic associado
      const diagnostics = await base44.entities.ManagementDiagnostic.filter({
        goal_breakdown_id: breakdownId
      });
      if (diagnostics && diagnostics.length > 0) {
        setManagementDiagnostic(diagnostics[0]);
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const { data: actionPlan } = useQuery({
    queryKey: ['action-plan', managementDiagnostic?.id],
    queryFn: async () => {
      const plans = await base44.entities.DiagnosticActionPlan.filter({
        diagnostic_id: managementDiagnostic.id,
        diagnostic_type: 'ManagementDiagnostic'
      });
      return plans.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
    },
    enabled: !!managementDiagnostic?.id
  });

  const generatePlanMutation = useMutation({
    mutationFn: async () => base44.functions.invoke('generateActionPlanManagement', { diagnostic_id: managementDiagnostic.id }),
    onSuccess: () => {
      queryClient.invalidateQueries(['action-plan', managementDiagnostic.id]);
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
      queryClient.invalidateQueries(['action-plan', managementDiagnostic.id]);
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
      queryClient.invalidateQueries(['action-plan', managementDiagnostic.id]);
      toast.success('Atividade atualizada!');
    }
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!breakdown) return null;

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const areaData = [
    {
      area: "Vendas",
      melhor: breakdown.areas?.vendas?.best_revenue || 0,
      meta: breakdown.areas?.vendas?.best_revenue * (1 + breakdown.growth_percentage / 100) || 0,
      clientes: breakdown.areas?.vendas?.best_clients || 0
    },
    {
      area: "Comercial",
      melhor: breakdown.areas?.comercial?.best_revenue || 0,
      meta: breakdown.areas?.comercial?.best_revenue * (1 + breakdown.growth_percentage / 100) || 0,
      clientes: breakdown.areas?.comercial?.best_clients || 0
    },
    {
      area: "Técnico",
      melhor: breakdown.areas?.tecnico?.best_revenue || 0,
      meta: breakdown.areas?.tecnico?.best_revenue * (1 + breakdown.growth_percentage / 100) || 0,
      clientes: breakdown.areas?.tecnico?.best_clients || 0
    }
  ];

  const pieData = areaData.map(d => ({
    name: d.area,
    value: d.melhor
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Painel de Metas</h1>
            </div>
            <p className="text-gray-600 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Referência: {new Date(breakdown.best_month_date + '-02').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate(createPageUrl("DiagnosticoGerencial"))}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>

        {/* KPIs Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-2 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-700">Melhor Mês</h3>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(breakdown.best_month_revenue)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Target className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-700">Meta de Receita</h3>
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(breakdown.target_revenue)}
              </p>
              <Badge className="mt-1 bg-blue-100 text-blue-800">
                +{breakdown.growth_percentage}%
              </Badge>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-700">Clientes (Melhor)</h3>
              </div>
              <p className="text-2xl font-bold text-purple-600">
                {breakdown.best_month_clients}
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                </div>
                <h3 className="font-semibold text-gray-700">Meta de Clientes</h3>
              </div>
              <p className="text-2xl font-bold text-orange-600">
                {breakdown.target_clients}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {breakdown.target_daily_clients?.toFixed(1)} por dia
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Comparativo: Melhor Mês vs Meta</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={areaData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="area" />
                  <YAxis />
                  <Tooltip formatter={(val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)} />
                  <Legend />
                  <Bar dataKey="melhor" fill="#10b981" name="Melhor Mês" />
                  <Bar dataKey="meta" fill="#3b82f6" name="Meta" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Área (Melhor Mês)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Detalhamento por Área */}
        {['vendas', 'comercial', 'tecnico'].map((areaKey) => {
          const area = breakdown.areas?.[areaKey];
          if (!area || !area.employees || area.employees.length === 0) return null;

          const areaLabel = areaKey === 'vendas' ? 'Vendas' : areaKey === 'comercial' ? 'Comercial' : 'Técnico';

          return (
            <Card key={areaKey}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{areaLabel}</span>
                  <Badge className="bg-blue-600 text-white">
                    Meta: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(area.best_revenue * (1 + breakdown.growth_percentage / 100))}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left p-3 font-semibold text-gray-700">Colaborador</th>
                        <th className="text-right p-3 font-semibold text-gray-700">Melhor Mês</th>
                        <th className="text-right p-3 font-semibold text-gray-700">Meta</th>
                        <th className="text-center p-3 font-semibold text-gray-700">% Presença</th>
                        <th className="text-right p-3 font-semibold text-gray-700">Clientes (Melhor)</th>
                        <th className="text-right p-3 font-semibold text-gray-700">Clientes (Meta)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {area.employees.map((emp, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="p-3">{emp.employee_name}</td>
                          <td className="text-right p-3 font-medium text-green-600">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(emp.best_revenue)}
                          </td>
                          <td className="text-right p-3 font-medium text-blue-600">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(emp.target_revenue)}
                          </td>
                          <td className="text-center p-3">
                            <Badge variant="outline">{emp.percentage?.toFixed(1)}%</Badge>
                          </td>
                          <td className="text-right p-3">{emp.best_clients}</td>
                          <td className="text-right p-3 font-medium">{emp.target_clients}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Plano Personalizado com IA */}
        {managementDiagnostic && (
          <>
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
              <Card className="mb-6 border-2 border-dashed border-blue-300 bg-blue-50">
                <CardContent className="p-8 text-center">
                  <Sparkles className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Plano de Melhoria Gerencial com IA
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Gere um plano estratégico para otimizar a gestão e alcançar suas metas.
                  </p>
                  <Button
                    onClick={() => generatePlanMutation.mutate()}
                    disabled={generatePlanMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
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
          </>
        )}
      </div>
    </div>
  );
}
