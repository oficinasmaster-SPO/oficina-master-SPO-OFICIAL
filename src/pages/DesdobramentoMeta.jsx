import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Target, TrendingUp, Users, Save } from "lucide-react";
import { toast } from "sonner";

export default function DesdobramentoMeta() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workshop, setWorkshop] = useState(null);
  const [employees, setEmployees] = useState([]);
  
  const [formData, setFormData] = useState({
    best_month_date: "",
    target_month_date: "",
    best_month_revenue: 0,
    best_month_clients: 0,
    growth_percentage: 20,
    areas: {
      vendas: { best_revenue: 0, best_clients: 0, employees: [] },
      comercial: { best_revenue: 0, best_clients: 0, employees: [] },
      tecnico: { best_revenue: 0, best_clients: 0, employees: [] }
    }
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      const workshops = await base44.entities.Workshop.list();
      const userWorkshop = workshops.find(w => w.owner_id === user.id);
      setWorkshop(userWorkshop);

      const allEmployees = await base44.entities.Employee.list();
      const activeEmployees = allEmployees.filter(e => e.status === "ativo");
      setEmployees(activeEmployees);
    } catch (error) {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const calculateGlobalMetrics = () => {
    const growthFactor = 1 + (formData.growth_percentage / 100);
    const target_revenue = formData.best_month_revenue * growthFactor;
    const target_clients = Math.round(formData.best_month_clients * growthFactor);
    const best_avg_ticket = formData.best_month_revenue / formData.best_month_clients;
    const target_avg_ticket = target_revenue / target_clients;
    const ticket_difference = target_avg_ticket - best_avg_ticket;
    const target_daily_clients = target_clients / 22; // dias úteis

    return {
      target_revenue,
      target_clients,
      best_avg_ticket,
      target_avg_ticket,
      ticket_difference,
      target_daily_clients
    };
  };

  const calculateAreaMetrics = (areaKey) => {
    const area = formData.areas[areaKey];
    const growthFactor = 1 + (formData.growth_percentage / 100);
    
    const best_avg_ticket = area.best_clients > 0 ? area.best_revenue / area.best_clients : 0;
    const target_revenue = area.best_revenue * growthFactor;
    const target_clients = Math.round(area.best_clients * growthFactor);
    const target_avg_ticket = target_clients > 0 ? target_revenue / target_clients : 0;
    const ticket_difference = target_avg_ticket - best_avg_ticket;
    const target_daily_clients = target_clients / 22;

    return {
      ...area,
      best_avg_ticket,
      target_revenue,
      target_clients,
      target_avg_ticket,
      ticket_difference,
      target_daily_clients,
      area_bonus: ticket_difference
    };
  };

  const addEmployeeToArea = (areaKey) => {
    const updatedAreas = { ...formData.areas };
    updatedAreas[areaKey].employees.push({
      employee_id: "",
      employee_name: "",
      best_revenue: 0,
      best_clients: 0
    });
    setFormData({ ...formData, areas: updatedAreas });
  };

  const updateEmployeeData = (areaKey, index, field, value) => {
    const updatedAreas = { ...formData.areas };
    updatedAreas[areaKey].employees[index][field] = value;

    if (field === "employee_id" && value) {
      const emp = employees.find(e => e.id === value);
      if (emp) {
        updatedAreas[areaKey].employees[index].employee_name = emp.full_name;
      }
    }

    setFormData({ ...formData, areas: updatedAreas });
  };

  const removeEmployee = (areaKey, index) => {
    const updatedAreas = { ...formData.areas };
    updatedAreas[areaKey].employees.splice(index, 1);
    setFormData({ ...formData, areas: updatedAreas });
  };

  const calculateEmployeeMetrics = (employee) => {
    const growthFactor = 1 + (formData.growth_percentage / 100);
    const best_avg_ticket = employee.best_clients > 0 ? employee.best_revenue / employee.best_clients : 0;
    const target_revenue = employee.best_revenue * growthFactor;
    const target_clients = Math.round(employee.best_clients * growthFactor);
    const target_avg_ticket = target_clients > 0 ? target_revenue / target_clients : 0;
    const ticket_difference = target_avg_ticket - best_avg_ticket;
    const target_daily_clients = target_clients / 22;

    return {
      ...employee,
      best_avg_ticket,
      target_revenue,
      target_clients,
      target_avg_ticket,
      ticket_difference,
      target_daily_clients,
      bonus: ticket_difference
    };
  };

  const handleSave = async () => {
    if (!formData.best_month_date || !formData.target_month_date) {
      toast.error("Preencha as datas do melhor mês e mês alvo");
      return;
    }

    setSaving(true);
    try {
      const globalMetrics = calculateGlobalMetrics();
      
      const processedAreas = {};
      Object.keys(formData.areas).forEach(areaKey => {
        const areaMetrics = calculateAreaMetrics(areaKey);
        const processedEmployees = areaMetrics.employees.map(emp => calculateEmployeeMetrics(emp));
        processedAreas[areaKey] = {
          ...areaMetrics,
          employees: processedEmployees
        };
      });

      const breakdown = await base44.entities.GoalBreakdown.create({
        workshop_id: workshop?.id || null,
        best_month_date: formData.best_month_date,
        target_month_date: formData.target_month_date,
        best_month_revenue: formData.best_month_revenue,
        best_month_clients: formData.best_month_clients,
        best_month_avg_ticket: globalMetrics.best_avg_ticket,
        growth_percentage: formData.growth_percentage,
        target_revenue: globalMetrics.target_revenue,
        target_clients: globalMetrics.target_clients,
        target_daily_clients: globalMetrics.target_daily_clients,
        target_avg_ticket: globalMetrics.target_avg_ticket,
        ticket_difference: globalMetrics.ticket_difference,
        global_bonus: globalMetrics.ticket_difference,
        areas: processedAreas,
        status: "ativa"
      });

      toast.success("Desdobramento de meta salvo!");
      navigate(createPageUrl("PainelMetas") + `?id=${breakdown.id}`);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const globalMetrics = calculateGlobalMetrics();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 py-12 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <Target className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Desdobramento de Metas
          </h1>
          <p className="text-gray-600">Metodologia Oficinas Master - Esforço e Resultado</p>
        </div>

        {/* Dados Globais */}
        <Card className="border-2 border-green-200">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Dados do Melhor Mês da Empresa
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label>Data Melhor Mês *</Label>
                <Input
                  type="date"
                  value={formData.best_month_date}
                  onChange={(e) => setFormData({...formData, best_month_date: e.target.value})}
                />
              </div>
              <div>
                <Label>Faturamento (R$) *</Label>
                <Input
                  type="number"
                  value={formData.best_month_revenue}
                  onChange={(e) => setFormData({...formData, best_month_revenue: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div>
                <Label>Quantidade de Clientes *</Label>
                <Input
                  type="number"
                  value={formData.best_month_clients}
                  onChange={(e) => setFormData({...formData, best_month_clients: parseInt(e.target.value) || 0})}
                />
              </div>
              <div>
                <Label>Ticket Médio</Label>
                <Input
                  type="text"
                  value={`R$ ${globalMetrics.best_avg_ticket.toFixed(2)}`}
                  disabled
                  className="bg-gray-100"
                />
              </div>
            </div>

            <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Data Mês Alvo *</Label>
                <Input
                  type="date"
                  value={formData.target_month_date}
                  onChange={(e) => setFormData({...formData, target_month_date: e.target.value})}
                />
              </div>
              <div>
                <Label>% de Crescimento *</Label>
                <Select value={formData.growth_percentage.toString()} onValueChange={(v) => setFormData({...formData, growth_percentage: parseInt(v)})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">+10%</SelectItem>
                    <SelectItem value="15">+15%</SelectItem>
                    <SelectItem value="20">+20%</SelectItem>
                    <SelectItem value="25">+25%</SelectItem>
                    <SelectItem value="30">+30%</SelectItem>
                    <SelectItem value="50">+50%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4 border-2 border-green-300">
              <h3 className="font-bold text-green-900 mb-3">Metas Calculadas Automaticamente:</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Faturamento Desejado</p>
                  <p className="text-lg font-bold text-green-700">R$ {globalMetrics.target_revenue.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Clientes Necessários</p>
                  <p className="text-lg font-bold text-green-700">{globalMetrics.target_clients}</p>
                </div>
                <div>
                  <p className="text-gray-600">Média Diária</p>
                  <p className="text-lg font-bold text-green-700">{globalMetrics.target_daily_clients.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Novo Ticket Médio</p>
                  <p className="text-lg font-bold text-green-700">R$ {globalMetrics.target_avg_ticket.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Área de Vendas */}
        {["vendas", "comercial", "tecnico"].map(areaKey => {
          const areaNames = { vendas: "Vendas", comercial: "Comercial", tecnico: "Técnica" };
          const areaMetrics = calculateAreaMetrics(areaKey);

          return (
            <Card key={areaKey} className="border-2 border-blue-200">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Área {areaNames[areaKey]}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Faturamento Melhor Mês (R$)</Label>
                    <Input
                      type="number"
                      value={formData.areas[areaKey].best_revenue}
                      onChange={(e) => {
                        const updatedAreas = { ...formData.areas };
                        updatedAreas[areaKey].best_revenue = parseFloat(e.target.value) || 0;
                        setFormData({ ...formData, areas: updatedAreas });
                      }}
                    />
                  </div>
                  <div>
                    <Label>Clientes Melhor Mês</Label>
                    <Input
                      type="number"
                      value={formData.areas[areaKey].best_clients}
                      onChange={(e) => {
                        const updatedAreas = { ...formData.areas };
                        updatedAreas[areaKey].best_clients = parseInt(e.target.value) || 0;
                        setFormData({ ...formData, areas: updatedAreas });
                      }}
                    />
                  </div>
                  <div>
                    <Label>Ticket Médio</Label>
                    <Input
                      type="text"
                      value={`R$ ${areaMetrics.best_avg_ticket.toFixed(2)}`}
                      disabled
                      className="bg-gray-100"
                    />
                  </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-4 border border-blue-300">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Meta Faturamento</p>
                      <p className="font-bold text-blue-700">R$ {areaMetrics.target_revenue.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Meta Clientes</p>
                      <p className="font-bold text-blue-700">{areaMetrics.target_clients}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Média Diária</p>
                      <p className="font-bold text-blue-700">{areaMetrics.target_daily_clients.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Novo Ticket</p>
                      <p className="font-bold text-blue-700">R$ {areaMetrics.target_avg_ticket.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900">Colaboradores da Área</h4>
                    <Button size="sm" onClick={() => addEmployeeToArea(areaKey)}>+ Adicionar</Button>
                  </div>

                  {formData.areas[areaKey].employees.map((emp, index) => {
                    const empMetrics = calculateEmployeeMetrics(emp);
                    return (
                      <div key={index} className="bg-gray-50 rounded-lg p-4 mb-3 border">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                          <div>
                            <Label className="text-xs">Colaborador</Label>
                            <Select
                              value={emp.employee_id}
                              onValueChange={(v) => updateEmployeeData(areaKey, index, "employee_id", v)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                              <SelectContent>
                                {employees.map(e => (
                                  <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Faturamento Melhor Mês (R$)</Label>
                            <Input
                              type="number"
                              value={emp.best_revenue}
                              onChange={(e) => updateEmployeeData(areaKey, index, "best_revenue", parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Clientes Melhor Mês</Label>
                            <Input
                              type="number"
                              value={emp.best_clients}
                              onChange={(e) => updateEmployeeData(areaKey, index, "best_clients", parseInt(e.target.value) || 0)}
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex gap-4">
                            <span>Meta: <strong className="text-green-600">R$ {empMetrics.target_revenue.toFixed(2)}</strong></span>
                            <span>Clientes: <strong className="text-blue-600">{empMetrics.target_clients}</strong></span>
                            <span>Bônus: <strong className="text-purple-600">R$ {empMetrics.bonus.toFixed(2)}</strong></span>
                          </div>
                          <Button size="sm" variant="destructive" onClick={() => removeEmployee(areaKey, index)}>Remover</Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}

        <div className="flex justify-center gap-4">
          <Button variant="outline" onClick={() => navigate(createPageUrl("GestaoMetas"))}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700 px-8">
            {saving ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Salvando...</>
            ) : (
              <><Save className="w-5 h-5 mr-2" /> Salvar Desdobramento</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}