import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Home, RotateCcw, AlertTriangle, TrendingUp, Users, ArrowRightLeft, CheckCircle, Sparkles } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import ActionPlanCard from "../components/diagnostics/ActionPlanCard";
import ActionPlanDetails from "../components/diagnostics/ActionPlanDetails";
import ActionPlanFeedbackModal from "../components/diagnostics/ActionPlanFeedbackModal";
import OrgChartCarga from "../components/diagnostics/OrgChartCarga";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function ResultadoCarga() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [diagnostic, setDiagnostic] = useState(null);
  const [employees, setEmployees] = useState([]);
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
        toast.error("ID do diagnóstico não encontrado");
        navigate(createPageUrl("Home"));
        return;
      }

      const diagnostics = await base44.entities.WorkloadDiagnostic.list();
      const foundDiagnostic = diagnostics.find(d => d.id === diagnosticId);

      if (!foundDiagnostic) {
        toast.error("Diagnóstico não encontrado");
        navigate(createPageUrl("Home"));
        return;
      }

      setDiagnostic(foundDiagnostic);

      const allEmployees = await base44.entities.Employee.list();
      setEmployees(allEmployees);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar resultado");
    } finally {
      setLoading(false);
    }
  };

  const { data: actionPlan } = useQuery({
    queryKey: ['action-plan', diagnostic?.id],
    queryFn: async () => {
      if (!diagnostic?.id) return null;
      const plans = await base44.entities.DiagnosticActionPlan.filter({
        diagnostic_id: diagnostic.id,
        diagnostic_type: 'WorkloadDiagnostic'
      });
      return plans?.length > 0 ? plans.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0] : null;
    },
    enabled: !!diagnostic?.id
  });

  const generatePlanMutation = useMutation({
    mutationFn: async () => {
      if (!diagnostic?.id) throw new Error('Diagnóstico não encontrado');
      return base44.functions.invoke('generateActionPlanWorkload', { diagnostic_id: diagnostic.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['action-plan', diagnostic?.id]);
      toast.success('Plano gerado!');
    }
  });

  const refinePlanMutation = useMutation({
    mutationFn: async ({ feedback }) => {
      if (!actionPlan?.id) throw new Error('Plano não encontrado');
      return base44.functions.invoke('refineActionPlan', {
        plan_id: actionPlan.id,
        feedback_content: feedback.content,
        feedback_type: feedback.type,
        audio_url: feedback.audio_url
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['action-plan', diagnostic?.id]);
      setShowFeedbackModal(false);
      toast.success('Plano refinado!');
    }
  });

  const updateActivityMutation = useMutation({
    mutationFn: async ({ activityIndex, status }) => {
      if (!actionPlan?.id || !actionPlan?.plan_data?.implementation_schedule) {
        throw new Error('Plano não encontrado');
      }
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
      queryClient.invalidateQueries(['action-plan', diagnostic?.id]);
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

  if (!diagnostic) return null;

  const healthConfig = {
    excelente: {
      title: "Excelente",
      color: "from-green-500 to-emerald-600",
      icon: CheckCircle,
      description: "Distribuição de carga equilibrada"
    },
    bom: {
      title: "Bom",
      color: "from-blue-500 to-blue-600",
      icon: TrendingUp,
      description: "Pequenos ajustes recomendados"
    },
    atencao: {
      title: "Atenção",
      color: "from-yellow-500 to-amber-600",
      icon: AlertTriangle,
      description: "Requer redistribuição de tarefas"
    },
    critico: {
      title: "Crítico",
      color: "from-red-500 to-red-600",
      icon: AlertTriangle,
      description: "Ação imediata necessária"
    }
  };

  const currentHealth = healthConfig[diagnostic.overall_health] || healthConfig.atencao;
  const HealthIcon = currentHealth.icon;

  // Cálculos do Resumo Executivo
  const workloadList = diagnostic?.workload_data || [];
  const totalEmployees = workloadList.length;
  
  let ociosoCount = 0;
  let normalCount = 0;
  let sobrecarregadoCount = 0;
  let criticoCount = 0;
  let mostOverloaded = null;
  let maxSaturation = -1;

  workloadList.forEach(emp => {
    const saturation = emp.ideal_weekly_hours > 0 ? (emp.weekly_hours_worked / emp.ideal_weekly_hours) * 100 : 0;
    
    if (saturation < 70) ociosoCount++;
    else if (saturation <= 90) normalCount++;
    else if (saturation <= 110) sobrecarregadoCount++;
    else criticoCount++;

    if (saturation > maxSaturation) {
      maxSaturation = saturation;
      mostOverloaded = { ...emp, saturation };
    }
  });

  const sortedGargalos = [...workloadList].sort((a, b) => {
    const satA = a.ideal_weekly_hours > 0 ? (a.weekly_hours_worked / a.ideal_weekly_hours) : 0;
    const satB = b.ideal_weekly_hours > 0 ? (b.weekly_hours_worked / b.ideal_weekly_hours) : 0;
    return satB - satA;
  });

  // Preparar dados para o gráfico
  const chartData = workloadList.map(emp => {
    const employee = employees.find(e => e?.id === emp?.employee_id);
    const utilization = emp?.ideal_weekly_hours > 0 ? (emp.weekly_hours_worked / emp.ideal_weekly_hours) * 100 : 0;
    
    return {
      name: employee?.full_name || emp?.position_title || "Colaborador",
      utilizacao: utilization,
      ideal: 100,
      horas: emp?.weekly_hours_worked || 0
    };
  });

  const getEmployeeName = (employeeId) => {
    if (!employeeId) return "Colaborador";
    const employee = employees.find(e => e?.id === employeeId);
    return employee?.full_name || "Colaborador";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Resultado do Diagnóstico de Carga
          </h1>
          <p className="text-xl text-gray-600">
            Período: {new Date(diagnostic.period_start).toLocaleDateString()} - {new Date(diagnostic.period_end).toLocaleDateString()}
          </p>
        </div>

        {/* Saúde Geral */}
        <Card className={`border-2 shadow-xl bg-gradient-to-br ${currentHealth.color}`}>
          <CardContent className="p-8 text-white">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <HealthIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold">{currentHealth.title}</h2>
                <p className="text-white/90 text-lg">{currentHealth.description}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs de Visões */}
        <Tabs defaultValue="resumo" className="w-full">
          <TabsList className="grid w-full grid-cols-1 md:grid-cols-4 mb-6 shadow-sm border border-slate-200 h-auto">
            <TabsTrigger value="resumo" className="data-[state=active]:bg-orange-100 data-[state=active]:text-orange-900 py-2">Resumo Executivo</TabsTrigger>
            <TabsTrigger value="grafico" className="data-[state=active]:bg-orange-100 data-[state=active]:text-orange-900 py-2">Visão Gráfica</TabsTrigger>
            <TabsTrigger value="organograma" className="data-[state=active]:bg-orange-100 data-[state=active]:text-orange-900 py-2">Organograma</TabsTrigger>
            <TabsTrigger value="gargalos" className="data-[state=active]:bg-orange-100 data-[state=active]:text-orange-900 py-2">Tabela de Gargalos</TabsTrigger>
          </TabsList>
          
          <TabsContent value="resumo" className="space-y-6 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500">Equipe Analisada</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{totalEmployees}</div>
                  <p className="text-xs text-slate-500 mt-1">colaboradores</p>
                </CardContent>
              </Card>
              <Card className="border-b-4 border-b-blue-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500">Subutilizados (&lt;70%)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">{ociosoCount}</div>
                  <p className="text-xs text-slate-500 mt-1">{totalEmployees ? ((ociosoCount / totalEmployees) * 100).toFixed(0) : 0}% da equipe</p>
                </CardContent>
              </Card>
              <Card className="border-b-4 border-b-green-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500">Normal (70-110%)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">{normalCount}</div>
                  <p className="text-xs text-slate-500 mt-1">{totalEmployees ? ((normalCount / totalEmployees) * 100).toFixed(0) : 0}% da equipe</p>
                </CardContent>
              </Card>
              <Card className="border-b-4 border-b-red-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500">Crítico (&gt;110%)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600">{sobrecarregadoCount + criticoCount}</div>
                  <p className="text-xs text-slate-500 mt-1">{totalEmployees ? (((sobrecarregadoCount + criticoCount) / totalEmployees) * 100).toFixed(0) : 0}% da equipe</p>
                </CardContent>
              </Card>
            </div>
            
            {mostOverloaded && (
              <Card className="bg-red-50 border-red-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                    <div>
                      <h3 className="font-bold text-red-900 text-lg">Ponto Mais Crítico</h3>
                      <p className="text-red-700">
                        <strong>{getEmployeeName(mostOverloaded.employee_id)}</strong> está com a maior carga de trabalho ({mostOverloaded.saturation.toFixed(0)}% de saturação). Ação prioritária recomendada.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="grafico">
            <Card>
              <CardHeader>
                <CardTitle>Taxa de Utilização por Colaborador</CardTitle>
                <CardDescription>Comparação entre horas trabalhadas e capacidade ideal</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis label={{ value: 'Utilização (%)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name === "utilizacao") return [`${value.toFixed(1)}%`, "Utilização"];
                        if (name === "ideal") return [`${value}%`, "Ideal"];
                        return [value, name];
                      }}
                    />
                    <Legend />
                    <Bar dataKey="ideal" fill="#94a3b8" name="Capacidade Ideal (100%)" />
                    <Bar dataKey="utilizacao" name="Utilização Atual">
                      {chartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`}
                          fill={entry.utilizacao > 110 ? "#ef4444" : entry.utilizacao < 70 ? "#3b82f6" : "#22c55e"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                <div className="flex flex-wrap gap-4 mt-4 justify-center">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded" />
                    <span className="text-sm">Equilibrado (70-110%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-500 rounded" />
                    <span className="text-sm">Sobrecarregado (&gt;110%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-500 rounded" />
                    <span className="text-sm">Subutilizado (&lt;70%)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="organograma">
            <Card>
              <CardHeader>
                <CardTitle>Organograma de Saturação</CardTitle>
                <CardDescription>Visão hierárquica baseada nas informações do cadastro da oficina</CardDescription>
              </CardHeader>
              <CardContent>
                <OrgChartCarga employees={employees} diagnosticData={diagnostic} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gargalos">
            <Card>
              <CardHeader>
                <CardTitle>Tabela de Gargalos e Saturação</CardTitle>
                <CardDescription>Lista de todos os colaboradores ordenada pelos mais sobrecarregados</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Colaborador</TableHead>
                        <TableHead>Saturação</TableHead>
                        <TableHead>Horas (Trab/Ideal)</TableHead>
                        <TableHead>OS/Semana</TableHead>
                        <TableHead>Percepção</TableHead>
                        <TableHead className="w-[300px]">Gargalos Relatados</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedGargalos.map((emp, idx) => {
                        const saturation = emp.ideal_weekly_hours > 0 ? (emp.weekly_hours_worked / emp.ideal_weekly_hours) * 100 : 0;
                        return (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{getEmployeeName(emp.employee_id)}</TableCell>
                            <TableCell>
                              <span className={`font-bold px-2 py-1 rounded-full text-xs ${saturation > 110 ? 'bg-red-100 text-red-700' : saturation < 70 ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                {saturation.toFixed(0)}%
                              </span>
                            </TableCell>
                            <TableCell>{emp.weekly_hours_worked} / {emp.ideal_weekly_hours}</TableCell>
                            <TableCell>{emp.os_per_week || '-'}</TableCell>
                            <TableCell>{emp.subjective_load ? `${emp.subjective_load}/5` : '-'}</TableCell>
                            <TableCell className="text-xs text-slate-600">
                              {emp.bottlenecks || <span className="italic opacity-50">Não informado</span>}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Colaboradores Sobrecarregados */}
        {diagnostic.analysis_results?.overloaded_employees?.length > 0 && (
          <Card className="border-2 border-red-200">
            <CardHeader>
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                <div>
                  <CardTitle className="text-red-900">Colaboradores Sobrecarregados</CardTitle>
                  <CardDescription>Identificados {diagnostic.analysis_results.overloaded_employees.length} casos</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {diagnostic.analysis_results.overloaded_employees.map((emp, index) => (
                <div key={index} className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-red-900">
                      {getEmployeeName(emp.employee_id)}
                    </h3>
                    <span className="text-red-700 font-bold">
                      +{emp.overload_percentage.toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-sm text-red-800">{emp.recommendation}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Colaboradores Subutilizados */}
        {diagnostic.analysis_results?.underutilized_employees?.length > 0 && (
          <Card className="border-2 border-blue-200">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-blue-600" />
                <div>
                  <CardTitle className="text-blue-900">Colaboradores Subutilizados</CardTitle>
                  <CardDescription>Identificados {diagnostic.analysis_results.underutilized_employees.length} casos</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {diagnostic.analysis_results.underutilized_employees.map((emp, index) => (
                <div key={index} className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-blue-900">
                      {getEmployeeName(emp.employee_id)}
                    </h3>
                    <span className="text-blue-700 font-bold">
                      {emp.utilization_percentage.toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-sm text-blue-800">{emp.recommendation}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Sugestões de Redistribuição */}
        {diagnostic.analysis_results?.redistribution_suggestions?.length > 0 && (
          <Card className="border-2 border-purple-200">
            <CardHeader>
              <div className="flex items-center gap-3">
                <ArrowRightLeft className="w-6 h-6 text-purple-600" />
                <div>
                  <CardTitle className="text-purple-900">Sugestões de Redistribuição</CardTitle>
                  <CardDescription>Propostas para equilibrar a carga de trabalho</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {diagnostic.analysis_results.redistribution_suggestions.map((suggestion, index) => (
                <div key={index} className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="font-semibold text-purple-900">
                      {getEmployeeName(suggestion.from_employee_id)}
                    </div>
                    <ArrowRightLeft className="w-4 h-4 text-purple-600" />
                    <div className="font-semibold text-purple-900">
                      {getEmployeeName(suggestion.to_employee_id)}
                    </div>
                  </div>
                  <p className="text-sm text-purple-800 mb-2">{suggestion.justification}</p>
                  {suggestion.tasks_to_transfer?.length > 0 && (
                    <ul className="text-sm text-purple-700 ml-4 list-disc">
                      {suggestion.tasks_to_transfer.map((task, i) => (
                        <li key={i}>{task}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
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
          <Card className="mb-6 border-2 border-dashed border-orange-300 bg-orange-50">
            <CardContent className="p-8 text-center">
              <Sparkles className="w-12 h-12 text-orange-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Plano de Otimização de Carga com IA
              </h3>
              <p className="text-gray-600 mb-6">
                Gere um plano para equilibrar a distribuição de trabalho na equipe.
              </p>
              <Button
                onClick={() => generatePlanMutation.mutate()}
                disabled={generatePlanMutation.isPending}
                className="bg-orange-600 hover:bg-orange-700"
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
            onClick={() => navigate(createPageUrl("DiagnosticoCarga"))}
            className="px-8 bg-orange-600 hover:bg-orange-700"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Novo Diagnóstico
          </Button>
        </div>
      </div>
    </div>
  );
}