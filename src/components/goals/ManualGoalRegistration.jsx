import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Building2, User, Target, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export default function ManualGoalRegistration({ open, onClose, workshop, onSave }) {
  const [entityType, setEntityType] = useState("workshop");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState({
    reference_date: new Date().toISOString().split('T')[0],
    month: new Date().toISOString().substring(0, 7),
    projected_total: 0,
    achieved_total: 0,
    revenue_parts: 0,
    revenue_services: 0,
    customer_volume: 0,
    pave_commercial: 0,
    kit_master: 0,
    sales_base: 0,
    sales_marketing: 0,
    clients_delivered: 0,
    clients_scheduled_base: 0,
    clients_delivered_base: 0,
    clients_scheduled_mkt: 0,
    clients_delivered_mkt: 0,
    clients_scheduled_referral: 0,
    clients_delivered_referral: 0,
    marketing_data: {
      leads_generated: 0,
      leads_scheduled: 0,
      leads_showed_up: 0,
      leads_sold: 0,
      invested_value: 0,
      revenue_from_traffic: 0
    },
    rework_count: 0,
    notes: ""
  });

  useEffect(() => {
    if (open) {
      loadEmployees();
      loadProjectedGoals();
    }
  }, [open, entityType, selectedEmployee]);

  const loadEmployees = async () => {
    if (!workshop) return;
    try {
      const result = await base44.entities.Employee.filter({ 
        workshop_id: workshop.id,
        status: "ativo"
      });
      setEmployees(result);
    } catch (error) {
      console.error("Error loading employees:", error);
    }
  };

  const loadProjectedGoals = () => {
    if (entityType === "workshop") {
      const bestMonth = workshop?.best_month_history || {};
      const growthPercentage = workshop?.monthly_goals?.growth_percentage || 10;
      const projectedRevenue = (bestMonth.revenue_total || 0) * (1 + growthPercentage / 100);
      
      setFormData(prev => ({
        ...prev,
        projected_total: projectedRevenue,
        revenue_parts: bestMonth.revenue_parts || 0,
        revenue_services: bestMonth.revenue_services || 0,
        customer_volume: bestMonth.customer_volume || 0,
        pave_commercial: bestMonth.pave_commercial || 0,
        kit_master: bestMonth.kit_master || 0,
        sales_base: bestMonth.sales_base || 0,
        sales_marketing: bestMonth.sales_marketing || 0,
        clients_delivered: bestMonth.clients_delivered || 0,
        marketing_data: bestMonth.marketing || {
          leads_generated: 0,
          leads_scheduled: 0,
          leads_showed_up: 0,
          leads_sold: 0,
          invested_value: 0,
          revenue_from_traffic: 0
        }
      }));
    } else if (selectedEmployee) {
      const bestMonth = selectedEmployee.best_month_history || {};
      const growthPercentage = selectedEmployee.monthly_goals?.growth_percentage || 10;
      const projectedRevenue = (bestMonth.revenue_total || 0) * (1 + growthPercentage / 100);
      
      setFormData(prev => ({
        ...prev,
        projected_total: projectedRevenue
      }));
    }
  };

  const handleSave = async () => {
    try {
      // Calcular valores automáticos
      const revenue_total = formData.revenue_parts + formData.revenue_services;
      const average_ticket = formData.customer_volume > 0 
        ? revenue_total / formData.customer_volume 
        : 0;
      
      const marketing_cost_per_sale = formData.marketing_data.leads_sold > 0
        ? formData.marketing_data.invested_value / formData.marketing_data.leads_sold
        : 0;

      const recordData = {
        workshop_id: workshop.id,
        entity_type: entityType,
        entity_id: entityType === "workshop" ? workshop.id : selectedEmployee?.id,
        employee_id: entityType === "employee" ? selectedEmployee?.id : null,
        employee_role: entityType === "employee" ? selectedEmployee?.job_role : "geral",
        reference_date: formData.reference_date,
        month: formData.month,
        projected_total: formData.projected_total,
        achieved_total: formData.achieved_total,
        revenue_total: revenue_total,
        revenue_parts: formData.revenue_parts,
        revenue_services: formData.revenue_services,
        average_ticket: average_ticket,
        customer_volume: formData.customer_volume,
        pave_commercial: formData.pave_commercial,
        kit_master: formData.kit_master,
        sales_base: formData.sales_base,
        sales_marketing: formData.sales_marketing,
        clients_delivered: formData.clients_delivered,
        clients_scheduled_base: formData.clients_scheduled_base,
        clients_delivered_base: formData.clients_delivered_base,
        clients_scheduled_mkt: formData.clients_scheduled_mkt,
        clients_delivered_mkt: formData.clients_delivered_mkt,
        clients_scheduled_referral: formData.clients_scheduled_referral,
        clients_delivered_referral: formData.clients_delivered_referral,
        marketing_data: {
          ...formData.marketing_data,
          cost_per_sale: marketing_cost_per_sale
        },
        rework_count: formData.rework_count,
        notes: formData.notes
      };

      await base44.entities.MonthlyGoalHistory.create(recordData);

      // Atualizar campos REALIZADOS nas metas mensais
      if (entityType === "workshop") {
        await base44.entities.Workshop.update(workshop.id, {
          monthly_goals: {
            ...workshop.monthly_goals,
            actual_revenue_achieved: formData.achieved_total,
            revenue_parts: formData.revenue_parts,
            revenue_services: formData.revenue_services,
            customer_volume: formData.customer_volume,
            average_ticket: average_ticket
          }
        });
      } else if (selectedEmployee) {
        await base44.entities.Employee.update(selectedEmployee.id, {
          monthly_goals: {
            ...selectedEmployee.monthly_goals,
            actual_revenue_achieved: formData.achieved_total
          }
        });
      }

      toast.success("Registro salvo e metas atualizadas automaticamente!");
      if (onSave) onSave();
      onClose();
    } catch (error) {
      console.error("Error saving record:", error);
      toast.error("Erro ao salvar registro");
    }
  };

  // Renderizar campos baseado no tipo de entidade e função
  const renderFieldsForRole = () => {
    const role = entityType === "employee" ? selectedEmployee?.job_role : "geral";

    // Campos comuns
    const commonFields = (
      <>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Faturamento Peças (R$)</Label>
            <Input
              type="number"
              value={formData.revenue_parts}
              onChange={(e) => setFormData({...formData, revenue_parts: parseFloat(e.target.value) || 0})}
            />
          </div>
          <div>
            <Label>Faturamento Serviços (R$)</Label>
            <Input
              type="number"
              value={formData.revenue_services}
              onChange={(e) => setFormData({...formData, revenue_services: parseFloat(e.target.value) || 0})}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Faturamento Total (Auto)</Label>
            <Input
              value={(formData.revenue_parts + formData.revenue_services).toFixed(2)}
              disabled
              className="bg-gray-100 font-bold"
            />
          </div>
          <div>
            <Label>Ticket Médio (Auto)</Label>
            <Input
              value={formData.customer_volume > 0 
                ? ((formData.revenue_parts + formData.revenue_services) / formData.customer_volume).toFixed(2)
                : "0.00"}
              disabled
              className="bg-gray-100 font-bold"
            />
          </div>
        </div>

        <div>
          <Label>Clientes (qtd)</Label>
          <Input
            type="number"
            value={formData.customer_volume}
            onChange={(e) => setFormData({...formData, customer_volume: parseInt(e.target.value) || 0})}
          />
        </div>
      </>
    );

    // Campos específicos para Vendas
    if (role === "vendas" || role === "consultor_vendas") {
      return (
        <>
          {commonFields}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>PAVE - Comercial</Label>
              <Input
                type="number"
                value={formData.pave_commercial}
                onChange={(e) => setFormData({...formData, pave_commercial: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div>
              <Label>Kit Master (qtd)</Label>
              <Input
                type="number"
                value={formData.kit_master}
                onChange={(e) => setFormData({...formData, kit_master: parseFloat(e.target.value) || 0})}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Vendas Lead Marketing (R$)</Label>
              <Input
                type="number"
                value={formData.sales_marketing}
                onChange={(e) => setFormData({...formData, sales_marketing: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div>
              <Label>Vendas Clientes Base (R$)</Label>
              <Input
                type="number"
                value={formData.sales_base}
                onChange={(e) => setFormData({...formData, sales_base: parseFloat(e.target.value) || 0})}
              />
            </div>
          </div>
        </>
      );
    }

    // Campos específicos para Comercial
    if (role === "comercial") {
      return (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>PAVE - Comercial</Label>
              <Input
                type="number"
                value={formData.pave_commercial}
                onChange={(e) => setFormData({...formData, pave_commercial: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div>
              <Label>Kit Master (qtd)</Label>
              <Input
                type="number"
                value={formData.kit_master}
                onChange={(e) => setFormData({...formData, kit_master: parseFloat(e.target.value) || 0})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Clientes Agendados Base (qtd)</Label>
              <Input
                type="number"
                value={formData.clients_scheduled_base}
                onChange={(e) => setFormData({...formData, clients_scheduled_base: parseInt(e.target.value) || 0})}
              />
            </div>
            <div>
              <Label>Clientes Entregues Base (qtd)</Label>
              <Input
                type="number"
                value={formData.clients_delivered_base}
                onChange={(e) => setFormData({...formData, clients_delivered_base: parseInt(e.target.value) || 0})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Clientes Agendados Marketing (qtd)</Label>
              <Input
                type="number"
                value={formData.clients_scheduled_mkt}
                onChange={(e) => setFormData({...formData, clients_scheduled_mkt: parseInt(e.target.value) || 0})}
              />
            </div>
            <div>
              <Label>Clientes Entregues Marketing (qtd)</Label>
              <Input
                type="number"
                value={formData.clients_delivered_mkt}
                onChange={(e) => setFormData({...formData, clients_delivered_mkt: parseInt(e.target.value) || 0})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Clientes Agendados Indicação (qtd)</Label>
              <Input
                type="number"
                value={formData.clients_scheduled_referral}
                onChange={(e) => setFormData({...formData, clients_scheduled_referral: parseInt(e.target.value) || 0})}
              />
            </div>
            <div>
              <Label>Clientes Entregues Indicação (qtd)</Label>
              <Input
                type="number"
                value={formData.clients_delivered_referral}
                onChange={(e) => setFormData({...formData, clients_delivered_referral: parseInt(e.target.value) || 0})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Vendas Clientes Base (R$)</Label>
              <Input
                type="number"
                value={formData.sales_base}
                onChange={(e) => setFormData({...formData, sales_base: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div>
              <Label>Vendas Lead Marketing (R$)</Label>
              <Input
                type="number"
                value={formData.sales_marketing}
                onChange={(e) => setFormData({...formData, sales_marketing: parseFloat(e.target.value) || 0})}
              />
            </div>
          </div>

          <div>
            <Label>Valor Faturado Total (Auto)</Label>
            <Input
              value={(formData.sales_base + formData.sales_marketing).toFixed(2)}
              disabled
              className="bg-green-100 font-bold"
            />
          </div>

          {/* Marketing Section for Comercial */}
          <Card className="bg-purple-50 border-purple-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Marketing - Indicadores</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Lead Recebidos (qtd)</Label>
                  <Input
                    type="number"
                    value={formData.marketing_data.leads_generated}
                    onChange={(e) => setFormData({
                      ...formData,
                      marketing_data: {...formData.marketing_data, leads_generated: parseInt(e.target.value) || 0}
                    })}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">Lead Agendados (qtd)</Label>
                  <Input
                    type="number"
                    value={formData.marketing_data.leads_scheduled}
                    onChange={(e) => setFormData({
                      ...formData,
                      marketing_data: {...formData.marketing_data, leads_scheduled: parseInt(e.target.value) || 0}
                    })}
                    className="h-9"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Comparecimentos (qtd)</Label>
                  <Input
                    type="number"
                    value={formData.marketing_data.leads_showed_up}
                    onChange={(e) => setFormData({
                      ...formData,
                      marketing_data: {...formData.marketing_data, leads_showed_up: parseInt(e.target.value) || 0}
                    })}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">Lead Vendas (qtd)</Label>
                  <Input
                    type="number"
                    value={formData.marketing_data.leads_sold}
                    onChange={(e) => setFormData({
                      ...formData,
                      marketing_data: {...formData.marketing_data, leads_sold: parseInt(e.target.value) || 0}
                    })}
                    className="h-9"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Valor Investido (R$)</Label>
                  <Input
                    type="number"
                    value={formData.marketing_data.invested_value}
                    onChange={(e) => setFormData({
                      ...formData,
                      marketing_data: {...formData.marketing_data, invested_value: parseFloat(e.target.value) || 0}
                    })}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">Custo por Venda (Auto)</Label>
                  <Input
                    value={(formData.marketing_data.leads_sold > 0 
                      ? formData.marketing_data.invested_value / formData.marketing_data.leads_sold 
                      : 0).toFixed(2)}
                    disabled
                    className="h-9 bg-gray-100"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      );
    }

    // Campos específicos para Técnico
    if (role === "tecnico" || role === "lider_tecnico") {
      return (
        <>
          {commonFields}
          <div>
            <Label>Retrabalho (qtd)</Label>
            <Input
              type="number"
              value={formData.rework_count}
              onChange={(e) => setFormData({...formData, rework_count: parseInt(e.target.value) || 0})}
            />
          </div>
        </>
      );
    }

    // Campos para Marketing
    if (role === "marketing") {
      return (
        <>
          <Card className="bg-purple-50 border-purple-200">
            <CardHeader>
              <CardTitle className="text-sm">Marketing - Indicadores</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Lead Gerados (qtd)</Label>
                  <Input
                    type="number"
                    value={formData.marketing_data.leads_generated}
                    onChange={(e) => setFormData({
                      ...formData,
                      marketing_data: {...formData.marketing_data, leads_generated: parseInt(e.target.value) || 0}
                    })}
                  />
                </div>
                <div>
                  <Label>Lead Agendados (qtd)</Label>
                  <Input
                    type="number"
                    value={formData.marketing_data.leads_scheduled}
                    onChange={(e) => setFormData({
                      ...formData,
                      marketing_data: {...formData.marketing_data, leads_scheduled: parseInt(e.target.value) || 0}
                    })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Comparecimentos (qtd)</Label>
                  <Input
                    type="number"
                    value={formData.marketing_data.leads_showed_up}
                    onChange={(e) => setFormData({
                      ...formData,
                      marketing_data: {...formData.marketing_data, leads_showed_up: parseInt(e.target.value) || 0}
                    })}
                  />
                </div>
                <div>
                  <Label>Lead Vendas (qtd)</Label>
                  <Input
                    type="number"
                    value={formData.marketing_data.leads_sold}
                    onChange={(e) => setFormData({
                      ...formData,
                      marketing_data: {...formData.marketing_data, leads_sold: parseInt(e.target.value) || 0}
                    })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Valor Investido (Tráfego) R$</Label>
                  <Input
                    type="number"
                    value={formData.marketing_data.invested_value}
                    onChange={(e) => setFormData({
                      ...formData,
                      marketing_data: {...formData.marketing_data, invested_value: parseFloat(e.target.value) || 0}
                    })}
                  />
                </div>
                <div>
                  <Label>Valor Faturado Lead Tráfego (R$)</Label>
                  <Input
                    type="number"
                    value={formData.marketing_data.revenue_from_traffic}
                    onChange={(e) => setFormData({
                      ...formData,
                      marketing_data: {...formData.marketing_data, revenue_from_traffic: parseFloat(e.target.value) || 0}
                    })}
                  />
                </div>
              </div>
              <div>
                <Label>Custo por Venda (Auto)</Label>
                <Input
                  value={(formData.marketing_data.leads_sold > 0 
                    ? formData.marketing_data.invested_value / formData.marketing_data.leads_sold 
                    : 0).toFixed(2)}
                  disabled
                  className="bg-gray-100 font-bold"
                />
              </div>
            </CardContent>
          </Card>
        </>
      );
    }

    // Campos para Oficina Geral
    if (entityType === "workshop") {
      return (
        <>
          {commonFields}
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>R70/I30</Label>
              <Input
                type="number"
                value={70}
                disabled
                className="bg-gray-100"
              />
            </div>
            <div>
              <Label>TCMP2 (R$)</Label>
              <Input
                type="number"
                placeholder="Puxado do DRE médio"
                disabled
                className="bg-gray-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>PAVE - Comercial</Label>
              <Input
                type="number"
                value={formData.pave_commercial}
                onChange={(e) => setFormData({...formData, pave_commercial: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div>
              <Label>Kit Master (R$)</Label>
              <Input
                type="number"
                value={formData.kit_master}
                onChange={(e) => setFormData({...formData, kit_master: parseFloat(e.target.value) || 0})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Vendas Comercial Base (R$)</Label>
              <Input
                type="number"
                value={formData.sales_base}
                onChange={(e) => setFormData({...formData, sales_base: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div>
              <Label>Vendas Lead Marketing (R$)</Label>
              <Input
                type="number"
                value={formData.sales_marketing}
                onChange={(e) => setFormData({...formData, sales_marketing: parseFloat(e.target.value) || 0})}
              />
            </div>
          </div>

          <div>
            <Label>Clientes Entregues (qtd)</Label>
            <Input
              type="number"
              value={formData.clients_delivered}
              onChange={(e) => setFormData({...formData, clients_delivered: parseInt(e.target.value) || 0})}
            />
          </div>

          <Card className="bg-purple-50 border-purple-200 mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Marketing - Indicadores</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Lead Gerados (qtd)</Label>
                  <Input
                    type="number"
                    value={formData.marketing_data.leads_generated}
                    onChange={(e) => setFormData({
                      ...formData,
                      marketing_data: {...formData.marketing_data, leads_generated: parseInt(e.target.value) || 0}
                    })}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">Lead Agendados (qtd)</Label>
                  <Input
                    type="number"
                    value={formData.marketing_data.leads_scheduled}
                    onChange={(e) => setFormData({
                      ...formData,
                      marketing_data: {...formData.marketing_data, leads_scheduled: parseInt(e.target.value) || 0}
                    })}
                    className="h-9"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Comparecimentos (qtd)</Label>
                  <Input
                    type="number"
                    value={formData.marketing_data.leads_showed_up}
                    onChange={(e) => setFormData({
                      ...formData,
                      marketing_data: {...formData.marketing_data, leads_showed_up: parseInt(e.target.value) || 0}
                    })}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">Lead Vendas (qtd)</Label>
                  <Input
                    type="number"
                    value={formData.marketing_data.leads_sold}
                    onChange={(e) => setFormData({
                      ...formData,
                      marketing_data: {...formData.marketing_data, leads_sold: parseInt(e.target.value) || 0}
                    })}
                    className="h-9"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Valor Investido (Tráfego) R$</Label>
                  <Input
                    type="number"
                    value={formData.marketing_data.invested_value}
                    onChange={(e) => setFormData({
                      ...formData,
                      marketing_data: {...formData.marketing_data, invested_value: parseFloat(e.target.value) || 0}
                    })}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">Valor Faturado Lead Tráfego (R$)</Label>
                  <Input
                    type="number"
                    value={formData.marketing_data.revenue_from_traffic}
                    onChange={(e) => setFormData({
                      ...formData,
                      marketing_data: {...formData.marketing_data, revenue_from_traffic: parseFloat(e.target.value) || 0}
                    })}
                    className="h-9"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Custo por Venda (Auto)</Label>
                <Input
                  value={(formData.marketing_data.leads_sold > 0 
                    ? formData.marketing_data.invested_value / formData.marketing_data.leads_sold 
                    : 0).toFixed(2)}
                  disabled
                  className="h-9 bg-gray-100 font-bold"
                />
              </div>
            </CardContent>
          </Card>
        </>
      );
    }

    return commonFields;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            Registrar Resultados Mensal
          </DialogTitle>
          <DialogDescription>
            Preencha os dados realizados do período. O campo "Previsto" vem automaticamente do Desdobramento de Metas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Seleção de Entidade */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Entidade</Label>
              <Select value={entityType} onValueChange={setEntityType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="workshop">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Oficina (Geral)
                    </div>
                  </SelectItem>
                  <SelectItem value="employee">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Colaborador
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {entityType === "employee" && (
              <div>
                <Label>Selecionar Colaborador</Label>
                <Select 
                  value={selectedEmployee?.id} 
                  onValueChange={(id) => {
                    const emp = employees.find(e => e.id === id);
                    setSelectedEmployee(emp);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha um colaborador..." />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.full_name} - {emp.position}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Data e Período */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Dia/Mês/Ano</Label>
              <Input
                type="date"
                value={formData.reference_date}
                onChange={(e) => setFormData({...formData, reference_date: e.target.value})}
              />
            </div>
            <div>
              <Label>Mês/Ano Referência</Label>
              <Input
                type="month"
                value={formData.month}
                onChange={(e) => setFormData({...formData, month: e.target.value})}
              />
            </div>
          </div>

          {/* Meta e Realizado */}
          <Card className="bg-green-50 border-2 border-green-200">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-green-600" />
                    PREVISTO (Meta) - R$
                  </Label>
                  <Input
                    type="number"
                    value={formData.projected_total}
                    disabled
                    className="bg-green-100 font-bold text-green-700 text-lg"
                    title="Puxado automaticamente do desdobramento de metas"
                  />
                  <p className="text-xs text-green-700 mt-1">
                    ✓ Do desdobramento + crescimento
                  </p>
                </div>
                <div>
                  <Label className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                    REALIZADO - R$
                  </Label>
                  <Input
                    type="number"
                    value={formData.achieved_total}
                    onChange={(e) => setFormData({...formData, achieved_total: parseFloat(e.target.value) || 0})}
                    className="font-bold text-lg"
                    placeholder="Digite o valor realizado..."
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Valor efetivamente faturado
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Campos específicos por tipo */}
          {(entityType === "workshop" || selectedEmployee) && (
            <div className="space-y-4">
              {renderFieldsForRole()}
            </div>
          )}

          {/* Observações */}
          <div>
            <Label>Observações</Label>
            <Input
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Notas ou comentários sobre o período..."
            />
          </div>

          {/* Botões de ação */}
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button 
              onClick={handleSave} 
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={entityType === "employee" && !selectedEmployee}
            >
              <Save className="w-4 h-4 mr-2" />
              Salvar e Analisar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}