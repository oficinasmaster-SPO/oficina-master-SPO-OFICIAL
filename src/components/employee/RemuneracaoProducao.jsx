import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save, Plus, Trash2 } from "lucide-react";

export default function RemuneracaoProducao({ employee, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    salary: employee.salary || 0,
    commission: employee.commission || 0,
    bonus: employee.bonus || 0,
    benefits: employee.benefits || [],
    production_parts: employee.production_parts || 0,
    production_parts_sales: employee.production_parts_sales || 0,
    production_services: employee.production_services || 0
  });

  const handleSave = async () => {
    const totalCost = formData.salary + formData.commission + formData.bonus + 
      formData.benefits.reduce((sum, b) => sum + (b.valor || 0), 0);
    
    const totalProduction = formData.production_parts + formData.production_parts_sales + formData.production_services;
    
    const production_percentage = totalCost > 0 ? (totalProduction / totalCost) * 100 : 0;

    await onUpdate({
      ...formData,
      production_percentage: Number(production_percentage.toFixed(2))
    });
    setEditing(false);
  };

  const addBenefit = () => {
    setFormData({
      ...formData,
      benefits: [...formData.benefits, { nome: "", valor: 0 }]
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

  const totalCost = formData.salary + formData.commission + formData.bonus + 
    formData.benefits.reduce((sum, b) => sum + (b.valor || 0), 0);
  
  const totalProduction = formData.production_parts + formData.production_parts_sales + formData.production_services;
  const productionPercentage = totalCost > 0 ? ((totalProduction / totalCost) * 100).toFixed(0) : 0;

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Remuneração</CardTitle>
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
              <h3 className="font-semibold text-gray-900">Vales e Benefícios</h3>
              {editing && (
                <Button size="sm" onClick={addBenefit}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar
                </Button>
              )}
            </div>
            {formData.benefits.length === 0 ? (
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

      <Card className="shadow-lg border-2 border-green-200">
        <CardHeader>
          <CardTitle>Produção</CardTitle>
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
                <p className="text-sm font-semibold text-green-900">Produção Total</p>
                <p className="text-2xl font-bold text-green-600">R$ {totalProduction.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-green-900">% sobre Custos</p>
                <p className={`text-2xl font-bold ${productionPercentage >= 100 ? 'text-green-600' : 'text-orange-600'}`}>
                  {productionPercentage}%
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}