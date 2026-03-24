import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
          ideal_weekly_hours: 44,
          os_per_week: 0,
          frequent_overtime: false,
          subjective_load: "3", // 1 to 5
          bottlenecks: "",
          missing_resources: ""
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
        [field]: value
      }
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const dataArray = employees.map(emp => ({
        employee_id: emp.id,
        position_title: emp.position || "Sem cargo",
        weekly_hours_worked: Number(workloadData[emp.id].weekly_hours_worked),
        ideal_weekly_hours: Number(workloadData[emp.id].ideal_weekly_hours),
        os_per_week: Number(workloadData[emp.id].os_per_week),
        frequent_overtime: workloadData[emp.id].frequent_overtime,
        subjective_load: Number(workloadData[emp.id].subjective_load),
        bottlenecks: workloadData[emp.id].bottlenecks,
        missing_resources: workloadData[emp.id].missing_resources
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
                <div className="space-y-6">
                  {employees.map(emp => {
                    const data = workloadData[emp.id] || { 
                      weekly_hours_worked: 44, ideal_weekly_hours: 44, os_per_week: 0, 
                      frequent_overtime: false, subjective_load: "3", bottlenecks: "", missing_resources: "" 
                    };
                    const saturation = data.ideal_weekly_hours > 0 ? (data.weekly_hours_worked / data.ideal_weekly_hours) * 100 : 0;
                    
                    return (
                      <div key={emp.id} className="flex flex-col gap-4 p-5 border border-slate-200 rounded-xl bg-white shadow-sm">
                        <div className="flex flex-col md:flex-row gap-4 items-center justify-between border-b border-slate-100 pb-4">
                          <div className="flex-1 w-full">
                            <p className="font-bold text-lg text-slate-800">{emp.full_name}</p>
                            <p className="text-sm text-slate-500">{emp.position}</p>
                          </div>
                          <div className="flex gap-4 items-center">
                            <div className="w-32">
                              <label className="text-xs font-semibold text-slate-600 mb-1 block">Horas Realizadas/sem.</label>
                              <Input 
                                type="number" 
                                min="0" max="168"
                                value={data.weekly_hours_worked} 
                                onChange={(e) => handleInputChange(emp.id, 'weekly_hours_worked', e.target.value)} 
                              />
                            </div>
                            <div className="w-32">
                              <label className="text-xs font-semibold text-slate-600 mb-1 block">Capacidade Ideal</label>
                              <Input 
                                type="number"
                                min="1" max="168"
                                value={data.ideal_weekly_hours} 
                                onChange={(e) => handleInputChange(emp.id, 'ideal_weekly_hours', e.target.value)} 
                              />
                            </div>
                            <div className="w-24 text-right flex flex-col justify-center">
                              <label className="text-xs text-slate-400 mb-1 block">Saturação</label>
                              <span className={`text-lg font-black ${saturation > 110 ? 'text-red-600' : saturation < 80 ? 'text-blue-600' : 'text-green-600'}`}>
                                {saturation.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="space-y-4">
                            <div>
                              <label className="text-xs font-semibold text-slate-600 mb-1 block">Média de O.S. por semana</label>
                              <Input 
                                type="number" 
                                min="0"
                                placeholder="0"
                                value={data.os_per_week} 
                                onChange={(e) => handleInputChange(emp.id, 'os_per_week', e.target.value)} 
                              />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-slate-600 mb-1 block">Percepção de Carga</label>
                              <Select value={String(data.subjective_load)} onValueChange={(val) => handleInputChange(emp.id, 'subjective_load', val)}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">1 - Muito leve</SelectItem>
                                  <SelectItem value="2">2 - Tranquila</SelectItem>
                                  <SelectItem value="3">3 - Adequada</SelectItem>
                                  <SelectItem value="4">4 - Pesada</SelectItem>
                                  <SelectItem value="5">5 - Insuportável</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center space-x-2 pt-2">
                              <Checkbox 
                                id={`overtime-${emp.id}`} 
                                checked={data.frequent_overtime}
                                onCheckedChange={(checked) => handleInputChange(emp.id, 'frequent_overtime', checked)}
                              />
                              <Label htmlFor={`overtime-${emp.id}`} className="text-sm font-medium text-slate-700 cursor-pointer">
                                Faz hora extra frequentemente?
                              </Label>
                            </div>
                          </div>

                          <div className="md:col-span-2 space-y-4">
                            <div>
                              <label className="text-xs font-semibold text-slate-600 mb-1 block">Principais Gargalos / Obstáculos</label>
                              <Textarea 
                                placeholder="Descreva o que atrasa ou trava o trabalho..."
                                value={data.bottlenecks}
                                onChange={(e) => handleInputChange(emp.id, 'bottlenecks', e.target.value)}
                                className="resize-none h-20"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-slate-600 mb-1 block">Recursos Faltantes (Ferramentas, Pessoas, etc)</label>
                              <Textarea 
                                placeholder="Ex: Falta elevador, scanner travando..."
                                value={data.missing_resources}
                                onChange={(e) => handleInputChange(emp.id, 'missing_resources', e.target.value)}
                                className="resize-none h-20"
                              />
                            </div>
                          </div>
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