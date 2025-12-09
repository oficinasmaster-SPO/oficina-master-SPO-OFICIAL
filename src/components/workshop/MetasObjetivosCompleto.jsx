import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Target, TrendingUp, Calendar, Building2, User, Users, FileText, Download, Edit } from "lucide-react";
import { formatCurrency, formatNumber, formatInteger } from "../utils/formatters";
import { toast } from "sonner";

export default function MetasObjetivosCompleto({ workshop, onUpdate }) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [editingGrowth, setEditingGrowth] = useState(false);
  const [growthPercentageInput, setGrowthPercentageInput] = useState(10);
  const [activeTab, setActiveTab] = useState("melhor_mes");
  const [formData, setFormData] = useState({
    serves_fleet_insurance: false,
    best_month_history: {
      date: "",
      revenue_total: 0,
      revenue_parts: 0,
      revenue_services: 0,
      profit_percentage: 0,
      rentability_percentage: 0,
      customer_volume: 0,
      average_ticket: 0,
      average_ticket_parts: 0,
      average_ticket_services: 0,
      physical_person: {
        revenue_total: 0,
        revenue_parts: 0,
        revenue_services: 0,
        customer_volume: 0,
        percentage: 0
      },
      juridical_person: {
        revenue_total: 0,
        revenue_parts: 0,
        revenue_services: 0,
        customer_volume: 0,
        percentage: 0
      }
    },
    monthly_goals: {
      month: "",
      growth_percentage: 10,
      projected_revenue: 0,
      actual_revenue_achieved: 0,
      revenue_parts: 0,
      revenue_services: 0,
      profitability_percentage: 0,
      profit_percentage: 0,
      average_ticket: 0,
      customer_volume: 0,
      buy_target: 0,
      product_cost_applied: 0
    }
  });

  useEffect(() => {
    if (workshop) {
      setFormData({
        serves_fleet_insurance: workshop.serves_fleet_insurance || false,
        best_month_history: workshop.best_month_history || {
          date: "",
          revenue_total: 0,
          revenue_parts: 0,
          revenue_services: 0,
          profit_percentage: 0,
          rentability_percentage: 0,
          customer_volume: 0,
          average_ticket: 0,
          average_ticket_parts: 0,
          average_ticket_services: 0,
          physical_person: {
            revenue_total: 0, revenue_parts: 0, revenue_services: 0, customer_volume: 0, percentage: 0
          },
          juridical_person: {
            revenue_total: 0, revenue_parts: 0, revenue_services: 0, customer_volume: 0, percentage: 0
          }
        },
        monthly_goals: workshop.monthly_goals || {
          month: "",
          growth_percentage: 10,
          projected_revenue: 0,
          actual_revenue_achieved: 0,
          revenue_parts: 0,
          revenue_services: 0,
          profitability_percentage: 0,
          profit_percentage: 0,
          average_ticket: 0,
          customer_volume: 0,
          buy_target: 0,
          product_cost_applied: 0
        }
      });
      setGrowthPercentageInput(workshop.monthly_goals?.growth_percentage || 10);
    }
  }, [workshop]);

  const handleSave = async () => {
    await onUpdate(formData);
    toast.success("Dados salvos com sucesso!");
    setEditing(false);
  };

  const handleSaveGrowth = async () => {
    const bestMonthRevenue = formData.best_month_history?.revenue_total || 0;
    const newGrowthPercentage = growthPercentageInput || 10;
    const newProjectedRevenue = bestMonthRevenue > 0 
      ? bestMonthRevenue * (1 + newGrowthPercentage / 100)
      : bestMonthRevenue * 1.1;

    const updatedMonthlyGoals = {
      ...formData.monthly_goals,
      growth_percentage: newGrowthPercentage,
      projected_revenue: newProjectedRevenue,
      month: getCurrentMonth()
    };

    await onUpdate({ monthly_goals: updatedMonthlyGoals });
    setFormData(prev => ({
      ...prev,
      monthly_goals: updatedMonthlyGoals
    }));
    toast.success("Crescimento geral atualizado e meta projetada recalculada!");
    setEditingGrowth(false);
  };

  const calculateTotals = () => {
    const bm = formData.best_month_history;
    const totalParts = bm.revenue_parts || 0;
    const totalServices = bm.revenue_services || 0;
    const totalRevenue = totalParts + totalServices;
    const customerVolume = bm.customer_volume || 0;

    return {
      revenue_total: totalRevenue,
      average_ticket: customerVolume > 0 ? totalRevenue / customerVolume : 0,
      average_ticket_parts: customerVolume > 0 ? totalParts / customerVolume : 0,
      average_ticket_services: customerVolume > 0 ? totalServices / customerVolume : 0
    };
  };

  const updateBestMonth = (field, value) => {
    const newBestMonth = { ...formData.best_month_history, [field]: value };
    
    // Recalculate totals
    const totalParts = newBestMonth.revenue_parts || 0;
    const totalServices = newBestMonth.revenue_services || 0;
    const totalRevenue = totalParts + totalServices;
    const customerVolume = newBestMonth.customer_volume || 0;

    newBestMonth.revenue_total = totalRevenue;
    newBestMonth.average_ticket = customerVolume > 0 ? totalRevenue / customerVolume : 0;
    newBestMonth.average_ticket_parts = customerVolume > 0 ? totalParts / customerVolume : 0;
    newBestMonth.average_ticket_services = customerVolume > 0 ? totalServices / customerVolume : 0;

    // Calculate percentages for PF/PJ
    if (formData.serves_fleet_insurance) {
      const pfTotal = (newBestMonth.physical_person?.revenue_total || 0);
      const pjTotal = (newBestMonth.juridical_person?.revenue_total || 0);
      if (totalRevenue > 0) {
        newBestMonth.physical_person = {
          ...newBestMonth.physical_person,
          percentage: (pfTotal / totalRevenue) * 100
        };
        newBestMonth.juridical_person = {
          ...newBestMonth.juridical_person,
          percentage: (pjTotal / totalRevenue) * 100
        };
      }
    }

    setFormData({ ...formData, best_month_history: newBestMonth });
  };

  const updatePhysicalPerson = (field, value) => {
    const newPF = { ...formData.best_month_history.physical_person, [field]: value };
    const totalRevenue = formData.best_month_history.revenue_total || 0;
    
    if (totalRevenue > 0) {
      const pfTotal = (newPF.revenue_parts || 0) + (newPF.revenue_services || 0);
      newPF.revenue_total = pfTotal;
      newPF.percentage = (pfTotal / totalRevenue) * 100;
    }

    setFormData({
      ...formData,
      best_month_history: {
        ...formData.best_month_history,
        physical_person: newPF
      }
    });
  };

  const updateJuridicalPerson = (field, value) => {
    const newPJ = { ...formData.best_month_history.juridical_person, [field]: value };
    const totalRevenue = formData.best_month_history.revenue_total || 0;
    
    if (totalRevenue > 0) {
      const pjTotal = (newPJ.revenue_parts || 0) + (newPJ.revenue_services || 0);
      newPJ.revenue_total = pjTotal;
      newPJ.percentage = (pjTotal / totalRevenue) * 100;
    }

    setFormData({
      ...formData,
      best_month_history: {
        ...formData.best_month_history,
        juridical_person: newPJ
      }
    });
  };

  const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  if (!workshop) {
    return <div className="p-8 text-center text-gray-500">Carregando...</div>;
  }

  // Cálculo da meta projetada e atingimento
  const bestMonthRevenue = formData.best_month_history?.revenue_total || 0;
  const growthPercentage = formData.monthly_goals?.growth_percentage || 10;
  const projectedRevenue = formData.monthly_goals?.projected_revenue || 
    (bestMonthRevenue > 0 ? bestMonthRevenue * (1 + growthPercentage / 100) : 0);
  const actualRevenueAchieved = formData.monthly_goals?.actual_revenue_achieved || 0;
  const achievementPercentage = projectedRevenue > 0 ? (actualRevenueAchieved / projectedRevenue) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Metas e Objetivos</h2>
        </div>
        {!editing ? (
          <Button onClick={() => setEditing(true)}>Editar</Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />
              Salvar
            </Button>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="melhor_mes">
            <TrendingUp className="w-4 h-4 mr-2" />
            Config. Metas
          </TabsTrigger>
          <TabsTrigger value="metas_mensais">
            <Calendar className="w-4 h-4 mr-2" />
            Metas Mensais
          </TabsTrigger>
          <TabsTrigger value="desdobramento">
            <Users className="w-4 h-4 mr-2" />
            Desdobramento
          </TabsTrigger>
        </TabsList>

        {/* Configuração de Metas */}
        <TabsContent value="melhor_mes" className="space-y-6">

          {/* CRESCIMENTO GERAL - Configuração */}
          <Card className="shadow-xl border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-orange-900">
                  <TrendingUp className="w-6 h-6" />
                  📊 Crescimento Geral (Base para Metas Mensais)
                </CardTitle>
                {!editingGrowth ? (
                  <Button onClick={() => setEditingGrowth(true)} size="sm" variant="outline" className="border-orange-400">
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => {
                      setEditingGrowth(false);
                      setGrowthPercentageInput(formData.monthly_goals?.growth_percentage || 10);
                    }} size="sm">Cancelar</Button>
                    <Button onClick={handleSaveGrowth} size="sm" className="bg-orange-600 hover:bg-orange-700">
                      <Save className="w-4 h-4 mr-2" />
                      Salvar
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label className="text-sm text-gray-700 mb-2 block">
                    Porcentagem de Crescimento Geral (%)
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={growthPercentageInput}
                    onChange={(e) => setGrowthPercentageInput(parseFloat(e.target.value) || 0)}
                    disabled={!editingGrowth}
                    className="text-xl font-bold"
                  />
                </div>
                <div className="text-center p-4 bg-orange-100 rounded-lg">
                  <p className="text-sm text-orange-800 mb-1">Projeção</p>
                  <p className="text-2xl font-bold text-orange-600">
                    +{growthPercentageInput.toFixed(1)}%
                  </p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-xs text-yellow-800">
                  ℹ️ Esta porcentagem será aplicada sobre o Melhor Mês Histórico para calcular a Meta Projetada mensal da oficina. Se não preenchido, o sistema usará 10% por padrão.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Melhor Mês Histórico */}
          <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-orange-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-600" />
                🏆 Melhor Mês Histórico da Oficina
              </CardTitle>
              <CardDescription>
                Registre o melhor desempenho da oficina como referência para metas. Será utilizado para calcular a meta mensal PROJETADA.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Atende Locadora/Seguradora */}
              <div className="flex items-center gap-3 p-4 bg-white rounded-lg border">
                <Checkbox
                  checked={formData.serves_fleet_insurance}
                  onCheckedChange={(checked) => setFormData({ ...formData, serves_fleet_insurance: checked })}
                  disabled={!editing}
                />
                <div>
                  <Label className="text-base font-semibold">Atende Locadora/Seguradora?</Label>
                  <p className="text-sm text-gray-600">
                    Se marcado, você poderá separar o faturamento por tipo de cliente (PF x PJ).
                  </p>
                </div>
              </div>

              {/* Dados Gerais */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label>Data do Melhor Mês</Label>
                  <Input
                    type="month"
                    value={formData.best_month_history.date}
                    onChange={(e) => updateBestMonth('date', e.target.value)}
                    disabled={!editing}
                  />
                </div>
                <div>
                  <Label>Faturamento Peças (R$)</Label>
                  <Input
                    type="number"
                    value={formData.best_month_history.revenue_parts}
                    onChange={(e) => updateBestMonth('revenue_parts', parseFloat(e.target.value) || 0)}
                    disabled={!editing}
                    className="text-right"
                  />
                </div>
                <div>
                  <Label>Faturamento Serviços (R$)</Label>
                  <Input
                    type="number"
                    value={formData.best_month_history.revenue_services}
                    onChange={(e) => updateBestMonth('revenue_services', parseFloat(e.target.value) || 0)}
                    disabled={!editing}
                    className="text-right"
                  />
                </div>
                <div>
                  <Label>Faturamento Total</Label>
                  <Input
                    value={formatCurrency(formData.best_month_history.revenue_total || 0)}
                    disabled
                    className="bg-yellow-100 font-bold text-orange-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label>Volume de Clientes</Label>
                  <Input
                    type="number"
                    value={formData.best_month_history.customer_volume}
                    onChange={(e) => updateBestMonth('customer_volume', parseInt(e.target.value) || 0)}
                    disabled={!editing}
                  />
                </div>
                <div>
                  <Label>Lucro (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.best_month_history.profit_percentage}
                    onChange={(e) => updateBestMonth('profit_percentage', parseFloat(e.target.value) || 0)}
                    disabled={!editing}
                  />
                </div>
                <div>
                  <Label>Rentabilidade (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.best_month_history.rentability_percentage}
                    onChange={(e) => updateBestMonth('rentability_percentage', parseFloat(e.target.value) || 0)}
                    disabled={!editing}
                  />
                </div>
                <div>
                  <Label>Ticket Médio (Auto)</Label>
                  <Input
                    value={formatCurrency(formData.best_month_history.average_ticket || 0)}
                    disabled
                    className="bg-yellow-100 font-bold text-orange-700"
                  />
                </div>
              </div>

              {/* Tickets Médios Separados */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Ticket Médio Peças (Auto)</Label>
                  <Input
                    value={formatCurrency(formData.best_month_history.average_ticket_parts || 0)}
                    disabled
                    className="bg-gray-100"
                  />
                </div>
                <div>
                  <Label>Ticket Médio Serviços (Auto)</Label>
                  <Input
                    value={formatCurrency(formData.best_month_history.average_ticket_services || 0)}
                    disabled
                    className="bg-gray-100"
                  />
                </div>
              </div>

              {/* Detalhamento PF x PJ */}
              {formData.serves_fleet_insurance && (
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Detalhamento por Tipo de Cliente
                  </h4>

                  {/* Pessoa Física */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <User className="w-4 h-4 text-blue-600" />
                      <h5 className="font-semibold text-blue-900">Pessoa Física</h5>
                      <span className="ml-auto text-lg font-bold text-blue-600">
                        {formatNumber(formData.best_month_history.physical_person?.percentage || 0, 1)}%
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <Label className="text-xs">Fat. Peças (R$)</Label>
                        <Input
                          type="number"
                          value={formData.best_month_history.physical_person?.revenue_parts || 0}
                          onChange={(e) => updatePhysicalPerson('revenue_parts', parseFloat(e.target.value) || 0)}
                          disabled={!editing}
                          className="h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Fat. Serviços (R$)</Label>
                        <Input
                          type="number"
                          value={formData.best_month_history.physical_person?.revenue_services || 0}
                          onChange={(e) => updatePhysicalPerson('revenue_services', parseFloat(e.target.value) || 0)}
                          disabled={!editing}
                          className="h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Clientes</Label>
                        <Input
                          type="number"
                          value={formData.best_month_history.physical_person?.customer_volume || 0}
                          onChange={(e) => updatePhysicalPerson('customer_volume', parseInt(e.target.value) || 0)}
                          disabled={!editing}
                          className="h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Total</Label>
                        <Input
                          value={formatCurrency(formData.best_month_history.physical_person?.revenue_total || 0)}
                          disabled
                          className="h-9 bg-blue-100"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Pessoa Jurídica */}
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 className="w-4 h-4 text-purple-600" />
                      <h5 className="font-semibold text-purple-900">Pessoa Jurídica (Locadora/Seguradora)</h5>
                      <span className="ml-auto text-lg font-bold text-purple-600">
                        {formatNumber(formData.best_month_history.juridical_person?.percentage || 0, 1)}%
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <Label className="text-xs">Fat. Peças (R$)</Label>
                        <Input
                          type="number"
                          value={formData.best_month_history.juridical_person?.revenue_parts || 0}
                          onChange={(e) => updateJuridicalPerson('revenue_parts', parseFloat(e.target.value) || 0)}
                          disabled={!editing}
                          className="h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Fat. Serviços (R$)</Label>
                        <Input
                          type="number"
                          value={formData.best_month_history.juridical_person?.revenue_services || 0}
                          onChange={(e) => updateJuridicalPerson('revenue_services', parseFloat(e.target.value) || 0)}
                          disabled={!editing}
                          className="h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Clientes</Label>
                        <Input
                          type="number"
                          value={formData.best_month_history.juridical_person?.customer_volume || 0}
                          onChange={(e) => updateJuridicalPerson('customer_volume', parseInt(e.target.value) || 0)}
                          disabled={!editing}
                          className="h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Total</Label>
                        <Input
                          value={formatCurrency(formData.best_month_history.juridical_person?.revenue_total || 0)}
                          disabled
                          className="h-9 bg-purple-100"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Resumo */}
              {formData.best_month_history.date && formData.best_month_history.revenue_total > 0 && (
                <div className="bg-orange-100 rounded-lg p-4 border-2 border-orange-300">
                  <p className="text-sm text-orange-900 font-semibold mb-2">
                    📊 Referência para Metas
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                    <div>
                      <p className="text-orange-700">Data:</p>
                      <p className="font-bold text-orange-900">
                        {new Date(formData.best_month_history.date + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <div>
                      <p className="text-orange-700">Faturamento:</p>
                      <p className="font-bold text-orange-900">{formatCurrency(formData.best_month_history.revenue_total)}</p>
                    </div>
                    <div>
                      <p className="text-orange-700">Lucro:</p>
                      <p className="font-bold text-orange-900">{formatNumber(formData.best_month_history.profit_percentage, 1)}%</p>
                    </div>
                    <div>
                      <p className="text-orange-700">Rentabilidade:</p>
                      <p className="font-bold text-orange-900">{formatNumber(formData.best_month_history.rentability_percentage, 1)}%</p>
                    </div>
                    <div>
                      <p className="text-orange-700">Ticket Médio:</p>
                      <p className="font-bold text-orange-900">{formatCurrency(formData.best_month_history.average_ticket)}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Metas Mensais */}
        <TabsContent value="metas_mensais" className="space-y-6">
          
          {/* Card de Espelhamento do Melhor Mês + Metas Mensais */}
          <Card className="shadow-xl border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-900">
                <Target className="w-6 h-6" />
                🎯 Metas Mensais Projetadas - {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Melhor Mês Histórico</p>
                  <p className="text-xl font-bold text-gray-900">
                    R$ {formatCurrency(bestMonthRevenue)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Base para projeção</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">% Crescimento</p>
                  <p className="text-xl font-bold text-blue-600">
                    +{formatNumber(growthPercentage, 1)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Configurado em "Config. Metas"</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">PROJETADO (Mês)</p>
                  <p className="text-xl font-bold text-green-600">
                    R$ {formatCurrency(projectedRevenue)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Meta a atingir</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">REALIZADO no Mês</p>
                  <p className="text-xl font-bold text-purple-600">
                    R$ {formatCurrency(actualRevenueAchieved)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Alimentado pelo sistema</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t-2 border-green-300">
                <div className="bg-white p-4 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">% Atingimento da Meta</p>
                  <p className={`text-2xl font-bold ${achievementPercentage >= 100 ? 'text-green-600' : achievementPercentage >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {achievementPercentage.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {achievementPercentage >= 100 ? '🎉 Meta superada!' : achievementPercentage >= 70 ? '⚡ Quase lá!' : '💪 Continue o esforço!'}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Falta para Meta</p>
                  <p className="text-2xl font-bold text-orange-600">
                    R$ {formatCurrency(Math.max(0, projectedRevenue - actualRevenueAchieved))}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Quanto ainda precisa faturar</p>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-800">
                  💡 <strong>Como funciona:</strong> A meta PROJETADA é calculada automaticamente (Melhor Mês + % Crescimento). 
                  O valor REALIZADO é atualizado automaticamente pelo sistema, com base nos dados de produção.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Metas Detalhadas */}
          <Card>
            <CardHeader>
              <CardTitle>Metas Detalhadas (Opcional)</CardTitle>
              <CardDescription>
                Você pode preencher valores específicos se desejar um controle mais granular.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label>Mês de Referência</Label>
                  <Input
                    type="month"
                    value={formData.monthly_goals.month || getCurrentMonth()}
                    onChange={(e) => setFormData({
                      ...formData,
                      monthly_goals: { ...formData.monthly_goals, month: e.target.value }
                    })}
                    disabled={!editing}
                  />
                </div>
                <div>
                  <Label>Faturamento Peças (R$)</Label>
                  <Input
                    type="number"
                    value={formData.monthly_goals.revenue_parts}
                    onChange={(e) => setFormData({
                      ...formData,
                      monthly_goals: { ...formData.monthly_goals, revenue_parts: parseFloat(e.target.value) || 0 }
                    })}
                    disabled={!editing}
                  />
                </div>
                <div>
                  <Label>Faturamento Serviços (R$)</Label>
                  <Input
                    type="number"
                    value={formData.monthly_goals.revenue_services}
                    onChange={(e) => setFormData({
                      ...formData,
                      monthly_goals: { ...formData.monthly_goals, revenue_services: parseFloat(e.target.value) || 0 }
                    })}
                    disabled={!editing}
                  />
                </div>
                <div>
                  <Label>Meta Total</Label>
                  <Input
                    value={formatCurrency((formData.monthly_goals.revenue_parts || 0) + (formData.monthly_goals.revenue_services || 0))}
                    disabled
                    className="bg-green-100 font-bold text-green-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label>Rentabilidade (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.monthly_goals.profitability_percentage}
                    onChange={(e) => setFormData({
                      ...formData,
                      monthly_goals: { ...formData.monthly_goals, profitability_percentage: parseFloat(e.target.value) || 0 }
                    })}
                    disabled={!editing}
                  />
                </div>
                <div>
                  <Label>Lucro (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.monthly_goals.profit_percentage}
                    onChange={(e) => setFormData({
                      ...formData,
                      monthly_goals: { ...formData.monthly_goals, profit_percentage: parseFloat(e.target.value) || 0 }
                    })}
                    disabled={!editing}
                  />
                </div>
                <div>
                  <Label>Ticket Médio (R$)</Label>
                  <Input
                    type="number"
                    value={formData.monthly_goals.average_ticket}
                    onChange={(e) => setFormData({
                      ...formData,
                      monthly_goals: { ...formData.monthly_goals, average_ticket: parseFloat(e.target.value) || 0 }
                    })}
                    disabled={!editing}
                  />
                </div>
                <div>
                  <Label>Volume de Clientes</Label>
                  <Input
                    type="number"
                    value={formData.monthly_goals.customer_volume}
                    onChange={(e) => setFormData({
                      ...formData,
                      monthly_goals: { ...formData.monthly_goals, customer_volume: parseInt(e.target.value) || 0 }
                    })}
                    disabled={!editing}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Meta de Compra (R$)</Label>
                  <Input
                    type="number"
                    value={formData.monthly_goals.buy_target}
                    onChange={(e) => setFormData({
                      ...formData,
                      monthly_goals: { ...formData.monthly_goals, buy_target: parseFloat(e.target.value) || 0 }
                    })}
                    disabled={!editing}
                  />
                </div>
                <div>
                  <Label>Custo de Produto Aplicado (R$)</Label>
                  <Input
                    type="number"
                    value={formData.monthly_goals.product_cost_applied}
                    onChange={(e) => setFormData({
                      ...formData,
                      monthly_goals: { ...formData.monthly_goals, product_cost_applied: parseFloat(e.target.value) || 0 }
                    })}
                    disabled={!editing}
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => navigate(createPageUrl("HistoricoMetas"))}
                  className="w-full"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Ver Histórico de Metas e Relatórios
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Desdobramento */}
        <TabsContent value="desdobramento" className="space-y-6">
          <Card className="bg-blue-50 border-2 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Desdobramento Completo de Metas
              </CardTitle>
              <CardDescription>
                Distribua as metas por área e colaborador
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white p-4 rounded-lg border">
                <h4 className="font-semibold text-gray-900 mb-2">Dados do Melhor Mês (Referência para Desdobramento)</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600">PROJETADO Mês:</p>
                    <p className="font-bold text-green-600">{formatCurrency(projectedRevenue)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Realizado Mês:</p>
                    <p className="font-bold text-purple-600">{formatCurrency(actualRevenueAchieved)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Faturamento Melhor Mês:</p>
                    <p className="font-bold">{formatCurrency(bestMonthRevenue)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">% Crescimento Aplicado:</p>
                    <p className="font-bold">{formatNumber(growthPercentage, 1)}%</p>
                  </div>
                </div>
              </div>

              <p className="text-gray-600">
                Para definir metas por área (Vendas, Comercial, Pátio) e distribuir por colaborador, 
                utilize a ferramenta completa de desdobramento.
              </p>

              <Button
                onClick={() => navigate(createPageUrl("DesdobramentoMeta"))}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Users className="w-4 h-4 mr-2" />
                Abrir Desdobramento de Metas
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}