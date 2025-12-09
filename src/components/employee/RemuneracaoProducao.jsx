import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Plus, Trash2, Target, DollarSign, Percent, Award, Edit } from "lucide-react";

export default function RemuneracaoProducao({ employee, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [editingBestMonth, setEditingBestMonth] = useState(false);
  const [metrics, setMetrics] = useState([]);
  const [formData, setFormData] = useState({
    salary: employee.salary || 0,
    commission: employee.commission || 0,
    bonus: employee.bonus || 0,
    benefits: Array.isArray(employee.benefits) ? employee.benefits : [],
    commission_rules: Array.isArray(employee.commission_rules) ? employee.commission_rules : [],
    production_parts: employee.production_parts || 0,
    production_parts_sales: employee.production_parts_sales || 0,
    production_services: employee.production_services || 0
  });
  
  const [bestMonthData, setBestMonthData] = useState({
    date: employee.best_month_history?.date || '',
    revenue_total: employee.best_month_history?.revenue_total || 0,
    revenue_parts: employee.best_month_history?.revenue_parts || 0,
    revenue_services: employee.best_month_history?.revenue_services || 0,
    profit_percentage: employee.best_month_history?.profit_percentage || 0,
    rentability_percentage: employee.best_month_history?.rentability_percentage || 0,
    customer_volume: employee.best_month_history?.customer_volume || 0,
    average_ticket: employee.best_month_history?.average_ticket || 0,
    average_ticket_parts: employee.best_month_history?.average_ticket_parts || 0,
    average_ticket_services: employee.best_month_history?.average_ticket_services || 0
  });

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const result = await base44.entities.ProductivityMetric.filter({ is_active: true });
        setMetrics(result.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (error) {
        console.error("Error loading metrics:", error);
      }
    };
    loadMetrics();
  }, []);

  const handleSave = async () => {
    const totalCost = formData.salary + formData.commission + formData.bonus + 
      (Array.isArray(formData.benefits) ? formData.benefits.reduce((sum, b) => sum + (b.valor || 0), 0) : 0);
    
    const totalProduction = formData.production_parts + formData.production_parts_sales + formData.production_services;
    
    // Formula: Custo / Faturamento * 100 (Fixed)
    const production_percentage = totalProduction > 0 ? (totalCost / totalProduction) * 100 : 0;

    await onUpdate({
      ...formData,
      production_percentage: Number(production_percentage.toFixed(2))
    });
    setEditing(false);
  };

  const addBenefit = () => {
    setFormData({
      ...formData,
      benefits: [...(Array.isArray(formData.benefits) ? formData.benefits : []), { nome: "", valor: 0 }]
    });
  };

  const removeBenefit = (index) => {
    const newBenefits = formData.benefits.filter((_, i) => i !== index);
    setFormData({ ...formData, benefits: newBenefits });
  };

  const updateBenefit = (index, field, value) => {
    const newBenefits = [...formData.benefits];
    newBenefits[index][field] = field === 'valor' ? parseFloat(value) || 0 : value;
    setFormData({ ...formData, benefits: newBenefits });
  };

  // Commission Rules Logic
  const addCommissionRule = () => {
    setFormData({
      ...formData,
      commission_rules: [
        ...(Array.isArray(formData.commission_rules) ? formData.commission_rules : []), 
        { id: Math.random().toString(36).substr(2, 9), metric_code: "", type: "percentage", value: 0, min_threshold: 0 }
      ]
    });
  };

  const removeCommissionRule = (index) => {
    const newRules = formData.commission_rules.filter((_, i) => i !== index);
    setFormData({ ...formData, commission_rules: newRules });
  };

  const updateCommissionRule = (index, field, value) => {
    const newRules = [...formData.commission_rules];
    newRules[index][field] = (field === 'value' || field === 'min_threshold') ? parseFloat(value) || 0 : value;
    setFormData({ ...formData, commission_rules: newRules });
  };

  const totalCost = formData.salary + formData.commission + formData.bonus + 
    (Array.isArray(formData.benefits) ? formData.benefits.reduce((sum, b) => sum + (b.valor || 0), 0) : 0);
  
  const totalProduction = formData.production_parts + formData.production_parts_sales + formData.production_services;
  // Formula: Custo (Salário) / Faturamento Total (Produção) * 100
  const productionPercentage = totalProduction > 0 ? ((totalCost / totalProduction) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-2 border-green-200 mb-6">
        <CardHeader>
          <CardTitle>PRODUÇÃO PREVISTA</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Produção de Peças (R$)</Label>
              <Input
                type="number"
                value={formData.production_parts}
                onChange={(e) => setFormData({...formData, production_parts: parseFloat(e.target.value) || 0})}
                disabled={!editing}
              />
            </div>
            <div>
              <Label>Produção Vendas de Peças (R$)</Label>
              <Input
                type="number"
                value={formData.production_parts_sales}
                onChange={(e) => setFormData({...formData, production_parts_sales: parseFloat(e.target.value) || 0})}
                disabled={!editing}
              />
            </div>
            <div>
              <Label>Produção de Serviços (R$)</Label>
              <Input
                type="number"
                value={formData.production_services}
                onChange={(e) => setFormData({...formData, production_services: parseFloat(e.target.value) || 0})}
                disabled={!editing}
              />
            </div>
          </div>

          <div className="pt-4 border-t bg-green-50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-semibold text-green-900">Produção Total Prevista</p>
                <p className="text-2xl font-bold text-green-600">R$ {totalProduction.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-green-900">% Custo sobre Produção</p>
                <p className="text-xs text-green-700">(Salário / Faturamento x 100)</p>
                <p className={`text-2xl font-bold ${productionPercentage <= 30 ? 'text-green-600' : 'text-orange-600'}`}>
                  {productionPercentage}%
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Remuneração & Benefícios</CardTitle>
            {!editing ? (
              <Button onClick={() => setEditing(true)}>Editar</Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
                <Button onClick={handleSave}>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Salário Fixo (R$)</Label>
              <Input
                type="number"
                value={formData.salary}
                onChange={(e) => setFormData({...formData, salary: parseFloat(e.target.value) || 0})}
                disabled={!editing}
              />
            </div>
            <div>
              <Label>Comissão Mensal (R$)</Label>
              <Input
                type="number"
                value={formData.commission}
                onChange={(e) => setFormData({...formData, commission: parseFloat(e.target.value) || 0})}
                disabled={!editing}
              />
            </div>
            <div>
              <Label>Bonificação/Prêmio (R$)</Label>
              <Input
                type="number"
                value={formData.bonus}
                onChange={(e) => setFormData({...formData, bonus: parseFloat(e.target.value) || 0})}
                disabled={!editing}
              />
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-600" />
                Regras de Comissionamento
              </h3>
              {editing && (
                <Button size="sm" onClick={addCommissionRule} variant="outline" className="border-purple-200 text-purple-700 hover:bg-purple-50">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Regra
                </Button>
              )}
            </div>
            
            {!Array.isArray(formData.commission_rules) || formData.commission_rules.length === 0 ? (
              <p className="text-sm text-gray-500 italic">Nenhuma regra de comissão cadastrada (use valor fixo acima ou adicione regras dinâmicas).</p>
            ) : (
              <div className="space-y-3">
                {formData.commission_rules.map((rule, index) => (
                  <div key={index} className="flex flex-col md:flex-row gap-2 items-end md:items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex-1 w-full">
                      <Label className="text-xs text-gray-500 mb-1 block">Métrica / Atividade</Label>
                      <Select
                        value={rule.metric_code}
                        onValueChange={(val) => updateCommissionRule(index, 'metric_code', val)}
                        disabled={!editing}
                      >
                        <SelectTrigger className="bg-white h-9">
                          <SelectValue placeholder="Selecione a atividade..." />
                        </SelectTrigger>
                        <SelectContent>
                          {metrics.map(m => (
                            <SelectItem key={m.code} value={m.code}>{m.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="w-full md:w-32">
                      <Label className="text-xs text-gray-500 mb-1 block">Tipo</Label>
                      <Select
                        value={rule.type}
                        onValueChange={(val) => updateCommissionRule(index, 'type', val)}
                        disabled={!editing}
                      >
                        <SelectTrigger className="bg-white h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentual (%)</SelectItem>
                          <SelectItem value="fixed_per_unit">Valor Fixo (R$)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-full md:w-24 relative">
                      <Label className="text-xs text-gray-500 mb-1 block">Valor</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          value={rule.value}
                          onChange={(e) => updateCommissionRule(index, 'value', e.target.value)}
                          disabled={!editing}
                          className="h-9 pl-7"
                        />
                        <span className="absolute left-2 top-2.5 text-gray-400 text-xs">
                          {rule.type === 'percentage' ? '%' : 'R$'}
                        </span>
                      </div>
                    </div>

                    {editing && (
                      <Button size="icon" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50 h-9 w-9" onClick={() => removeCommissionRule(index)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Vales e Benefícios</h3>
              {editing && (
                <Button size="sm" onClick={addBenefit}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar
                </Button>
              )}
            </div>
            {!Array.isArray(formData.benefits) || formData.benefits.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum benefício cadastrado</p>
            ) : (
              <div className="space-y-2">
                {formData.benefits.map((benefit, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input
                      placeholder="Nome do vale"
                      value={benefit.nome}
                      onChange={(e) => updateBenefit(index, 'nome', e.target.value)}
                      disabled={!editing}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Valor"
                      value={benefit.valor}
                      onChange={(e) => updateBenefit(index, 'valor', e.target.value)}
                      disabled={!editing}
                      className="w-32"
                    />
                    {editing && (
                      <Button size="icon" variant="destructive" onClick={() => removeBenefit(index)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t bg-blue-50 rounded-lg p-4">
            <p className="text-sm font-semibold text-blue-900">Custo Total Mensal</p>
            <p className="text-2xl font-bold text-blue-600">R$ {totalCost.toFixed(2)}</p>
          </div>
        </CardContent>
      </Card>


    </div>
  );
}