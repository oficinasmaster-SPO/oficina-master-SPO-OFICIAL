import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import TrackingWrapper from "@/components/shared/TrackingWrapper";

export default function DiagnosticoCarga() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [workshop, setWorkshop] = useState(null);
  const [user, setUser] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [workloadData, setWorkloadData] = useState({});

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      const workshops = await base44.entities.Workshop.list();
      let loadedWorkshop = workshops.find(w => w.owner_id === currentUser.id);
      if (!loadedWorkshop) {
        const empList = await base44.entities.Employee.filter({ email: currentUser.email });
        if (empList.length > 0 && empList[0].workshop_id) {
            loadedWorkshop = workshops.find(w => w.id === empList[0].workshop_id);
        }
      }
      if (!loadedWorkshop) {
        toast.error("Oficina não encontrada");
        return navigate(createPageUrl("Home"));
      }
      setWorkshop(loadedWorkshop);

      const activeEmployees = await base44.entities.Employee.filter({ workshop_id: loadedWorkshop.id, status: "ativo" });
      setEmployees(activeEmployees || []);
      
      const initialData = {};
      activeEmployees.forEach(emp => {
        initialData[emp.id] = {
          weekly_hours_worked: 44,
          ideal_weekly_hours: 44
        };
      });
      setWorkloadData(initialData);
    } catch (error) {
      base44.auth.redirectToLogin(createPageUrl("DiagnosticoCarga"));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (empId, field, value) => {
    setWorkloadData(prev => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        [field]: Number(value)
      }
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const dataArray = employees.map(emp => ({
        employee_id: emp.id,
        position_title: emp.position || "Sem cargo",
        weekly_hours_worked: workloadData[emp.id].weekly_hours_worked,
        ideal_weekly_hours: workloadData[emp.id].ideal_weekly_hours
      }));

      // Calcula overall_health baseado na média de saturação
      const saturations = dataArray.map(d => d.ideal_weekly_hours > 0 ? d.weekly_hours_worked / d.ideal_weekly_hours : 1);
      const avgSaturation = saturations.reduce((a, b) => a + b, 0) / (saturations.length || 1);
      
      let overall_health = 'bom';
      if (avgSaturation > 1.2 || avgSaturation < 0.7) overall_health = 'critico';
      else if (avgSaturation > 1.1 || avgSaturation < 0.8) overall_health = 'atencao';
      else if (avgSaturation >= 0.9 && avgSaturation <= 1.05) overall_health = 'excelente';

      const response = await base44.functions.invoke('submitAppForms', {
        form_type: 'workload_diagnostic',
        workshop_id: workshop?.id,
        evaluator_id: user?.id,
        answers: {},
        overall_health,
        average_score: avgSaturation,
        workload_data: dataArray
      });

      if (response?.data?.error) throw new Error(response.data.error);

      toast.success("Diagnóstico concluído!");
      navigate(createPageUrl("ResultadoCarga") + `?id=${response.data.id}`);
    } catch (error) {
      toast.error("Erro ao salvar diagnóstico");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <TrackingWrapper workshopId={workshop?.id} itemTipo="diagnostico" itemId="diagnostico_carga" itemNome="Diagnóstico de Carga de Trabalho" itemCategoria="diagnosticos">
      <div className="min-h-screen bg-slate-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Diagnóstico de Carga de Trabalho</h1>
              <p className="text-gray-600">Informe as horas trabalhadas vs ideais da sua equipe</p>
            </div>
            <Button variant="outline" onClick={() => navigate(createPageUrl("CentralAvaliacoes"))}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Métricas de Saturação da Equipe</CardTitle>
            </CardHeader>
            <CardContent>
              {employees.length === 0 ? (
                 <div className="text-center p-6 text-gray-500">Nenhum colaborador ativo encontrado na oficina.</div>
              ) : (
                <div className="space-y-4">
                  {employees.map(emp => {
                    const data = workloadData[emp.id] || { weekly_hours_worked: 44, ideal_weekly_hours: 44 };
                    const saturation = data.ideal_weekly_hours > 0 ? (data.weekly_hours_worked / data.ideal_weekly_hours) * 100 : 0;
                    return (
                      <div key={emp.id} className="flex flex-col md:flex-row gap-4 items-center p-4 border rounded-lg bg-white">
                        <div className="flex-1 w-full">
                          <p className="font-semibold truncate">{emp.full_name}</p>
                          <p className="text-sm text-gray-500 truncate">{emp.position}</p>
                        </div>
                        <div className="w-full md:w-32">
                          <label className="text-xs text-gray-500 mb-1 block">Horas Trabalhadas/sem.</label>
                          <Input 
                            type="number" 
                            min="0"
                            max="168"
                            value={data.weekly_hours_worked} 
                            onChange={(e) => handleInputChange(emp.id, 'weekly_hours_worked', e.target.value)} 
                          />
                        </div>
                        <div className="w-full md:w-32">
                          <label className="text-xs text-gray-500 mb-1 block">Capacidade Ideal</label>
                          <Input 
                            type="number"
                            min="1" 
                            max="168"
                            value={data.ideal_weekly_hours} 
                            onChange={(e) => handleInputChange(emp.id, 'ideal_weekly_hours', e.target.value)} 
                          />
                        </div>
                        <div className="w-full md:w-24 text-right">
                          <span className={`text-sm font-bold ${saturation > 110 ? 'text-red-600' : saturation < 80 ? 'text-blue-600' : 'text-green-600'}`}>
                            {saturation.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="mt-8 flex justify-end">
                <Button onClick={handleSubmit} disabled={isSubmitting || employees.length === 0} className="bg-orange-600 hover:bg-orange-700">
                  {isSubmitting ? <Loader2 className="animate-spin mr-2 w-4 h-4" /> : <Save className="w-4 h-4 mr-2" />}
                  Salvar e Analisar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TrackingWrapper>
  );
}