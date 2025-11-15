import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, BarChart4, Calendar, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function DiagnosticoCarga() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);
  const [workshop, setWorkshop] = useState(null);
  const [employees, setEmployees] = useState([]);
  
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [workloadData, setWorkloadData] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      const workshops = await base44.entities.Workshop.list();
      const userWorkshop = workshops.find(w => w.owner_id === currentUser.id);
      setWorkshop(userWorkshop);

      const allEmployees = await base44.entities.Employee.list();
      const activeEmployees = allEmployees.filter(e => 
        e.status === "ativo" && (!userWorkshop || e.workshop_id === userWorkshop.id)
      );
      setEmployees(activeEmployees);

      // Inicializar dados
      const initialData = activeEmployees.map(emp => ({
        employee_id: emp.id,
        employee_name: emp.full_name,
        position_title: emp.position || "",
        weekly_hours_worked: 0,
        ideal_weekly_hours: 40,
        tasks_assigned: 0,
        tasks_completed: 0,
        quality_score: 5,
        main_activities: []
      }));
      setWorkloadData(initialData);

      // Definir período padrão (última semana)
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      setPeriodStart(weekAgo.toISOString().split('T')[0]);
      setPeriodEnd(now.toISOString().split('T')[0]);
    } catch (error) {
      toast.error("Você precisa estar logado");
      base44.auth.redirectToLogin(createPageUrl("DiagnosticoCarga"));
    } finally {
      setLoading(false);
    }
  };

  const updateWorkloadData = (index, field, value) => {
    const updated = [...workloadData];
    updated[index][field] = value;
    setWorkloadData(updated);
  };

  const addActivity = (index) => {
    const updated = [...workloadData];
    if (!updated[index].main_activities) {
      updated[index].main_activities = [];
    }
    updated[index].main_activities.push("");
    setWorkloadData(updated);
  };

  const updateActivity = (empIndex, actIndex, value) => {
    const updated = [...workloadData];
    updated[empIndex].main_activities[actIndex] = value;
    setWorkloadData(updated);
  };

  const removeActivity = (empIndex, actIndex) => {
    const updated = [...workloadData];
    updated[empIndex].main_activities.splice(actIndex, 1);
    setWorkloadData(updated);
  };

  const analyzeWorkload = () => {
    const overloaded = [];
    const underutilized = [];
    const redistribution = [];

    workloadData.forEach(emp => {
      const utilization = (emp.weekly_hours_worked / emp.ideal_weekly_hours) * 100;
      const completion = emp.tasks_assigned > 0 ? (emp.tasks_completed / emp.tasks_assigned) * 100 : 100;

      if (utilization > 110) {
        overloaded.push({
          employee_id: emp.employee_id,
          overload_percentage: utilization - 100,
          recommendation: `Colaborador está ${(utilization - 100).toFixed(0)}% acima da capacidade ideal. Recomenda-se redistribuir tarefas ou adicionar suporte à equipe.`
        });
      } else if (utilization < 70 && emp.weekly_hours_worked > 0) {
        underutilized.push({
          employee_id: emp.employee_id,
          utilization_percentage: utilization,
          recommendation: `Colaborador está utilizando apenas ${utilization.toFixed(0)}% da capacidade. Considere alocar mais responsabilidades ou tarefas estratégicas.`
        });
      }
    });

    // Sugestões de redistribuição
    if (overloaded.length > 0 && underutilized.length > 0) {
      overloaded.forEach(over => {
        underutilized.forEach(under => {
          const overEmp = workloadData.find(e => e.employee_id === over.employee_id);
          const underEmp = workloadData.find(e => e.employee_id === under.employee_id);
          
          redistribution.push({
            from_employee_id: over.employee_id,
            to_employee_id: under.employee_id,
            tasks_to_transfer: [`Transferir atividades de ${overEmp.employee_name} para ${underEmp.employee_name}`],
            justification: `${overEmp.employee_name} está sobrecarregado enquanto ${underEmp.employee_name} tem capacidade disponível. Redistribuir tarefas equilibrará a carga de trabalho.`
          });
        });
      });
    }

    // Determinar saúde geral
    let overallHealth = "excelente";
    if (overloaded.length > 0) {
      overallHealth = overloaded.length > 2 ? "critico" : "atencao";
    } else if (underutilized.length > 2) {
      overallHealth = "bom";
    }

    return {
      overloaded_employees: overloaded,
      underutilized_employees: underutilized,
      redistribution_suggestions: redistribution.slice(0, 3),
      overall_health: overallHealth
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!periodStart || !periodEnd) {
      toast.error("Defina o período de avaliação");
      return;
    }

    setSubmitting(true);

    try {
      const analysisResults = analyzeWorkload();

      const diagnostic = await base44.entities.WorkloadDiagnostic.create({
        workshop_id: workshop?.id || null,
        evaluator_id: user.id,
        period_start: periodStart,
        period_end: periodEnd,
        workload_data: workloadData,
        analysis_results: analysisResults,
        overall_health: analysisResults.overall_health,
        completed: true
      });

      toast.success("Diagnóstico de carga concluído!");
      navigate(createPageUrl("ResultadoCarga") + `?id=${diagnostic.id}`);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar diagnóstico");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
            <BarChart4 className="w-8 h-8 text-orange-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Diagnóstico de Carga de Trabalho
          </h1>
          <p className="text-lg text-gray-600">
            Análise de distribuição de tarefas e identificação de sobrecarga/subutilização
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Calendar className="w-6 h-6 text-orange-600" />
                <div>
                  <CardTitle>Período de Avaliação</CardTitle>
                  <CardDescription>Defina o intervalo de tempo analisado</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Data Início *</Label>
                  <Input
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>Data Fim *</Label>
                  <Input
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {workloadData.map((emp, index) => (
            <Card key={emp.employee_id}>
              <CardHeader>
                <CardTitle className="text-lg">{emp.employee_name}</CardTitle>
                <CardDescription>{emp.position_title}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Horas Trabalhadas (Semana)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={emp.weekly_hours_worked}
                      onChange={(e) => updateWorkloadData(index, 'weekly_hours_worked', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label>Horas Ideais (Semana)</Label>
                    <Input
                      type="number"
                      value={emp.ideal_weekly_hours}
                      onChange={(e) => updateWorkloadData(index, 'ideal_weekly_hours', parseFloat(e.target.value) || 40)}
                    />
                  </div>
                  <div>
                    <Label>Nota de Qualidade (0-10)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={emp.quality_score}
                      onChange={(e) => updateWorkloadData(index, 'quality_score', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Tarefas Atribuídas</Label>
                    <Input
                      type="number"
                      value={emp.tasks_assigned}
                      onChange={(e) => updateWorkloadData(index, 'tasks_assigned', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label>Tarefas Concluídas</Label>
                    <Input
                      type="number"
                      value={emp.tasks_completed}
                      onChange={(e) => updateWorkloadData(index, 'tasks_completed', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Principais Atividades</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => addActivity(index)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {emp.main_activities?.map((activity, actIndex) => (
                      <div key={actIndex} className="flex gap-2">
                        <Input
                          placeholder="Descreva a atividade"
                          value={activity}
                          onChange={(e) => updateActivity(index, actIndex, e.target.value)}
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => removeActivity(index, actIndex)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="flex justify-center">
            <Button
              type="submit"
              disabled={submitting}
              className="bg-orange-600 hover:bg-orange-700 text-lg px-12 py-6"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <BarChart4 className="w-5 h-5 mr-2" />
                  Gerar Diagnóstico
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}