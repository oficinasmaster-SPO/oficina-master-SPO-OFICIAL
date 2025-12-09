import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Calendar, DollarSign, Edit, Trash2, Save, X } from "lucide-react";
import { toast } from "sonner";

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
    const monthlyTotal = updatedHistory
      .filter(entry => entry.date.startsWith(currentMonth))
      .reduce((sum, entry) => sum + entry.total_revenue, 0);

    await onUpdate({
      daily_production_history: updatedHistory,
      monthly_goals: {
        ...employee.monthly_goals,
        actual_revenue_achieved: monthlyTotal
      }
    });

    toast.success(editingIndex !== null ? "Registro atualizado!" : "Registro adicionado!");
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
    const monthlyTotal = updatedHistory
      .filter(entry => entry.date.startsWith(currentMonth))
      .reduce((sum, entry) => sum + entry.total_revenue, 0);

    await onUpdate({
      daily_production_history: updatedHistory,
      monthly_goals: {
        ...employee.monthly_goals,
        actual_revenue_achieved: monthlyTotal
      }
    });

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
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-lg border-2 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Histórico</p>
                <p className="text-2xl font-bold text-blue-600">
                  R$ {getTotalRevenue().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-2 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Mês Atual</p>
                <p className="text-2xl font-bold text-green-600">
                  R$ {getMonthlyRevenue().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-2 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Registros</p>
                <p className="text-2xl font-bold text-purple-600">
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
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg mb-6">
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
              {dailyHistory.map((entry, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow">
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
                          {entry.notes && (
                            <p className="text-xs text-gray-500 mt-1 italic">{entry.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Total</p>
                          <p className="text-xl font-bold text-green-600">
                            R$ {entry.total_revenue.toFixed(2)}
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}