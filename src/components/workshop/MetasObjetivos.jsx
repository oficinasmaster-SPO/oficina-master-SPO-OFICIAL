import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save, Target, TrendingUp, Calendar } from "lucide-react";

export default function MetasObjetivos({ workshop, onUpdate }) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    best_month_history: {
      date: "",
      revenue_total: 0,
      revenue_parts: 0,
      revenue_services: 0,
      profit_percentage: 0,
      customer_volume: 0,
      average_ticket: 0
    },
    monthly_goals: {
      revenue_parts: 0,
      revenue_services: 0,
      profitability_percentage: 0,
      profit_percentage: 0,
      average_ticket: 0,
      customer_volume: 0,
      buy_target: 0,
      product_cost_applied: 0
    },
    daily_goals: {},
    weekly_goals: {},
    annual_goals: {}
  });

  // Sincroniza formData quando workshop muda
  useEffect(() => {
    if (workshop) {
      setFormData({
        best_month_history: workshop.best_month_history || {
          date: "",
          revenue_total: 0,
          revenue_parts: 0,
          revenue_services: 0,
          profit_percentage: 0,
          customer_volume: 0,
          average_ticket: 0
        },
        monthly_goals: workshop.monthly_goals || {
          revenue_parts: 0,
          revenue_services: 0,
          profitability_percentage: 0,
          profit_percentage: 0,
          average_ticket: 0,
          customer_volume: 0,
          buy_target: 0,
          product_cost_applied: 0
        },
        daily_goals: workshop.daily_goals || {},
        weekly_goals: workshop.weekly_goals || {},
        annual_goals: workshop.annual_goals || {}
      });
    }
  }, [workshop]);

  const handleSave = async () => {
    await onUpdate(formData);
    setEditing(false);
  };

  if (!workshop) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-500">Carregando dados...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Melhor Mês Histórico */}
      <Card className="shadow-lg bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-orange-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-orange-600" />
              <CardTitle>🏆 Melhor Mês Histórico</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label>Data do Melhor Mês</Label>
              <Input
                type="date"
                value={formData.best_month_history.date}
                onChange={(e) => setFormData({
                  ...formData,
                  best_month_history: { ...formData.best_month_history, date: e.target.value }
                })}
                disabled={!editing}
              />
            </div>
            <div>
              <Label>Faturamento Peças (R$)</Label>
              <Input
                type="number"
                value={formData.best_month_history.revenue_parts}
                onChange={(e) => {
                  const parts = parseFloat(e.target.value) || 0;
                  const services = formData.best_month_history.revenue_services || 0;
                  setFormData({
                    ...formData,
                    best_month_history: { 
                      ...formData.best_month_history, 
                      revenue_parts: parts,
                      revenue_total: parts + services
                    }
                  });
                }}
                disabled={!editing}
              />
            </div>
            <div>
              <Label>Faturamento Serviços (R$)</Label>
              <Input
                type="number"
                value={formData.best_month_history.revenue_services}
                onChange={(e) => {
                  const services = parseFloat(e.target.value) || 0;
                  const parts = formData.best_month_history.revenue_parts || 0;
                  setFormData({
                    ...formData,
                    best_month_history: { 
                      ...formData.best_month_history, 
                      revenue_services: services,
                      revenue_total: parts + services
                    }
                  });
                }}
                disabled={!editing}
              />
            </div>
            <div>
              <Label>Faturamento Total (Auto)</Label>
              <Input
                type="text"
                value={`R$ ${(formData.best_month_history.revenue_total || 0).toFixed(2)}`}
                disabled
                className="bg-yellow-100 font-bold text-orange-700"
              />
            </div>
            <div>
              <Label>Lucro (%)</Label>
              <Input
                type="number"
                value={formData.best_month_history.profit_percentage}
                onChange={(e) => setFormData({
                  ...formData,
                  best_month_history: { ...formData.best_month_history, profit_percentage: parseFloat(e.target.value) || 0 }
                })}
                disabled={!editing}
              />
            </div>
            <div>
              <Label>Volume de Clientes</Label>
              <Input
                type="number"
                value={formData.best_month_history.customer_volume}
                onChange={(e) => {
                  const volume = parseInt(e.target.value) || 0;
                  const total = formData.best_month_history.revenue_total || 0;
                  setFormData({
                    ...formData,
                    best_month_history: { 
                      ...formData.best_month_history, 
                      customer_volume: volume,
                      average_ticket: volume > 0 ? total / volume : 0
                    }
                  });
                }}
                disabled={!editing}
              />
            </div>
            <div>
              <Label>Ticket Médio (Auto)</Label>
              <Input
                type="text"
                value={`R$ ${(formData.best_month_history.average_ticket || 0).toFixed(2)}`}
                disabled
                className="bg-yellow-100 font-bold text-orange-700"
              />
            </div>
          </div>
          
          {formData.best_month_history.date && formData.best_month_history.revenue_total > 0 && (
            <div className="bg-orange-100 rounded-lg p-4 border-2 border-orange-300">
              <p className="text-sm text-orange-900 font-semibold mb-2">
                📊 Use este histórico como referência para definir suas metas atuais
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-orange-700">Data:</p>
                  <p className="font-bold text-orange-900">
                    {new Date(formData.best_month_history.date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div>
                  <p className="text-orange-700">Faturamento:</p>
                  <p className="font-bold text-orange-900">R$ {(formData.best_month_history.revenue_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-orange-700">Lucro:</p>
                  <p className="font-bold text-orange-900">{formData.best_month_history.profit_percentage}%</p>
                </div>
                <div>
                  <p className="text-orange-700">Ticket Médio:</p>
                  <p className="font-bold text-orange-900">R$ {(formData.best_month_history.average_ticket || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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

        <div className="pt-4 border-t bg-green-50 rounded-lg p-4">
          <h3 className="font-semibold text-green-900 mb-2">Meta de Faturamento Total Mensal</h3>
          <p className="text-3xl font-bold text-green-600">
            R$ {((formData.monthly_goals.revenue_parts || 0) + (formData.monthly_goals.revenue_services || 0)).toFixed(2)}
          </p>
        </div>
      </CardContent>
      </Card>

      <Card className="shadow-lg bg-blue-50 border-2 border-blue-200">
      <CardHeader>
        <CardTitle>Desdobramento Completo de Metas</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 mb-4">
          Para definir metas diárias, semanais e anuais por área (Vendas, Comercial, Pátio, Líderes, Pessoas, Financeiro), 
          utilize a ferramenta completa de desdobramento.
        </p>
        <Button
          onClick={() => navigate(createPageUrl("DesdobramentoMeta"))}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          Abrir Desdobramento de Metas
        </Button>
      </CardContent>
      </Card>
    </div>
  );
}