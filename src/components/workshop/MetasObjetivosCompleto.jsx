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
  const [loadingTCMP2, setLoadingTCMP2] = useState(false);
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
      r70_i30: { r70: 70, i30: 30 },
      tcmp2: 0,
      pave_commercial: 0,
      kit_master: 0,
      clients_scheduled_base: 0,
      clients_delivered_base: 0,
      sales_base: 0,
      clients_scheduled_mkt: 0,
      clients_delivered_mkt: 0,
      sales_marketing: 0,
      clients_scheduled_referral: 0,
      clients_delivered_referral: 0,
      clients_delivered: 0,
      marketing: {
        leads_generated: 0,
        leads_scheduled: 0,
        leads_showed_up: 0,
        leads_sold: 0,
        cost_per_sale: 0,
        invested_value: 0,
        revenue_from_traffic: 0
      },
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
      const defaultBestMonth = {
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
        r70_i30: { r70: 70, i30: 30 },
        tcmp2: 0,
        pave_commercial: 0,
        kit_master: 0,
        clients_scheduled_base: 0,
        clients_delivered_base: 0,
        sales_base: 0,
        clients_scheduled_mkt: 0,
        clients_delivered_mkt: 0,
        sales_marketing: 0,
        clients_scheduled_referral: 0,
        clients_delivered_referral: 0,
        clients_delivered: 0,
        marketing: {
          leads_generated: 0,
          leads_scheduled: 0,
          leads_showed_up: 0,
          leads_sold: 0,
          cost_per_sale: 0,
          invested_value: 0,
          revenue_from_traffic: 0
        },
        physical_person: {
          revenue_total: 0, revenue_parts: 0, revenue_services: 0, customer_volume: 0, percentage: 0
        },
        juridical_person: {
          revenue_total: 0, revenue_parts: 0, revenue_services: 0, customer_volume: 0, percentage: 0
        }
      };

      setFormData({
        serves_fleet_insurance: workshop.serves_fleet_insurance || false,
        best_month_history: { ...defaultBestMonth, ...(workshop.best_month_history || {}) },
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
    try {
      await onUpdate(formData);
      toast.success("Metas salvas com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar metas");
    } finally {
      setEditing(false);
    }
  };

  const handleSaveGrowth = async () => {
    try {
      const bestMonthRevenue = formData.best_month_history?.revenue_total || 0;
      const newGrowthPercentage = growthPercentageInput || 10;
      const newProjectedRevenue = bestMonthRevenue > 0 ?
        bestMonthRevenue * (1 + newGrowthPercentage / 100) :
        bestMonthRevenue * 1.1;

      const updatedMonthlyGoals = {
        ...formData.monthly_goals,
        growth_percentage: newGrowthPercentage,
        projected_revenue: newProjectedRevenue,
        month: getCurrentMonth()
      };

      await onUpdate({ monthly_goals: updatedMonthlyGoals });
      setFormData((prev) => ({
        ...prev,
        monthly_goals: updatedMonthlyGoals
      }));
      toast.success("Crescimento geral atualizado!");
    } catch (error) {
      console.error("Erro ao salvar crescimento:", error);
      toast.error("Erro ao salvar crescimento");
    } finally {
      setEditingGrowth(false);
    }
  };

  const updateBestMonth = (field, value) => {
    const newBestMonth = { ...formData.best_month_history, [field]: value };

    // Recalcular totais automáticos
    const totalParts = newBestMonth.revenue_parts || 0;
    const totalServices = newBestMonth.revenue_services || 0;
    const totalRevenue = totalParts + totalServices;
    const customerVolume = newBestMonth.customer_volume || 0;

    newBestMonth.revenue_total = totalRevenue;
    newBestMonth.average_ticket = customerVolume > 0 ? totalRevenue / customerVolume : 0;
    newBestMonth.average_ticket_parts = customerVolume > 0 ? totalParts / customerVolume : 0;
    newBestMonth.average_ticket_services = customerVolume > 0 ? totalServices / customerVolume : 0;

    // Calcular custo por venda (Marketing)
    if (newBestMonth.marketing) {
      const leadsSold = newBestMonth.marketing.leads_sold || 0;
      const investedValue = newBestMonth.marketing.invested_value || 0;
      newBestMonth.marketing.cost_per_sale = leadsSold > 0 ? investedValue / leadsSold : 0;
    }

    // Calculate percentages for PF/PJ
    if (formData.serves_fleet_insurance) {
      const pfTotal = newBestMonth.physical_person?.revenue_total || 0;
      const pjTotal = newBestMonth.juridical_person?.revenue_total || 0;
      if (totalRevenue > 0) {
        newBestMonth.physical_person = {
          ...newBestMonth.physical_person,
          percentage: pfTotal / totalRevenue * 100
        };
        newBestMonth.juridical_person = {
          ...newBestMonth.juridical_person,
          percentage: pjTotal / totalRevenue * 100
        };
      }
    }

    setFormData({ ...formData, best_month_history: newBestMonth });
  };

  const updateMarketing = (field, value) => {
    const newMarketing = { ...formData.best_month_history.marketing, [field]: value };

    // Recalcular custo por venda automaticamente
    const leadsSold = newMarketing.leads_sold || 0;
    const investedValue = newMarketing.invested_value || 0;
    newMarketing.cost_per_sale = leadsSold > 0 ? investedValue / leadsSold : 0;

    setFormData({
      ...formData,
      best_month_history: {
        ...formData.best_month_history,
        marketing: newMarketing
      }
    });
  };

  const updatePhysicalPerson = (field, value) => {
    const newPF = { ...formData.best_month_history.physical_person, [field]: value };
    const totalRevenue = formData.best_month_history.revenue_total || 0;

    if (totalRevenue > 0) {
      const pfTotal = (newPF.revenue_parts || 0) + (newPF.revenue_services || 0);
      newPF.revenue_total = pfTotal;
      newPF.percentage = pfTotal / totalRevenue * 100;
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
      newPJ.percentage = pjTotal / totalRevenue * 100;
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

  const loadTCMP2FromDRE = async () => {
    try {
      setLoadingTCMP2(true);
      // Buscar todos os DREs da oficina
      const dres = await base44.entities.DREMonthly.filter({
        workshop_id: workshop.id
      });

      if (dres && dres.length > 0) {
        // Calcular TCMP2 médio
        const validTCMP2s = dres.
        map((dre) => dre.tcmp2 || 0).
        filter((tcmp2) => tcmp2 > 0);

        if (validTCMP2s.length > 0) {
          const averageTCMP2 = validTCMP2s.reduce((sum, val) => sum + val, 0) / validTCMP2s.length;

          setFormData((prev) => ({
            ...prev,
            best_month_history: {
              ...prev.best_month_history,
              tcmp2: Number(averageTCMP2.toFixed(2))
            }
          }));

          toast.success(`TCMP2 médio carregado: R$ ${averageTCMP2.toFixed(2)}`);
        } else {
          toast.info("Nenhum TCMP2 válido encontrado nos DREs registrados");
        }
      } else {
        toast.info("Nenhum DRE encontrado. Cadastre DREs para calcular o TCMP2 médio.");
      }
    } catch (error) {
      console.error("Erro ao carregar TCMP2:", error);
      toast.error("Erro ao buscar TCMP2 do DRE");
    } finally {
      setLoadingTCMP2(false);
    }
  };

  if (!workshop) {
    return <div className="p-8 text-center text-gray-500">Carregando...</div>;
  }

  // Cálculo da meta projetada e atingimento
  const bestMonthRevenue = formData.best_month_history?.revenue_total || 0;
  const growthPercentage = formData.monthly_goals?.growth_percentage || 10;
  const projectedRevenue = formData.monthly_goals?.projected_revenue || (
  bestMonthRevenue > 0 ? bestMonthRevenue * (1 + growthPercentage / 100) : 0);
  const actualRevenueAchieved = formData.monthly_goals?.actual_revenue_achieved || 0;
  const achievementPercentage = projectedRevenue > 0 ? actualRevenueAchieved / projectedRevenue * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Metas e Objetivos</h2>
        </div>
        {!editing ?
        <Button onClick={() => setEditing(true)}>Editar</Button> :

        <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />
              Salvar
            </Button>
          </div>
        }
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
                {!editingGrowth ?
                <Button onClick={() => setEditingGrowth(true)} size="sm" variant="outline" className="border-orange-400">
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </Button> :

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
                }
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
                    className="text-xl font-bold" />

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
                  disabled={!editing} />

                <div>
                  <Label className="text-base font-semibold">Atende Locadora/Seguradora?</Label>
                  <p className="text-sm text-gray-600">
                    Se marcado, você poderá separar o faturamento por tipo de cliente (PF x PJ).
                  </p>
                </div>
              </div>

              {/* Dados Principais */}
              <div className="bg-white p-4 rounded-lg border-2 border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-4">📊 Dados Principais</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label>Data do Melhor Mês</Label>
                    <Input
                      type="month"
                      value={formData.best_month_history.date}
                      onChange={(e) => updateBestMonth('date', e.target.value)}
                      disabled={!editing} />

                  </div>
                  <div>
                    <Label>Faturamento Peças (R$)</Label>
                    <Input
                      type="number"
                      value={formData.best_month_history.revenue_parts}
                      onChange={(e) => updateBestMonth('revenue_parts', parseFloat(e.target.value) || 0)}
                      disabled={!editing}
                      className="text-right" />

                  </div>
                  <div>
                    <Label>Faturamento Serviços (R$)</Label>
                    <Input
                      type="number"
                      value={formData.best_month_history.revenue_services}
                      onChange={(e) => updateBestMonth('revenue_services', parseFloat(e.target.value) || 0)}
                      disabled={!editing}
                      className="text-right" />

                  </div>
                  <div>
                    <Label>Faturamento Total (Auto)</Label>
                    <Input
                      value={formatCurrency(formData.best_month_history.revenue_total || 0)}
                      disabled
                      className="bg-yellow-100 font-bold text-orange-700" />

                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                  <div>
                    <Label>Clientes (qtd)</Label>
                    <Input
                      type="number"
                      value={formData.best_month_history.customer_volume}
                      onChange={(e) => updateBestMonth('customer_volume', parseInt(e.target.value) || 0)}
                      disabled={!editing} />

                  </div>
                  <div>
                    <Label>Ticket Médio (Auto)</Label>
                    <Input
                      value={formatCurrency(formData.best_month_history.average_ticket || 0)}
                      disabled
                      className="bg-yellow-100 font-bold text-orange-700" />

                  </div>
                  <div>
                    <Label>Lucro (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.best_month_history.profit_percentage}
                      onChange={(e) => updateBestMonth('profit_percentage', parseFloat(e.target.value) || 0)}
                      disabled={!editing} />

                  </div>
                  <div>
                    <Label>Rentabilidade (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.best_month_history.rentability_percentage}
                      onChange={(e) => updateBestMonth('rentability_percentage', parseFloat(e.target.value) || 0)}
                      disabled={!editing} />

                  </div>
                </div>
              </div>

              {/* R70/I30 e TCMP2 */}
              <div className="bg-white p-4 rounded-lg border-2 border-green-200">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-green-900">💰 Indicadores Financeiros</h4>
                  {editing &&
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={loadTCMP2FromDRE}
                    disabled={loadingTCMP2}
                    className="border-green-400">

                      {loadingTCMP2 ?
                    <>Carregando...</> :

                    <>
                          <Download className="w-4 h-4 mr-2" />
                          Puxar TCMP2 do DRE
                        </>
                    }
                    </Button>
                  }
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>R70 (%)</Label>
                    <Input
                      type="number"
                      value={formData.best_month_history.r70_i30?.r70 || 70}
                      onChange={(e) => setFormData({
                        ...formData,
                        best_month_history: {
                          ...formData.best_month_history,
                          r70_i30: { ...formData.best_month_history.r70_i30, r70: parseFloat(e.target.value) || 70 }
                        }
                      })}
                      disabled={!editing} />

                  </div>
                  <div>
                    <Label>I30 (%)</Label>
                    <Input
                      type="number"
                      value={formData.best_month_history.r70_i30?.i30 || 30}
                      onChange={(e) => setFormData({
                        ...formData,
                        best_month_history: {
                          ...formData.best_month_history,
                          r70_i30: { ...formData.best_month_history.r70_i30, i30: parseFloat(e.target.value) || 30 }
                        }
                      })}
                      disabled={!editing} />

                  </div>
                  <div>
                    <Label className="flex items-center gap-2">
                      TCMP2 (R$)
                      <span className="text-xs text-gray-500 font-normal">- Automático do DRE</span>
                    </Label>
                    <Input
                      type="number"
                      value={formData.best_month_history.tcmp2}
                      onChange={(e) => updateBestMonth('tcmp2', parseFloat(e.target.value) || 0)}
                      disabled={!editing}
                      placeholder="Clique em 'Puxar TCMP2'"
                      className={formData.best_month_history.tcmp2 > 0 ? "bg-green-50 font-bold" : ""} />

                  </div>
                </div>
                <div className="mt-3 p-2 bg-green-50 rounded border border-green-200">
                  <p className="text-xs text-green-800">
                    💡 <strong>TCMP2:</strong> Será calculado automaticamente como a média dos valores de TCMP2 registrados nos DREs mensais da oficina.
                  </p>
                </div>
              </div>

              {/* Comercial */}
              <div className="bg-white p-4 rounded-lg border-2 border-purple-200">
                <h4 className="font-semibold text-purple-900 mb-4">🎯 Comercial</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label>PAVE - Comercial (qtd)</Label>
                    <Input
                      type="number"
                      value={formData.best_month_history.pave_commercial}
                      onChange={(e) => updateBestMonth('pave_commercial', parseInt(e.target.value) || 0)}
                      disabled={!editing} />

                  </div>
                  <div>
                    <Label>Kit Master (qtd)</Label>
                    <Input
                      type="number"
                      value={formData.best_month_history.kit_master}
                      onChange={(e) => updateBestMonth('kit_master', parseInt(e.target.value) || 0)}
                      disabled={!editing} />

                  </div>
                </div>
                
                {/* Clientes Base */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Clientes Agendados Base (QTD)</Label>
                    <Input
                      type="number"
                      value={formData.best_month_history.clients_scheduled_base}
                      onChange={(e) => updateBestMonth('clients_scheduled_base', parseInt(e.target.value) || 0)}
                      disabled={!editing} />

                  </div>
                  <div>
                    <Label>Clientes Entregues Base (QTD)</Label>
                    <Input
                      type="number"
                      value={formData.best_month_history.clients_delivered_base}
                      onChange={(e) => updateBestMonth('clients_delivered_base', parseInt(e.target.value) || 0)}
                      disabled={!editing} />

                  </div>
                  <div>
                    <Label>Vendas Clientes Base (R$)</Label>
                    <Input
                      type="number"
                      value={formData.best_month_history.sales_base}
                      onChange={(e) => updateBestMonth('sales_base', parseFloat(e.target.value) || 0)}
                      disabled={!editing} />

                  </div>
                </div>

                {/* Clientes Marketing */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Clientes Agendados Marketing (qtd)</Label>
                    <Input
                      type="number"
                      value={formData.best_month_history.clients_scheduled_mkt}
                      onChange={(e) => updateBestMonth('clients_scheduled_mkt', parseInt(e.target.value) || 0)}
                      disabled={!editing} />

                  </div>
                  <div>
                    <Label>Clientes Entregues Marketing (qtd)</Label>
                    <Input
                      type="number"
                      value={formData.best_month_history.clients_delivered_mkt}
                      onChange={(e) => updateBestMonth('clients_delivered_mkt', parseInt(e.target.value) || 0)}
                      disabled={!editing} />

                  </div>
                  <div>
                    <Label>Vendas Lead Marketing (R$)</Label>
                    <Input
                      type="number"
                      value={formData.best_month_history.sales_marketing}
                      onChange={(e) => updateBestMonth('sales_marketing', parseFloat(e.target.value) || 0)}
                      disabled={!editing} />

                  </div>
                </div>

                {/* Clientes Indicação */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Clientes Agendados Indicação (qtd)</Label>
                    <Input
                      type="number"
                      value={formData.best_month_history.clients_scheduled_referral}
                      onChange={(e) => updateBestMonth('clients_scheduled_referral', parseInt(e.target.value) || 0)}
                      disabled={!editing} />

                  </div>
                  <div>
                    <Label>Clientes Entregues Indicação (qtd)</Label>
                    <Input
                      type="number"
                      value={formData.best_month_history.clients_delivered_referral}
                      onChange={(e) => updateBestMonth('clients_delivered_referral', parseInt(e.target.value) || 0)}
                      disabled={!editing} />

                  </div>
                </div>

                {/* Valor Faturado Total */}
                <div className="mt-4">
                  <Label>Valor Faturado Total (Auto - Soma das Vendas)</Label>
                  <Input
                    value={formatCurrency((formData.best_month_history.sales_base || 0) + (formData.best_month_history.sales_marketing || 0))}
                    disabled
                    className="bg-purple-100 font-bold text-purple-700" />

                  <p className="text-xs text-gray-500 mt-1">Vendas Base + Vendas Marketing</p>
                </div>
              </div>

              {/* Marketing */}
              <div className="bg-white p-4 rounded-lg border-2 border-pink-200">
                <h4 className="font-semibold text-pink-900 mb-4">📣 Marketing</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label>Lead Gerados (qtd)</Label>
                    <Input
                      type="number"
                      value={formData.best_month_history.marketing?.leads_generated || 0}
                      onChange={(e) => updateMarketing('leads_generated', parseInt(e.target.value) || 0)}
                      disabled={!editing} />

                  </div>
                  <div>
                    <Label>Lead Agendados (qtd)</Label>
                    <Input
                      type="number"
                      value={formData.best_month_history.marketing?.leads_scheduled || 0}
                      onChange={(e) => updateMarketing('leads_scheduled', parseInt(e.target.value) || 0)}
                      disabled={!editing} />

                  </div>
                  <div>
                    <Label>Comparecimentos (qtd)</Label>
                    <Input
                      type="number"
                      value={formData.best_month_history.marketing?.leads_showed_up || 0}
                      onChange={(e) => updateMarketing('leads_showed_up', parseInt(e.target.value) || 0)}
                      disabled={!editing} />

                  </div>
                  <div>
                    <Label>Lead Vendas (qtd)</Label>
                    <Input
                      type="number"
                      value={formData.best_month_history.marketing?.leads_sold || 0}
                      onChange={(e) => updateMarketing('leads_sold', parseInt(e.target.value) || 0)}
                      disabled={!editing} />

                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <Label>Valor Investido (Tráfego) R$</Label>
                    <Input
                      type="number"
                      value={formData.best_month_history.marketing?.invested_value || 0}
                      onChange={(e) => updateMarketing('invested_value', parseFloat(e.target.value) || 0)}
                      disabled={!editing} />

                  </div>
                  <div>
                    <Label>Valor Faturado Lead Tráfego (R$)</Label>
                    <Input
                      type="number"
                      value={formData.best_month_history.marketing?.revenue_from_traffic || 0}
                      onChange={(e) => updateMarketing('revenue_from_traffic', parseFloat(e.target.value) || 0)}
                      disabled={!editing} />

                  </div>
                  <div>
                    <Label>Custo por Venda (Auto)</Label>
                    <Input
                      value={formatCurrency(formData.best_month_history.marketing?.cost_per_sale || 0)}
                      disabled
                      className="bg-pink-100 font-bold text-pink-700" />

                  </div>
                </div>
              </div>

              {/* Detalhamento PF x PJ */}
              {formData.serves_fleet_insurance &&
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
                        className="h-9" />

                      </div>
                      <div>
                        <Label className="text-xs">Fat. Serviços (R$)</Label>
                        <Input
                        type="number"
                        value={formData.best_month_history.physical_person?.revenue_services || 0}
                        onChange={(e) => updatePhysicalPerson('revenue_services', parseFloat(e.target.value) || 0)}
                        disabled={!editing}
                        className="h-9" />

                      </div>
                      <div>
                        <Label className="text-xs">Clientes</Label>
                        <Input
                        type="number"
                        value={formData.best_month_history.physical_person?.customer_volume || 0}
                        onChange={(e) => updatePhysicalPerson('customer_volume', parseInt(e.target.value) || 0)}
                        disabled={!editing}
                        className="h-9" />

                      </div>
                      <div>
                        <Label className="text-xs">Total</Label>
                        <Input
                        value={formatCurrency(formData.best_month_history.physical_person?.revenue_total || 0)}
                        disabled
                        className="h-9 bg-blue-100" />

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
                        className="h-9" />

                      </div>
                      <div>
                        <Label className="text-xs">Fat. Serviços (R$)</Label>
                        <Input
                        type="number"
                        value={formData.best_month_history.juridical_person?.revenue_services || 0}
                        onChange={(e) => updateJuridicalPerson('revenue_services', parseFloat(e.target.value) || 0)}
                        disabled={!editing}
                        className="h-9" />

                      </div>
                      <div>
                        <Label className="text-xs">Clientes</Label>
                        <Input
                        type="number"
                        value={formData.best_month_history.juridical_person?.customer_volume || 0}
                        onChange={(e) => updateJuridicalPerson('customer_volume', parseInt(e.target.value) || 0)}
                        disabled={!editing}
                        className="h-9" />

                      </div>
                      <div>
                        <Label className="text-xs">Total</Label>
                        <Input
                        value={formatCurrency(formData.best_month_history.juridical_person?.revenue_total || 0)}
                        disabled
                        className="h-9 bg-purple-100" />

                      </div>
                    </div>
                  </div>
                </div>
              }

              {/* Resumo */}
              {formData.best_month_history.date && formData.best_month_history.revenue_total > 0 &&
              <div className="bg-orange-100 rounded-lg p-4 border-2 border-orange-300">
                  <p className="text-sm text-orange-900 font-semibold mb-2">
                    📊 Resumo - Referência para Metas Mensais
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
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
                      <p className="text-orange-700">Ticket Médio:</p>
                      <p className="font-bold text-orange-900">{formatCurrency(formData.best_month_history.average_ticket)}</p>
                    </div>
                    <div>
                      <p className="text-orange-700">Clientes:</p>
                      <p className="font-bold text-orange-900">{formData.best_month_history.customer_volume}</p>
                    </div>
                  </div>
                </div>
              }
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
                  <p className="text-xs text-gray-500 mt-1">Alimentado pelo histórico</p>
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

              {/* Espelhamento completo do Melhor Mês */}
              <div className="mt-6 space-y-4">
                <div className="bg-gradient-to-r from-blue-100 to-purple-100 p-4 rounded-lg border-2 border-blue-300">
                  <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    📋 Valores PREVISTOS (Melhor Mês + {growthPercentage.toFixed(1)}% de Crescimento)
                  </h3>
                  <p className="text-sm text-blue-800">
                    Todos os valores abaixo são calculados automaticamente: <strong>Melhor Mês × (1 + {growthPercentage}%)</strong>
                  </p>
                </div>
                
                {/* Dados Principais - PREVISTO x REALIZADO */}
                <div className="bg-white p-4 rounded-lg border-2 border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-3">📊 Dados Principais - Previsto x Realizado</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Faturamento Peças */}
                    <div className="border-l-4 border-blue-500 pl-3">
                      <p className="text-xs text-gray-600 mb-2">Faturamento Peças</p>
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <p className="text-xs text-blue-600 mb-1">PREVISTO</p>
                          <p className="text-lg font-bold text-blue-600">
                            R$ {formatCurrency((formData.best_month_history.revenue_parts || 0) * (1 + growthPercentage / 100))}
                          </p>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-green-600 mb-1">REALIZADO</p>
                          <p className="text-lg font-bold text-green-600">
                            R$ {formatCurrency(formData.monthly_goals?.revenue_parts || 0)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Faturamento Serviços */}
                    <div className="border-l-4 border-green-500 pl-3">
                      <p className="text-xs text-gray-600 mb-2">Faturamento Serviços</p>
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <p className="text-xs text-blue-600 mb-1">PREVISTO</p>
                          <p className="text-lg font-bold text-blue-600">
                            R$ {formatCurrency((formData.best_month_history.revenue_services || 0) * (1 + growthPercentage / 100))}
                          </p>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-green-600 mb-1">REALIZADO</p>
                          <p className="text-lg font-bold text-green-600">
                            R$ {formatCurrency(formData.monthly_goals?.revenue_services || 0)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Clientes */}
                    <div className="border-l-4 border-purple-500 pl-3">
                      <p className="text-xs text-gray-600 mb-2">Clientes (qtd)</p>
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <p className="text-xs text-blue-600 mb-1">PREVISTO</p>
                          <p className="text-lg font-bold text-blue-600">
                            {Math.round((formData.best_month_history.customer_volume || 0) * (1 + growthPercentage / 100))}
                          </p>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-green-600 mb-1">REALIZADO</p>
                          <p className="text-lg font-bold text-green-600">
                            {formData.monthly_goals?.customer_volume || 0}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Ticket Médio */}
                    <div className="border-l-4 border-orange-500 pl-3">
                      <p className="text-xs text-gray-600 mb-2">Ticket Médio</p>
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <p className="text-xs text-blue-600 mb-1">PREVISTO</p>
                          <p className="text-lg font-bold text-blue-600">
                            R$ {formatCurrency((formData.best_month_history.average_ticket || 0) * (1 + growthPercentage / 100))}
                          </p>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-green-600 mb-1">REALIZADO</p>
                          <p className="text-lg font-bold text-green-600">
                            R$ {formatCurrency(formData.monthly_goals?.average_ticket || 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Lucro (%)</p>
                      <p className="text-lg font-bold text-green-600">
                        {formatNumber((formData.best_month_history.profit_percentage || 0) * (1 + growthPercentage / 100), 1)}%
                      </p>
                      <p className="text-xs text-gray-500">Base: {formatNumber(formData.best_month_history.profit_percentage || 0, 1)}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Rentabilidade (%)</p>
                      <p className="text-lg font-bold text-blue-600">
                        {formatNumber((formData.best_month_history.rentability_percentage || 0) * (1 + growthPercentage / 100), 1)}%
                      </p>
                      <p className="text-xs text-gray-500">Base: {formatNumber(formData.best_month_history.rentability_percentage || 0, 1)}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Ticket Médio Peças</p>
                      <p className="text-lg font-bold text-blue-600">
                        R$ {formatCurrency((formData.best_month_history.average_ticket_parts || 0) * (1 + growthPercentage / 100))}
                      </p>
                      <p className="text-xs text-gray-500">Base: {formatCurrency(formData.best_month_history.average_ticket_parts || 0)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Ticket Médio Serviços</p>
                      <p className="text-lg font-bold text-green-600">
                        R$ {formatCurrency((formData.best_month_history.average_ticket_services || 0) * (1 + growthPercentage / 100))}
                      </p>
                      <p className="text-xs text-gray-500">Base: {formatCurrency(formData.best_month_history.average_ticket_services || 0)}</p>
                    </div>
                  </div>
                </div>

                {/* Indicadores Financeiros */}
                <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                  <h4 className="font-semibold text-green-900 mb-3">💰 Indicadores Financeiros</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">R70 (%)</p>
                      <p className="text-lg font-bold text-green-600">
                        {formatNumber((formData.best_month_history.r70_i30?.r70 || 70) * (1 + growthPercentage / 100), 1)}%
                      </p>
                      <p className="text-xs text-gray-500">Base: {formatNumber(formData.best_month_history.r70_i30?.r70 || 70, 1)}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">I30 (%)</p>
                      <p className="text-lg font-bold text-orange-600">
                        {formatNumber((formData.best_month_history.r70_i30?.i30 || 30) * (1 + growthPercentage / 100), 1)}%
                      </p>
                      <p className="text-xs text-gray-500">Base: {formatNumber(formData.best_month_history.r70_i30?.i30 || 30, 1)}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">TCMP2 (R$)</p>
                      <p className="text-lg font-bold text-green-600">
                        R$ {formatCurrency((formData.best_month_history.tcmp2 || 0) * (1 + growthPercentage / 100))}
                      </p>
                      <p className="text-xs text-gray-500">Base: {formatCurrency(formData.best_month_history.tcmp2 || 0)}</p>
                    </div>
                  </div>
                </div>

                {/* Comercial */}
                <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200">
                  <h4 className="font-semibold text-purple-900 mb-3">🎯 Comercial</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="border-l-4 border-purple-500 pl-3">
                      <p className="text-xs text-gray-600 mb-2">PAVE - Comercial (qtd)</p>
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <p className="text-xs text-blue-600 mb-1">PROJETADO</p>
                          <p className="text-lg font-bold text-blue-600">
                            {formatInteger((formData.best_month_history.pave_commercial || 0) * (1 + growthPercentage / 100))}
                          </p>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-green-600 mb-1">REALIZADO</p>
                          <p className="text-lg font-bold text-green-600">
                            {formatInteger(formData.monthly_goals?.pave_commercial || 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="border-l-4 border-purple-500 pl-3">
                      <p className="text-xs text-gray-600 mb-2">Kit Master (qtd)</p>
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <p className="text-xs text-blue-600 mb-1">PROJETADO</p>
                          <p className="text-lg font-bold text-blue-600">
                            {formatInteger((formData.best_month_history.kit_master || 0) * (1 + growthPercentage / 100))}
                          </p>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-green-600 mb-1">REALIZADO</p>
                          <p className="text-lg font-bold text-green-600">
                            {formatInteger(formData.monthly_goals?.kit_master || 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Clientes Base */}
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 bg-blue-50 p-3 rounded-lg">
                    <div className="border-l-4 border-blue-500 pl-3">
                      <p className="text-xs text-blue-700 mb-2">Clientes Agendados Base (QTD)</p>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <p className="text-xs text-blue-600 mb-1">PROJ.</p>
                          <p className="text-lg font-bold text-blue-600">
                            {formatInteger((formData.best_month_history.clients_scheduled_base || 0) * (1 + growthPercentage / 100))}
                          </p>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-green-600 mb-1">REAL.</p>
                          <p className="text-lg font-bold text-green-600">
                            {formatInteger(formData.monthly_goals?.clients_scheduled_base || 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="border-l-4 border-blue-500 pl-3">
                      <p className="text-xs text-blue-700 mb-2">Clientes Entregues Base (QTD)</p>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <p className="text-xs text-blue-600 mb-1">PROJ.</p>
                          <p className="text-lg font-bold text-blue-600">
                            {formatInteger((formData.best_month_history.clients_delivered_base || 0) * (1 + growthPercentage / 100))}
                          </p>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-green-600 mb-1">REAL.</p>
                          <p className="text-lg font-bold text-green-600">
                            {formatInteger(formData.monthly_goals?.clients_delivered_base || 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="border-l-4 border-blue-500 pl-3">
                      <p className="text-xs text-blue-700 mb-2">Vendas Clientes Base (R$)</p>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <p className="text-xs text-blue-600 mb-1">PROJ.</p>
                          <p className="text-lg font-bold text-blue-600">
                            R$ {formatCurrency((formData.best_month_history.sales_base || 0) * (1 + growthPercentage / 100))}
                          </p>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-green-600 mb-1">REAL.</p>
                          <p className="text-lg font-bold text-green-600">
                            R$ {formatCurrency(formData.monthly_goals?.sales_base || 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Clientes Marketing */}
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 bg-pink-50 p-3 rounded-lg">
                    <div className="border-l-4 border-pink-500 pl-3">
                      <p className="text-xs text-pink-700 mb-2">Clientes Agendados Marketing (qtd)</p>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <p className="text-xs text-blue-600 mb-1">PROJ.</p>
                          <p className="text-lg font-bold text-blue-600">
                            {formatInteger((formData.best_month_history.clients_scheduled_mkt || 0) * (1 + growthPercentage / 100))}
                          </p>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-green-600 mb-1">REAL.</p>
                          <p className="text-lg font-bold text-green-600">
                            {formatInteger(formData.monthly_goals?.clients_scheduled_mkt || 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="border-l-4 border-pink-500 pl-3">
                      <p className="text-xs text-pink-700 mb-2">Clientes Entregues Marketing (qtd)</p>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <p className="text-xs text-blue-600 mb-1">PROJ.</p>
                          <p className="text-lg font-bold text-blue-600">
                            {formatInteger((formData.best_month_history.clients_delivered_mkt || 0) * (1 + growthPercentage / 100))}
                          </p>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-green-600 mb-1">REAL.</p>
                          <p className="text-lg font-bold text-green-600">
                            {formatInteger(formData.monthly_goals?.clients_delivered_mkt || 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="border-l-4 border-pink-500 pl-3">
                      <p className="text-xs text-pink-700 mb-2">Vendas Lead Marketing (R$)</p>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <p className="text-xs text-blue-600 mb-1">PROJ.</p>
                          <p className="text-lg font-bold text-blue-600">
                            R$ {formatCurrency((formData.best_month_history.sales_marketing || 0) * (1 + growthPercentage / 100))}
                          </p>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-green-600 mb-1">REAL.</p>
                          <p className="text-lg font-bold text-green-600">
                            R$ {formatCurrency(formData.monthly_goals?.sales_marketing || 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Clientes Indicação */}
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-2 gap-4 bg-orange-50 p-3 rounded-lg">
                    <div>
                      <p className="text-xs text-orange-700 mb-1">Clientes Agendados Indicação (qtd)</p>
                      <p className="text-lg font-bold text-orange-600">
                        {formatInteger((formData.best_month_history.clients_scheduled_referral || 0) * (1 + growthPercentage / 100))}
                      </p>
                      <p className="text-xs text-gray-500">Base: {formatInteger(formData.best_month_history.clients_scheduled_referral || 0)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-orange-700 mb-1">Clientes Entregues Indicação (qtd)</p>
                      <p className="text-lg font-bold text-orange-600">
                        {formatInteger((formData.best_month_history.clients_delivered_referral || 0) * (1 + growthPercentage / 100))}
                      </p>
                      <p className="text-xs text-gray-500">Base: {formatInteger(formData.best_month_history.clients_delivered_referral || 0)}</p>
                    </div>
                  </div>

                  {/* Valor Faturado Total */}
                  <div className="mt-4">
                    <Label>Valor Faturado Total (Auto - Soma das Vendas)</Label>
                    <Input
                      value={formatCurrency((formData.best_month_history.sales_base || 0) + (formData.best_month_history.sales_marketing || 0))}
                      disabled
                      className="bg-purple-100 font-bold text-purple-700" />

                    <p className="text-xs text-gray-500 mt-1">Vendas Base + Vendas Marketing</p>
                  </div>
                </div>

                {/* Marketing */}
                <div className="bg-pink-50 p-4 rounded-lg border-2 border-pink-200">
                  <h4 className="font-semibold text-pink-900 mb-3">📣 Marketing</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="border-l-4 border-pink-500 pl-3">
                      <p className="text-xs text-gray-600 mb-2">Leads Gerados (qtd)</p>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <p className="text-xs text-blue-600 mb-1">PROJ.</p>
                          <p className="text-lg font-bold text-blue-600">
                            {Math.round((formData.best_month_history.marketing?.leads_generated || 0) * (1 + growthPercentage / 100))}
                          </p>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-green-600 mb-1">REAL.</p>
                          <p className="text-lg font-bold text-green-600">
                            {Math.round(formData.monthly_goals?.marketing?.leads_generated || 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="border-l-4 border-pink-500 pl-3">
                      <p className="text-xs text-gray-600 mb-2">Leads Agendados (qtd)</p>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <p className="text-xs text-blue-600 mb-1">PROJ.</p>
                          <p className="text-lg font-bold text-blue-600">
                            {Math.round((formData.best_month_history.marketing?.leads_scheduled || 0) * (1 + growthPercentage / 100))}
                          </p>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-green-600 mb-1">REAL.</p>
                          <p className="text-lg font-bold text-green-600">
                            {Math.round(formData.monthly_goals?.marketing?.leads_scheduled || 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="border-l-4 border-pink-500 pl-3">
                      <p className="text-xs text-gray-600 mb-2">Comparecimentos (qtd)</p>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <p className="text-xs text-blue-600 mb-1">PROJ.</p>
                          <p className="text-lg font-bold text-blue-600">
                            {Math.round((formData.best_month_history.marketing?.leads_showed_up || 0) * (1 + growthPercentage / 100))}
                          </p>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-green-600 mb-1">REAL.</p>
                          <p className="text-lg font-bold text-green-600">
                            {Math.round(formData.monthly_goals?.marketing?.leads_showed_up || 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="border-l-4 border-pink-500 pl-3">
                      <p className="text-xs text-gray-600 mb-2">Leads Vendidos (qtd)</p>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <p className="text-xs text-blue-600 mb-1">PROJ.</p>
                          <p className="text-lg font-bold text-blue-600">
                            {Math.round((formData.best_month_history.marketing?.leads_sold || 0) * (1 + growthPercentage / 100))}
                          </p>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-green-600 mb-1">REAL.</p>
                          <p className="text-lg font-bold text-green-600">
                            {Math.round(formData.monthly_goals?.marketing?.leads_sold || 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="border-l-4 border-pink-500 pl-3">
                      <p className="text-xs text-gray-600 mb-2">Valor Investido (R$)</p>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <p className="text-xs text-blue-600 mb-1">PROJ.</p>
                          <p className="text-lg font-bold text-blue-600">
                            R$ {formatCurrency((formData.best_month_history.marketing?.invested_value || 0) * (1 + growthPercentage / 100))}
                          </p>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-green-600 mb-1">REAL.</p>
                          <p className="text-lg font-bold text-green-600">
                            R$ {formatCurrency(formData.monthly_goals?.marketing?.invested_value || 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="border-l-4 border-pink-500 pl-3">
                      <p className="text-xs text-gray-600 mb-2">Valor Faturado Tráfego (R$)</p>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <p className="text-xs text-blue-600 mb-1">PROJ.</p>
                          <p className="text-lg font-bold text-blue-600">
                            R$ {formatCurrency((formData.best_month_history.marketing?.revenue_from_traffic || 0) * (1 + growthPercentage / 100))}
                          </p>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-green-600 mb-1">REAL.</p>
                          <p className="text-lg font-bold text-green-600">
                            R$ {formatCurrency(formData.monthly_goals?.marketing?.revenue_from_traffic || 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="border-l-4 border-pink-500 pl-3">
                      <p className="text-xs text-gray-600 mb-2">Custo por Venda (R$)</p>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <p className="text-xs text-blue-600 mb-1">PROJ.</p>
                          <p className="text-lg font-bold text-blue-600">
                            R$ {formatCurrency((formData.best_month_history.marketing?.cost_per_sale || 0) * (1 + growthPercentage / 100))}
                          </p>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-green-600 mb-1">REAL.</p>
                          <p className="text-lg font-bold text-green-600">
                            R$ {formatCurrency(formData.monthly_goals?.marketing?.cost_per_sale || 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* PF x PJ (se aplicável) */}
                {formData.serves_fleet_insurance &&
                <>
                    <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                      <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Pessoa Física
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Fat. Peças (R$)</p>
                          <p className="text-lg font-bold text-blue-600">
                            R$ {formatCurrency((formData.best_month_history.physical_person?.revenue_parts || 0) * (1 + growthPercentage / 100))}
                          </p>
                          <p className="text-xs text-gray-500">Base: {formatCurrency(formData.best_month_history.physical_person?.revenue_parts || 0)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Fat. Serviços (R$)</p>
                          <p className="text-lg font-bold text-blue-600">
                            R$ {formatCurrency((formData.best_month_history.physical_person?.revenue_services || 0) * (1 + growthPercentage / 100))}
                          </p>
                          <p className="text-xs text-gray-500">Base: {formatCurrency(formData.best_month_history.physical_person?.revenue_services || 0)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Clientes (qtd)</p>
                          <p className="text-lg font-bold text-blue-600">
                            {Math.round((formData.best_month_history.physical_person?.customer_volume || 0) * (1 + growthPercentage / 100))}
                          </p>
                          <p className="text-xs text-gray-500">Base: {formData.best_month_history.physical_person?.customer_volume || 0}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Total (R$)</p>
                          <p className="text-lg font-bold text-blue-600">
                            R$ {formatCurrency((formData.best_month_history.physical_person?.revenue_total || 0) * (1 + growthPercentage / 100))}
                          </p>
                          <p className="text-xs text-gray-500">Base: {formatCurrency(formData.best_month_history.physical_person?.revenue_total || 0)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200">
                      <h4 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Pessoa Jurídica (Locadora/Seguradora)
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Fat. Peças (R$)</p>
                          <p className="text-lg font-bold text-purple-600">
                            R$ {formatCurrency((formData.best_month_history.juridical_person?.revenue_parts || 0) * (1 + growthPercentage / 100))}
                          </p>
                          <p className="text-xs text-gray-500">Base: {formatCurrency(formData.best_month_history.juridical_person?.revenue_parts || 0)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Fat. Serviços (R$)</p>
                          <p className="text-lg font-bold text-purple-600">
                            R$ {formatCurrency((formData.best_month_history.juridical_person?.revenue_services || 0) * (1 + growthPercentage / 100))}
                          </p>
                          <p className="text-xs text-gray-500">Base: {formatCurrency(formData.best_month_history.juridical_person?.revenue_services || 0)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Clientes (qtd)</p>
                          <p className="text-lg font-bold text-purple-600">
                            {Math.round((formData.best_month_history.juridical_person?.customer_volume || 0) * (1 + growthPercentage / 100))}
                          </p>
                          <p className="text-xs text-gray-500">Base: {formData.best_month_history.juridical_person?.customer_volume || 0}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Total (R$)</p>
                          <p className="text-lg font-bold text-purple-600">
                            R$ {formatCurrency((formData.best_month_history.juridical_person?.revenue_total || 0) * (1 + growthPercentage / 100))}
                          </p>
                          <p className="text-xs text-gray-500">Base: {formatCurrency(formData.best_month_history.juridical_person?.revenue_total || 0)}</p>
                        </div>
                      </div>
                    </div>
                  </>
                }
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-800">💡 Como funciona: A meta PROJETADA é calculada automaticamente (Melhor Mês + % Crescimento). O valor REALIZADO é atualizado automaticamente pelo sistema conforme registros são feitos no Histórico de Produção Diária.


                </p>
              </div>
            </CardContent>
          </Card>

          {/* Botão Histórico da Produção Diária */}
          <Card className="shadow-lg border-2 border-blue-200">
            <CardContent className="p-6">
              <Button
                variant="outline"
                onClick={() => navigate(createPageUrl("HistoricoMetas"))}
                className="w-full h-16 text-lg bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-2 border-blue-300">
                <FileText className="w-5 h-5 mr-2" />
                Histórico da Produção Diária
              </Button>
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
                className="w-full bg-blue-600 hover:bg-blue-700">

                <Users className="w-4 h-4 mr-2" />
                Abrir Desdobramento de Metas
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>);

}