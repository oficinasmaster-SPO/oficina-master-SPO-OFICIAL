import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Plus, Trash2, Save, Target, TrendingUp, Calendar, Award, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function EmployeeGoals({ employee, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [goals, setGoals] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadUser();
    loadGoals();
  }, [employee]);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  const loadGoals = () => {
    const employeeGoals = employee.monthly_goals || {
      month: new Date().toISOString().substring(0, 7),
      goals_by_service: [],
      individual_goal: 0,
      daily_projected_goal: 0,
      actual_revenue_achieved: 0,
      growth_percentage: 10
    };
    
    const formattedGoals = Array.isArray(employeeGoals.goals_by_service) 
      ? employeeGoals.goals_by_service 
      : [];
    
    setGoals(formattedGoals);
  };

  const addGoal = () => {
    setGoals([
      ...goals,
      {
        id: Date.now().toString(),
        service_type: "production_parts",
        goal_value: 0,
        current_value: 0,
        deadline: new Date().toISOString().substring(0, 10)
      }
    ]);
  };

  const removeGoal = (index) => {
    setGoals(goals.filter((_, i) => i !== index));
  };

  const updateGoal = (index, field, value) => {
    const newGoals = [...goals];
    newGoals[index][field] = field === 'goal_value' || field === 'current_value' 
      ? parseFloat(value) || 0 
      : value;
    setGoals(newGoals);
  };

  const calculateProgress = (goal) => {
    // Calcular progresso automaticamente baseado nos dados de produção
    let currentValue = 0;
    
    switch(goal.service_type) {
      case 'production_parts':
        currentValue = employee.production_parts || 0;
        break;
      case 'production_parts_sales':
        currentValue = employee.production_parts_sales || 0;
        break;
      case 'production_services':
        currentValue = employee.production_services || 0;
        break;
      case 'total_production':
        currentValue = (employee.production_parts || 0) + 
                      (employee.production_parts_sales || 0) + 
                      (employee.production_services || 0);
        break;
      case 'customer_volume':
        // Pode ser definido manualmente ou integrado com outro sistema
        currentValue = goal.current_value || 0;
        break;
      default:
        currentValue = goal.current_value || 0;
    }

    const progress = goal.goal_value > 0 ? (currentValue / goal.goal_value) * 100 : 0;
    return { currentValue, progress: Math.min(progress, 100) };
  };

  const handleSave = async () => {
    try {
      // Calcular progresso de cada meta antes de salvar
      const goalsWithProgress = goals.map(goal => {
        const { currentValue, progress } = calculateProgress(goal);
        return {
          ...goal,
          current_value: currentValue,
          progress: progress
        };
      });

      const totalGoalValue = goalsWithProgress.reduce((sum, g) => sum + g.goal_value, 0);
      
      // Calcular meta projetada baseada no melhor mês + crescimento
      const bestMonthRevenue = employee.best_month_history?.revenue_total || 0;
      const growthPercentage = employee.monthly_goals?.growth_percentage || 10;
      const projectedGoal = bestMonthRevenue > 0 
        ? bestMonthRevenue * (1 + growthPercentage / 100)
        : totalGoalValue;

      // Calcular meta diária (assumindo 22 dias úteis)
      const dailyProjectedGoal = projectedGoal / 22;

      const monthlyGoals = {
        month: new Date().toISOString().substring(0, 7),
        goals_by_service: goalsWithProgress,
        individual_goal: projectedGoal,
        daily_projected_goal: dailyProjectedGoal,
        actual_revenue_achieved: employee.monthly_goals?.actual_revenue_achieved || 0,
        growth_percentage: growthPercentage,
        achievement_percentage: goalsWithProgress.length > 0
          ? goalsWithProgress.reduce((sum, g) => sum + (g.progress || 0), 0) / goalsWithProgress.length
          : 0
      };

      await onUpdate({ monthly_goals: monthlyGoals });
      toast.success("Metas atualizadas com sucesso!");
      setEditing(false);
    } catch (error) {
      console.error("Error saving goals:", error);
      toast.error("Erro ao salvar metas");
    }
  };

  const getServiceTypeLabel = (type) => {
    const labels = {
      production_parts: "Produção de Peças (R$)",
      production_parts_sales: "Vendas de Peças (R$)",
      production_services: "Produção de Serviços (R$)",
      total_production: "Produção Total (R$)",
      customer_volume: "Volume de Clientes (Qtd)",
      custom: "Meta Personalizada"
    };
    return labels[type] || type;
  };

  const getStatusIcon = (progress) => {
    if (progress >= 100) return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    if (progress >= 70) return <TrendingUp className="w-5 h-5 text-blue-600" />;
    return <AlertCircle className="w-5 h-5 text-orange-600" />;
  };

  const getProgressColor = (progress) => {
    if (progress >= 100) return "bg-green-600";
    if (progress >= 70) return "bg-blue-600";
    if (progress >= 40) return "bg-yellow-600";
    return "bg-red-600";
  };

  // Calcular estatísticas gerais
  const totalGoalValue = goals.reduce((sum, g) => sum + (g.goal_value || 0), 0);
  const goalsWithProgress = goals.map(g => ({ ...g, ...calculateProgress(g) }));
  const totalCurrentValue = goalsWithProgress.reduce((sum, g) => sum + g.currentValue, 0);
  const overallProgress = totalGoalValue > 0 ? (totalCurrentValue / totalGoalValue) * 100 : 0;
  const achievedGoals = goalsWithProgress.filter(g => g.progress >= 100).length;

  const canEdit = user && (user.role === 'admin' || user.email === employee.created_by);

  // Dados do melhor mês e projeções
  const bestMonthRevenue = employee.best_month_history?.revenue_total || 0;
  const growthPercentage = employee.monthly_goals?.growth_percentage || 10;
  const projectedGoal = bestMonthRevenue > 0 
    ? bestMonthRevenue * (1 + growthPercentage / 100)
    : totalGoalValue;
  const dailyProjectedGoal = projectedGoal / 22;
  const actualRevenueAchieved = employee.monthly_goals?.actual_revenue_achieved || 0;
  const achievementPercentage = projectedGoal > 0 ? (actualRevenueAchieved / projectedGoal) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Card de Espelhamento do Melhor Mês + Metas Mensais */}
      <Card className="shadow-xl border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-900">
            <TrendingUp className="w-6 h-6" />
            Metas Mensais Projetadas - {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-600 mb-1">Melhor Mês Histórico</p>
              <p className="text-xl font-bold text-gray-900">
                R$ {bestMonthRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">% Crescimento</p>
              <p className="text-xl font-bold text-blue-600">
                +{growthPercentage.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Meta Projetada (Mês)</p>
              <p className="text-xl font-bold text-green-600">
                R$ {projectedGoal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Meta Projetada (Dia)</p>
              <p className="text-xl font-bold text-purple-600">
                R$ {dailyProjectedGoal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-green-200">
            <div>
              <p className="text-xs text-gray-600 mb-1">Realizado no Mês</p>
              <p className="text-2xl font-bold text-green-600">
                R$ {actualRevenueAchieved.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">% Atingimento</p>
              <p className={`text-2xl font-bold ${achievementPercentage >= 100 ? 'text-green-600' : achievementPercentage >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                {achievementPercentage.toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-800">
              💡 <strong>Informação:</strong> A meta projetada é calculada automaticamente com base no seu Melhor Mês Histórico + {growthPercentage}% de crescimento (definido no Desdobramento de Metas). 
              O valor "Realizado" é atualizado automaticamente conforme você registra sua produção diária.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Resumo Geral das Metas */}
      <Card className="shadow-xl border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-indigo-900">
              <Target className="w-6 h-6" />
              Metas por Atividade
            </CardTitle>
            {canEdit && !editing && (
              <Button onClick={() => setEditing(true)} className="bg-indigo-600 hover:bg-indigo-700">
                Editar Metas
              </Button>
            )}
            {editing && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setEditing(false); loadGoals(); }}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                  <Save className="w-4 h-4 mr-2" />
                  Salvar
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <p className="text-xs text-gray-600 mb-1">Progresso Geral</p>
              <p className="text-2xl font-bold text-indigo-600">
                {overallProgress.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Meta Total</p>
              <p className="text-xl font-bold text-gray-900">
                R$ {totalGoalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Realizado</p>
              <p className="text-xl font-bold text-green-600">
                R$ {totalCurrentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Metas Atingidas</p>
              <p className="text-xl font-bold text-purple-600">
                {achievedGoals} de {goals.length}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium text-gray-700 mb-1">
              <span>Progresso Consolidado</span>
              <span>{overallProgress.toFixed(1)}%</span>
            </div>
            <Progress value={overallProgress} className="h-4" />
          </div>
        </CardContent>
      </Card>

      {/* Lista de Metas Individuais */}
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Metas Individuais</CardTitle>
            {editing && (
              <Button onClick={addGoal} size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                Nova Meta
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {goals.length === 0 ? (
            <div className="text-center py-12">
              <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">Nenhuma meta definida para este colaborador</p>
              {canEdit && !editing && (
                <Button onClick={() => setEditing(true)} className="bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeira Meta
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {goalsWithProgress.map((goal, index) => (
                <Card key={goal.id || index} className="border-2 hover:border-indigo-200 transition-all">
                  <CardContent className="p-4">
                    {editing ? (
                      <div className="space-y-3">
                        <div className="flex gap-3 items-end">
                          <div className="flex-1">
                            <Label className="text-xs text-gray-600 mb-1 block">Tipo de Meta</Label>
                            <Select
                              value={goal.service_type}
                              onValueChange={(val) => updateGoal(index, 'service_type', val)}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="production_parts">Produção de Peças</SelectItem>
                                <SelectItem value="production_parts_sales">Vendas de Peças</SelectItem>
                                <SelectItem value="production_services">Produção de Serviços</SelectItem>
                                <SelectItem value="total_production">Produção Total</SelectItem>
                                <SelectItem value="customer_volume">Volume de Clientes</SelectItem>
                                <SelectItem value="custom">Meta Personalizada</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="w-32">
                            <Label className="text-xs text-gray-600 mb-1 block">Valor Meta (R$)</Label>
                            <Input
                              type="number"
                              value={goal.goal_value}
                              onChange={(e) => updateGoal(index, 'goal_value', e.target.value)}
                              className="h-9"
                            />
                          </div>

                          <div className="w-40">
                            <Label className="text-xs text-gray-600 mb-1 block">Prazo</Label>
                            <Input
                              type="date"
                              value={goal.deadline}
                              onChange={(e) => updateGoal(index, 'deadline', e.target.value)}
                              className="h-9"
                            />
                          </div>

                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-9 w-9"
                            onClick={() => removeGoal(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(goal.progress)}
                            <div>
                              <h4 className="font-semibold text-gray-900">
                                {getServiceTypeLabel(goal.service_type)}
                              </h4>
                              <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  Prazo: {new Date(goal.deadline).toLocaleDateString('pt-BR')}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Target className="w-3 h-3" />
                                  Meta: R$ {goal.goal_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-indigo-600">
                              {goal.progress.toFixed(1)}%
                            </p>
                            <p className="text-xs text-gray-500">atingido</p>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">
                              R$ {goal.currentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} realizado
                            </span>
                            <span className="text-gray-600">
                              Faltam R$ {Math.max(0, goal.goal_value - goal.currentValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="relative">
                            <Progress value={goal.progress} className="h-3" />
                            <div 
                              className={`absolute top-0 left-0 h-3 ${getProgressColor(goal.progress)} rounded-full transition-all`}
                              style={{ width: `${Math.min(goal.progress, 100)}%` }}
                            />
                          </div>
                        </div>

                        {goal.progress >= 100 && (
                          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded">
                            <Award className="w-4 h-4" />
                            <span className="font-medium">🎉 Meta atingida! Parabéns!</span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informações sobre Atualização Automática */}
      <Card className="shadow-lg bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">Atualização Automática</h4>
              <p className="text-sm text-blue-700">
                O progresso das metas é calculado automaticamente com base nos dados de produção do colaborador. 
                Os valores são atualizados em tempo real conforme a produção é registrada no sistema.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}