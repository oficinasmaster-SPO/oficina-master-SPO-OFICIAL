import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Target, TrendingUp, Users, Save, Calculator, Percent } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatNumber } from "../components/utils/formatters";

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
    const best_avg_ticket = formData.best_month_clients > 0 ? formData.best_month_revenue / formData.best_month_clients : 0;
    const target_avg_ticket = target_clients > 0 ? target_revenue / target_clients : 0;
    const ticket_difference = target_avg_ticket - best_avg_ticket;
    const target_daily_clients = target_clients / 22;

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

  const calculateEmployeePercentage = (areaKey, employeeRevenue) => {
    const areaRevenue = formData.areas[areaKey].best_revenue;
    if (areaRevenue === 0) return 0;
    return (employeeRevenue / areaRevenue) * 100;
  };

  const recalculateAreaFromEmployees = (areaKey) => {
    const area = formData.areas[areaKey];
    const totalRevenue = area.employees.reduce((sum, emp) => sum + (emp.best_revenue || 0), 0);
    const totalClients = area.employees.reduce((sum, emp) => sum + (emp.best_clients || 0), 0);

    const updatedAreas = { ...formData.areas };
    updatedAreas[areaKey].best_revenue = totalRevenue;
    updatedAreas[areaKey].best_clients = totalClients;
    
    setFormData({ ...formData, areas: updatedAreas });
  };

  const addEmployeeToArea = (areaKey) => {
    const updatedAreas = { ...formData.areas };
    updatedAreas[areaKey].employees.push({
      employee_id: "",
      employee_name: "",
      best_revenue: 0,
      best_clients: 0,
      percentage: 0,
      commission_percentage: 0
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
        if (emp.production_parts || emp.production_services) {
          const historicRevenue = (emp.production_parts || 0) + (emp.production_services || 0);
          updatedAreas[areaKey].employees[index].best_revenue = historicRevenue;
        }
      }
    }

    if (field === "best_revenue") {
      const percentage = calculateEmployeePercentage(areaKey, parseFloat(value) || 0);
      updatedAreas[areaKey].employees[index].percentage = percentage;
    }

    setFormData({ ...formData, areas: updatedAreas });

    if (field === "best_revenue" || field === "best_clients") {
      setTimeout(() => recalculateAreaFromEmployees(areaKey), 0);
    }
  };

  const removeEmployee = (areaKey, index) => {
    const updatedAreas = { ...formData.areas };
    updatedAreas[areaKey].employees.splice(index, 1);
    setFormData({ ...formData, areas: updatedAreas });
    
    setTimeout(() => recalculateAreaFromEmployees(areaKey), 0);
  };

  const calculateEmployeeMetrics = (employee) => {
    const growthFactor = 1 + (formData.growth_percentage / 100);
    const best_avg_ticket = employee.best_clients > 0 ? employee.best_revenue / employee.best_clients : 0;
    const target_revenue = employee.best_revenue * growthFactor;
    const target_clients = Math.round(employee.best_clients * growthFactor);
    const target_avg_ticket = target_clients > 0 ? target_revenue / target_clients : 0;
    const ticket_difference = target_avg_ticket - best_avg_ticket;
    const target_daily_clients = target_clients / 22;
    
    // Cálculo da comissão projetada
    const commission_value = (target_revenue * (employee.commission_percentage || 0)) / 100;
    const total_projected_commission = commission_value + (ticket_difference * target_clients);

    return {
      ...employee,
      best_avg_ticket,
      target_revenue,
      target_clients,
      target_avg_ticket,
      ticket_difference,
      target_daily_clients,
      bonus: ticket_difference,
      commission_value,
      total_projected_commission
    };
  };

  const handleSave = async () => {
    if (!formData.best_month_date || !formData.target_month_date) {
      toast.error("Preencha as datas do melhor mês e mês alvo");
      return;
    }

    if (formData.best_month_revenue === 0 || formData.best_month_clients === 0) {
      toast.error("Preencha o faturamento e quantidade de clientes");
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

      toast.success("Desdobramento de meta salvo com sucesso!");
      navigate(createPageUrl("PainelMetas") + `?id=${breakdown.id}`);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const getEmployeesByArea = (area) => {
    const areaMap = {
      vendas: "vendas",
      comercial: "comercial",
      tecnico: "tecnico"
    };
    
    return employees.filter(e => e.area === areaMap[area]);
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
          <p className="text-gray-600">Matriz de Meta - Esforço e Resultado</p>
        </div>

        {/* Dados Globais */}
        <Card className="border-2 border-green-200">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Dados do Melhor Mês
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
                <Label>Faturamento Total (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.best_month_revenue}
                  onChange={(e) => setFormData({...formData, best_month_revenue: parseFloat(e.target.value) || 0})}
                  placeholder="Ex: 200000"
                />
              </div>
              <div>
                <Label>Quantidade de Clientes *</Label>
                <Input
                  type="number"
                  value={formData.best_month_clients}
                  onChange={(e) => setFormData({...formData, best_month_clients: parseInt(e.target.value) || 0})}
                  placeholder="Ex: 200"
                />
              </div>
              <div>
                <Label>Ticket Médio (Automático)</Label>
                <Input
                  type="text"
                  value={formatCurrency(globalMetrics.best_avg_ticket)}
                  disabled
                  className="bg-gray-100 font-semibold"
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
                <Label>Adicionar % Crescimento (Meta) *</Label>
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
              <h3 className="font-bold text-green-900 mb-3 flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Resultados Calculados Automaticamente:
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Faturamento +%</p>
                  <p className="text-lg font-bold text-green-700">{formatCurrency(globalMetrics.target_revenue)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Qtd Clientes +%</p>
                  <p className="text-lg font-bold text-green-700">{globalMetrics.target_clients}</p>
                </div>
                <div>
                  <p className="text-gray-600">Média Diária</p>
                  <p className="text-lg font-bold text-green-700">{formatNumber(globalMetrics.target_daily_clients, 1)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Ticket Médio +%</p>
                  <p className="text-lg font-bold text-green-700">{formatCurrency(globalMetrics.target_avg_ticket)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Diferença Ticket M</p>
                  <p className="text-lg font-bold text-orange-600">{formatCurrency(globalMetrics.ticket_difference)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Bonificação Global</p>
                  <p className="text-lg font-bold text-purple-600">{formatCurrency(globalMetrics.ticket_difference)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Áreas */}
        {["vendas", "comercial", "tecnico"].map(areaKey => {
          const areaNames = { vendas: "Vendas", comercial: "Comercial", tecnico: "Técnica" };
          const areaMetrics = calculateAreaMetrics(areaKey);
          const areaEmployees = getEmployeesByArea(areaKey);

          return (
            <Card key={areaKey} className="border-2 border-blue-200">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Área de {areaNames[areaKey]}
                  <span className="ml-auto text-sm font-normal text-gray-600">
                    Melhor Mês: {formatCurrency(formData.areas[areaKey].best_revenue)} | {formData.areas[areaKey].best_clients} clientes
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-300">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Faturamento +{formData.growth_percentage}%</p>
                      <p className="font-bold text-blue-700">{formatCurrency(areaMetrics.target_revenue)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Clientes +{formData.growth_percentage}%</p>
                      <p className="font-bold text-blue-700">{areaMetrics.target_clients}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Ticket Médio +%</p>
                      <p className="font-bold text-blue-700">{formatCurrency(areaMetrics.target_avg_ticket)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Bonificação Área</p>
                      <p className="font-bold text-purple-600">{formatCurrency(areaMetrics.area_bonus)}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900">Colaboradores da Área</h4>
                    <Button size="sm" onClick={() => addEmployeeToArea(areaKey)} className="bg-blue-600 hover:bg-blue-700">
                      + Adicionar Colaborador
                    </Button>
                  </div>

                  {formData.areas[areaKey].employees.length === 0 && (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed">
                      <Users className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p>Nenhum colaborador adicionado nesta área</p>
                      <p className="text-sm">Clique em "Adicionar Colaborador" para começar</p>
                    </div>
                  )}

                  {formData.areas[areaKey].employees.map((emp, index) => {
                    const empMetrics = calculateEmployeeMetrics(emp);
                    return (
                      <div key={index} className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-4 mb-3 border-2 border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-3">
                          <div>
                            <Label className="text-xs font-semibold">Nome do Colaborador *</Label>
                            <Select
                              value={emp.employee_id}
                              onValueChange={(v) => updateEmployeeData(areaKey, index, "employee_id", v)}
                            >
                              <SelectTrigger className="bg-white">
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                              <SelectContent>
                                {areaEmployees.map(e => (
                                  <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs font-semibold">Faturamento Melhor Mês (R$) *</Label>
                            <Input
                              type="number"
                              step="0.01"
                              className="bg-white"
                              value={emp.best_revenue}
                              onChange={(e) => updateEmployeeData(areaKey, index, "best_revenue", parseFloat(e.target.value) || 0)}
                              placeholder="Ex: 50000"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-semibold">Quantidade Clientes *</Label>
                            <Input
                              type="number"
                              className="bg-white"
                              value={emp.best_clients}
                              onChange={(e) => updateEmployeeData(areaKey, index, "best_clients", parseInt(e.target.value) || 0)}
                              placeholder="Ex: 50"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-semibold">% Comissão</Label>
                            <Input
                              type="number"
                              step="0.1"
                              min="0"
                              max="100"
                              className="bg-white"
                              value={emp.commission_percentage || 0}
                              onChange={(e) => updateEmployeeData(areaKey, index, "commission_percentage", parseFloat(e.target.value) || 0)}
                              placeholder="Ex: 5"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-semibold flex items-center gap-1">
                              <Percent className="w-3 h-3" />
                              % da Área (Auto)
                            </Label>
                            <Input
                              type="text"
                              value={formatNumber(emp.percentage, 1) + '%'}
                              disabled
                              className="bg-gradient-to-r from-purple-100 to-pink-100 font-bold text-purple-700"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                            <div className="flex gap-6 text-sm flex-wrap">
                              <div>
                                <span className="text-gray-600">Faturamento +{formData.growth_percentage}%: </span>
                                <strong className="text-green-600">{formatCurrency(empMetrics.target_revenue)}</strong>
                              </div>
                              <div>
                                <span className="text-gray-600">Qtd Clientes +%: </span>
                                <strong className="text-blue-600">{empMetrics.target_clients}</strong>
                              </div>
                              <div>
                                <span className="text-gray-600">Ticket Médio +%: </span>
                                <strong className="text-indigo-600">{formatCurrency(empMetrics.target_avg_ticket)}</strong>
                              </div>
                              <div>
                                <span className="text-gray-600">Bonificação: </span>
                                <strong className="text-purple-600">{formatCurrency(empMetrics.bonus)}</strong>
                              </div>
                            </div>
                            <Button size="sm" variant="destructive" onClick={() => removeEmployee(areaKey, index)}>
                              Remover
                            </Button>
                          </div>
                          
                          {(emp.commission_percentage || 0) > 0 && (
                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border-2 border-green-300">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-xs text-gray-600 mb-1">💰 Projeção de Comissão Total</p>
                                  <p className="text-2xl font-bold text-green-700">
                                    {formatCurrency(empMetrics.total_projected_commission)}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Comissão ({formatNumber(emp.commission_percentage, 1)}%): {formatCurrency(empMetrics.commission_value)} + 
                                    Bonificação: {formatCurrency(empMetrics.bonus * empMetrics.target_clients)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
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
          <Button variant="outline" onClick={() => navigate(createPageUrl("Home"))}>
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