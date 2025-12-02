import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Calculator, ArrowRight, Save, History } from "lucide-react";
import { toast } from "sonner";

export default function DiagnosticoCarga() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workshop, setWorkshop] = useState(null);
  const [employees, setEmployees] = useState([]);
  
  const [period, setPeriod] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const [workloadData, setWorkloadData] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      const workshops = await base44.entities.Workshop.filter({ owner_id: user.id });
      const userWorkshop = workshops[0];
      setWorkshop(userWorkshop);

      if (userWorkshop) {
        const activeEmployees = await base44.entities.Employee.filter({ 
          workshop_id: userWorkshop.id, 
          status: "ativo" 
        });
        setEmployees(activeEmployees);
        
        // Initialize workload data
        const initialData = activeEmployees.map(emp => ({
          employee_id: emp.id,
          position_title: emp.position,
          weekly_hours_worked: 44, // Default
          ideal_weekly_hours: 44
        }));
        setWorkloadData(initialData);
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const updateWorkload = (index, field, value) => {
    const newData = [...workloadData];
    newData[index][field] = parseFloat(value) || 0;
    setWorkloadData(newData);
  };

  const calculateResults = () => {
    const overloaded = [];
    const underutilized = [];
    const suggestions = [];
    let totalEmployees = workloadData.length;
    let balancedCount = 0;

    workloadData.forEach(data => {
      const utilization = (data.weekly_hours_worked / data.ideal_weekly_hours) * 100;
      
      if (utilization > 110) {
        overloaded.push({
          employee_id: data.employee_id,
          overload_percentage: utilization - 100,
          recommendation: "Redistribuir tarefas urgentes ou contratar assistente."
        });
      } else if (utilization < 70) {
        underutilized.push({
          employee_id: data.employee_id,
          utilization_percentage: utilization,
          recommendation: "Atribuir novas responsabilidades ou projetos de melhoria."
        });
      } else {
        balancedCount++;
      }
    });

    // Simple suggestion logic
    if (overloaded.length > 0 && underutilized.length > 0) {
      overloaded.forEach(over => {
        const helper = underutilized[0]; // Just pick first available for simplicity
        suggestions.push({
          from_employee_id: over.employee_id,
          to_employee_id: helper.employee_id,
          justification: "Equilibrar carga excessiva com capacidade ociosa.",
          tasks_to_transfer: ["Tarefas operacionais de rotina", "Organização e documentação"]
        });
      });
    }

    let overall_health = "critico";
    const balancedPercentage = (balancedCount / totalEmployees) * 100;
    
    if (balancedPercentage >= 80) overall_health = "excelente";
    else if (balancedPercentage >= 60) overall_health = "bom";
    else if (balancedPercentage >= 40) overall_health = "atencao";

    return {
      overloaded_employees: overloaded,
      underutilized_employees: underutilized,
      redistribution_suggestions: suggestions,
      overall_health
    };
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const analysis = calculateResults();
      
      const diagnostic = await base44.entities.WorkloadDiagnostic.create({
        workshop_id: workshop.id,
        period_start: period.start,
        period_end: period.end,
        workload_data: workloadData,
        overall_health: analysis.overall_health,
        analysis_results: {
          overloaded_employees: analysis.overloaded_employees,
          underutilized_employees: analysis.underutilized_employees,
          redistribution_suggestions: analysis.redistribution_suggestions
        }
      });

      toast.success("Diagnóstico salvo com sucesso!");
      navigate(createPageUrl("ResultadoCarga") + `?id=${diagnostic.id}`);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar diagnóstico");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Diagnóstico de Carga de Trabalho</h1>
            <p className="text-gray-600">Avalie a distribuição de tarefas da sua equipe</p>
          </div>
          <Button variant="outline" onClick={() => navigate(createPageUrl("Historico"))}>
            <History className="w-4 h-4 mr-2" />
            Histórico
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Período de Análise</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Início</Label>
                <Input 
                  type="date" 
                  value={period.start} 
                  onChange={(e) => setPeriod({...period, start: e.target.value})} 
                />
              </div>
              <div>
                <Label>Fim</Label>
                <Input 
                  type="date" 
                  value={period.end} 
                  onChange={(e) => setPeriod({...period, end: e.target.value})} 
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Carga Horária Semanal</CardTitle>
            <CardDescription>Informe as horas trabalhadas e ideais para cada colaborador</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {employees.map((employee, index) => (
              <div key={employee.id} className="grid grid-cols-12 gap-4 items-center p-4 bg-white border rounded-lg shadow-sm">
                <div className="col-span-4">
                  <p className="font-medium text-gray-900">{employee.full_name}</p>
                  <p className="text-xs text-gray-500">{employee.position}</p>
                </div>
                <div className="col-span-4">
                  <Label className="text-xs">Horas Trabalhadas/Semana</Label>
                  <Input 
                    type="number" 
                    value={workloadData[index]?.weekly_hours_worked} 
                    onChange={(e) => updateWorkload(index, 'weekly_hours_worked', e.target.value)}
                  />
                </div>
                <div className="col-span-4">
                  <Label className="text-xs">Capacidade Ideal/Semana</Label>
                  <Input 
                    type="number" 
                    value={workloadData[index]?.ideal_weekly_hours} 
                    onChange={(e) => updateWorkload(index, 'ideal_weekly_hours', e.target.value)}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end mt-6">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-orange-600 hover:bg-orange-700 px-8"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando...</>
            ) : (
              <><Save className="w-4 h-4 mr-2" /> Gerar Diagnóstico</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}