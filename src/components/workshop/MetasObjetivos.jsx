import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save, Target } from "lucide-react";

export default function MetasObjetivos({ workshop, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    monthly_goals: workshop.monthly_goals || {
      revenue_parts: 0,
      revenue_services: 0,
      profitability_percentage: 0,
      profit_percentage: 0,
      average_ticket: 0,
      customer_volume: 0
    }
  });

  const handleSave = async () => {
    await onUpdate(formData);
    setEditing(false);
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-6 h-6 text-blue-600" />
            <CardTitle>Metas Mensais</CardTitle>
          </div>
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
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <Label>Rentabilidade (%)</Label>
            <Input
              type="number"
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

        <div className="pt-4 border-t bg-green-50 rounded-lg p-4">
          <h3 className="font-semibold text-green-900 mb-2">Meta de Faturamento Total</h3>
          <p className="text-3xl font-bold text-green-600">
            R$ {((formData.monthly_goals.revenue_parts || 0) + (formData.monthly_goals.revenue_services || 0)).toFixed(2)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}