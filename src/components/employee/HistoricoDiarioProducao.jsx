import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Calendar, DollarSign, Edit, Trash2, Save, X, Target, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function HistoricoDiarioProducao({ employee, onUpdate }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    parts_revenue: 0,
    services_revenue: 0,
    notes: ""
  });

  const dailyHistory = employee.daily_production_history || [];
  
  // Cálculo de metas
  const monthlyProjectedGoal = employee.monthly_goals?.individual_goal || 0;
  const dailyProjectedGoal = employee.monthly_goals?.daily_projected_goal || (monthlyProjectedGoal / 22);
  const actualRevenueAchieved = employee.monthly_goals?.actual_revenue_achieved || 0;

  const handleSubmit = async () => {
    const totalRevenue = parseFloat(formData.parts_revenue) + parseFloat(formData.services_revenue);
    
    const newEntry = {
      date: formData.date,
      parts_revenue: parseFloat(formData.parts_revenue) || 0,
      services_revenue: parseFloat(formData.services_revenue) || 0,
      total_revenue: totalRevenue,
      notes: formData.notes
    };

    let updatedHistory;
    if (editingIndex !== null) {
      updatedHistory = [...dailyHistory];
      updatedHistory[editingIndex] = newEntry;
    } else {
      updatedHistory = [...dailyHistory, newEntry];
    }

    // Ordenar por data (mais recente primeiro)
    updatedHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Calcular o realizado do mês atual
    const currentMonth = new Date().toISOString().substring(0, 7);
    const monthEntries = updatedHistory.filter(entry => entry.date.startsWith(currentMonth));
    
    const monthlyTotal = monthEntries.reduce((sum, entry) => sum + entry.total_revenue, 0);
    const monthlyParts = monthEntries.reduce((sum, entry) => sum + entry.parts_revenue, 0);
    const monthlyServices = monthEntries.reduce((sum, entry) => sum + entry.services_revenue, 0);
    const clientCount = monthEntries.length; // Aproximação: 1 cliente por dia registrado

    // Atualizar colaborador
    await onUpdate({
      daily_production_history: updatedHistory,
      monthly_goals: {
        ...employee.monthly_goals,
        actual_revenue_achieved: monthlyTotal
      }
    });

    // Atualizar ou criar registro no MonthlyGoalHistory
    try {
      const existingRecords = await base44.entities.MonthlyGoalHistory.filter({
        workshop_id: employee.workshop_id,
        employee_id: employee.id,
        month: currentMonth
      });

      const historyData = {
        workshop_id: employee.workshop_id,
        entity_type: "employee",
        entity_id: employee.id,
        employee_id: employee.id,
        employee_role: employee.area || "geral",
        reference_date: new Date().toISOString().split('T')[0],
        month: currentMonth,
        projected_total: employee.monthly_goals?.individual_goal || 0,
        achieved_total: monthlyTotal,
        revenue_total: monthlyTotal,
        revenue_parts: monthlyParts,
        revenue_services: monthlyServices,
        customer_volume: clientCount,
        average_ticket: clientCount > 0 ? monthlyTotal / clientCount : 0
      };

      if (existingRecords && existingRecords.length > 0) {
        await base44.entities.MonthlyGoalHistory.update(existingRecords[0].id, historyData);
      } else {
        await base44.entities.MonthlyGoalHistory.create(historyData);
      }
    } catch (error) {
      console.error("Erro ao atualizar histórico de metas:", error);
    }

    toast.success(editingIndex !== null ? "Registro atualizado e metas alimentadas!" : "Registro adicionado e metas alimentadas!");
    resetForm();
  };

  const handleEdit = (index) => {
    const entry = dailyHistory[index];
    setFormData({
      date: entry.date,
      parts_revenue: entry.parts_revenue,
      services_revenue: entry.services_revenue,
      notes: entry.notes || ""
    });
    setEditingIndex(index);
    setIsAdding(true);
  };

  const handleDelete = async (index) => {
    if (!confirm("Deseja realmente excluir este registro?")) return;

    const updatedHistory = dailyHistory.filter((_, i) => i !== index);
    
    // Recalcular o realizado do mês atual
    const currentMonth = new Date().toISOString().substring(0, 7);
    const monthEntries = updatedHistory.filter(entry => entry.date.startsWith(currentMonth));
    
    const monthlyTotal = monthEntries.reduce((sum, entry) => sum + entry.total_revenue, 0);
    const monthlyParts = monthEntries.reduce((sum, entry) => sum + entry.parts_revenue, 0);
    const monthlyServices = monthEntries.reduce((sum, entry) => sum + entry.services_revenue, 0);
    const clientCount = monthEntries.length;

    await onUpdate({
      daily_production_history: updatedHistory,
      monthly_goals: {
        ...employee.monthly_goals,
        actual_revenue_achieved: monthlyTotal
      }
    });

    // Atualizar histórico de metas
    try {
      const existingRecords = await base44.entities.MonthlyGoalHistory.filter({
        workshop_id: employee.workshop_id,
        employee_id: employee.id,
        month: currentMonth
      });

      if (existingRecords && existingRecords.length > 0) {
        await base44.entities.MonthlyGoalHistory.update(existingRecords[0].id, {
          achieved_total: monthlyTotal,
          revenue_total: monthlyTotal,
          revenue_parts: monthlyParts,
          revenue_services: monthlyServices,
          customer_volume: clientCount,
          average_ticket: clientCount > 0 ? monthlyTotal / clientCount : 0
        });
      }
    } catch (error) {
      console.error("Erro ao atualizar histórico de metas:", error);
    }

    toast.success("Registro excluído e metas atualizadas!");
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      parts_revenue: 0,
      services_revenue: 0,
      notes: ""
    });
    setIsAdding(false);
    setEditingIndex(null);
  };

  const getTotalRevenue = () => {
    return dailyHistory.reduce((sum, entry) => sum + entry.total_revenue, 0);
  };

  const getMonthlyRevenue = () => {
    const currentMonth = new Date().toISOString().substring(0, 7);
    return dailyHistory
      .filter(entry => entry.date.startsWith(currentMonth))
      .reduce((sum, entry) => sum + entry.total_revenue, 0);
  };

  return (
    <div className="space-y-6">
      {/* Cards de Resumo e Metas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="shadow-lg border-2 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Meta Mensal</p>
                <p className="text-lg font-bold text-blue-600">
                  R$ {monthlyProjectedGoal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-2 border-purple-200 bg-purple-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Meta Diária</p>
                <p className="text-lg font-bold text-purple-600">
                  R$ {dailyProjectedGoal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-2 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Realizado Mês</p>
                <p className="text-lg font-bold text-green-600">
                  R$ {actualRevenueAchieved.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-2 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Atingimento</p>
                <p className={`text-lg font-bold ${
                  monthlyProjectedGoal > 0 && (actualRevenueAchieved / monthlyProjectedGoal * 100) >= 100 ? 'text-green-600' :
                  monthlyProjectedGoal > 0 && (actualRevenueAchieved / monthlyProjectedGoal * 100) >= 70 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {monthlyProjectedGoal > 0 ? ((actualRevenueAchieved / monthlyProjectedGoal) * 100).toFixed(1) : '0.0'}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-2 border-indigo-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                <Calendar className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Registros</p>
                <p className="text-lg font-bold text-indigo-600">
                  {dailyHistory.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Formulário de Registro */}
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Histórico Diário da Produção</CardTitle>
            {!isAdding && (
              <Button onClick={() => setIsAdding(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Novo Registro
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isAdding && (
            <div className="space-y-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg mb-6 border-2 border-purple-200">
              {/* Exibir Meta Diária */}
              <div className="bg-white p-4 rounded-lg border-2 border-purple-300 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-purple-900 mb-1">🎯 Meta Diária (Previsto)</p>
                    <p className="text-3xl font-bold text-purple-600">
                      R$ {dailyProjectedGoal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Meta Mensal: R$ {monthlyProjectedGoal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ÷ 22 dias úteis
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-600 mb-1">Total a registrar hoje:</p>
                    <p className="text-2xl font-bold text-blue-600">
                      R$ {(parseFloat(formData.parts_revenue || 0) + parseFloat(formData.services_revenue || 0)).toFixed(2)}
                    </p>
                    {dailyProjectedGoal > 0 && (
                      <p className={`text-sm font-semibold mt-1 ${
                        (parseFloat(formData.parts_revenue || 0) + parseFloat(formData.services_revenue || 0)) >= dailyProjectedGoal 
                          ? 'text-green-600' 
                          : 'text-orange-600'
                      }`}>
                        {((parseFloat(formData.parts_revenue || 0) + parseFloat(formData.services_revenue || 0)) / dailyProjectedGoal * 100).toFixed(1)}% da meta
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Faturamento Peças (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.parts_revenue}
                    onChange={(e) => setFormData({ ...formData, parts_revenue: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Faturamento Serviços (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.services_revenue}
                    onChange={(e) => setFormData({ ...formData, services_revenue: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Observações (Opcional)</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Observações sobre o dia..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={resetForm}>
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700">
                  <Save className="w-4 h-4 mr-2" />
                  {editingIndex !== null ? "Atualizar" : "Salvar"}
                </Button>
              </div>
            </div>
          )}

          {/* Lista de Registros */}
          {dailyHistory.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Nenhum registro diário encontrado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {dailyHistory.map((entry, index) => {
                const dailyAchievementPercentage = dailyProjectedGoal > 0 
                  ? (entry.total_revenue / dailyProjectedGoal) * 100 
                  : 0;
                const metaDayAchieved = dailyAchievementPercentage >= 100;

                return (
                  <Card key={index} className={`hover:shadow-md transition-shadow ${
                    metaDayAchieved ? 'border-l-4 border-green-500' : 'border-l-4 border-orange-400'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-gray-900">
                              {new Date(entry.date).getDate()}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(entry.date).toLocaleDateString('pt-BR', { month: 'short' })}
                            </p>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {new Date(entry.date).toLocaleDateString('pt-BR', { 
                                weekday: 'long', 
                                day: '2-digit', 
                                month: 'long', 
                                year: 'numeric' 
                              })}
                            </p>
                            <div className="flex gap-4 text-sm text-gray-600 mt-1">
                              <span>Peças: R$ {entry.parts_revenue.toFixed(2)}</span>
                              <span>Serviços: R$ {entry.services_revenue.toFixed(2)}</span>
                            </div>

                            {/* Meta Diária */}
                            <div className="mt-2 flex items-center gap-3 text-xs">
                              <div className="bg-purple-100 px-2 py-1 rounded">
                                <span className="text-purple-700">Meta Dia: R$ {dailyProjectedGoal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                              </div>
                              <div className={`px-2 py-1 rounded ${metaDayAchieved ? 'bg-green-100' : 'bg-orange-100'}`}>
                                <span className={metaDayAchieved ? 'text-green-700' : 'text-orange-700'}>
                                  {metaDayAchieved ? '✅ Meta atingida!' : `📊 ${dailyAchievementPercentage.toFixed(0)}% da meta`}
                                </span>
                              </div>
                            </div>

                            {entry.notes && (
                              <p className="text-xs text-gray-500 mt-1 italic">{entry.notes}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Realizado Dia</p>
                            <p className={`text-xl font-bold ${metaDayAchieved ? 'text-green-600' : 'text-orange-600'}`}>
                              R$ {entry.total_revenue.toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {dailyAchievementPercentage.toFixed(1)}% da meta
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEdit(index)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDelete(index)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}