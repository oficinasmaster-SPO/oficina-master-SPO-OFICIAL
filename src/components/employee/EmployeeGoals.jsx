import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Plus, Trash2, Save, Target, TrendingUp, Calendar, Award, AlertCircle, CheckCircle2, Edit } from "lucide-react";
import { toast } from "sonner";

export default function EmployeeGoals({ employee, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [editingGrowth, setEditingGrowth] = useState(false);
  const [goals, setGoals] = useState([]);
  const [user, setUser] = useState(null);
  const [growthPercentageInput, setGrowthPercentageInput] = useState(10);

  useEffect(() => {
    loadUser();
    loadGoals();
    // Sincronizar com os dados do employee
    setGrowthPercentageInput(employee?.monthly_goals?.growth_percentage || 10);
  }, [employee]);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  const loadGoals = async () => {
    try {
      // Buscar metas da nova entidade EmployeeGoal
      const currentMonth = new Date().toISOString().substring(0, 7);
      const employeeGoalsFromDB = await base44.entities.EmployeeGoal.filter({
        employee_id: employee.id,
        period: currentMonth
      });
      
      // Se não houver na nova entidade, migrar do objeto antigo
      if (employeeGoalsFromDB.length === 0 && employee.monthly_goals?.goals_by_service?.length > 0) {
        const legacyGoals = employee.monthly_goals.goals_by_service.map(g => ({
          id: g.id,
          service_type: g.service_type,
          goal_value: g.goal_value || 0,
          current_value: g.current_value || 0,
          deadline: g.deadline || new Date().toISOString().substring(0, 10)
        }));
        setGoals(legacyGoals);
      } else {
        const formattedGoals = employeeGoalsFromDB.map(g => ({
          id: g.id,
          service_type: g.goal_type,
          goal_value: g.goal_value || 0,
          current_value: g.current_value || 0,
          deadline: g.deadline || new Date().toISOString().substring(0, 10)
        }));
        setGoals(formattedGoals);
      }
    } catch (error) {
      console.error("Error loading goals:", error);
      setGoals([]);
    }
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
      const currentMonth = new Date().toISOString().substring(0, 7);
      
      // Calcular progresso de cada meta antes de salvar
      const goalsWithProgress = goals.map(goal => {
        const { currentValue, progress } = calculateProgress(goal);
        return {
          ...goal,
          current_value: currentValue,
          progress: progress
        };
      });

      // Salvar ou atualizar cada meta na entidade EmployeeGoal
      const savePromises = goalsWithProgress.map(async (goal) => {
        const goalData = {
          workshop_id: employee.workshop_id,
          employee_id: employee.id,
          area: employee.area || "geral",
          goal_type: goal.service_type,
          period: currentMonth,
          goal_value: goal.goal_value || 0,
          current_value: goal.current_value || 0,
          daily_goal: (goal.goal_value || 0) / 22,
          achievement_percentage: goal.progress || 0,
          status: goal.progress >= 100 ? "atingida" : goal.progress >= 70 ? "ativa" : "em_alerta",
          deadline: goal.deadline
        };

        if (goal.id && goal.id.length > 15) {
          // ID do banco - atualizar
          await base44.entities.EmployeeGoal.update(goal.id, goalData);
        } else {
          // Novo registro - criar
          await base44.entities.EmployeeGoal.create(goalData);
        }
      });

      await Promise.all(savePromises);

      // Também atualizar o objeto monthly_goals no Employee (retrocompatibilidade)
      const totalGoalValue = goalsWithProgress.reduce((sum, g) => sum + g.goal_value, 0);
      const bestMonthRevenue = employee?.best_month_history?.revenue_total || 0;
      const currentGrowthPercentage = growthPercentageInput || 10;
      const projectedGoal = bestMonthRevenue > 0 
        ? bestMonthRevenue * (1 + currentGrowthPercentage / 100)
        : totalGoalValue || (bestMonthRevenue * 1.1);
      const dailyProjectedGoal = projectedGoal / 22;

      const monthlyGoals = {
        month: currentMonth,
        goals_by_service: goalsWithProgress,
        individual_goal: projectedGoal,
        daily_projected_goal: dailyProjectedGoal,
        actual_revenue_achieved: employee?.monthly_goals?.actual_revenue_achieved || 0,
        growth_percentage: currentGrowthPercentage,
        achievement_percentage: goalsWithProgress.length > 0
          ? goalsWithProgress.reduce((sum, g) => sum + (g.progress || 0), 0) / goalsWithProgress.length
          : 0
      };

      await onUpdate({ monthly_goals: monthlyGoals });
      
      toast.success("Metas salvas com sucesso na base de dados!");
      setEditing(false);
      await loadGoals();
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
      sales_services: "Vendas de Serviços (R$)",
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
  const bestMonthRevenue = employee?.best_month_history?.revenue_total || 0;
  const growthPercentage = growthPercentageInput || 10;
  
  // Se há melhor mês, usa ele + crescimento. Se não, usa 10% mínimo sobre melhor mês ou totalGoalValue
  const projectedGoal = bestMonthRevenue > 0 
    ? bestMonthRevenue * (1 + growthPercentage / 100)
    : totalGoalValue || (bestMonthRevenue * 1.1);
    
  const dailyProjectedGoal = projectedGoal / 22;
  const actualRevenueAchieved = employee.monthly_goals?.actual_revenue_achieved || 0;
  const achievementPercentage = projectedGoal > 0 ? (actualRevenueAchieved / projectedGoal) * 100 : 0;

  const handleSaveGrowth = async () => {
    const bestMonthRevenue = employee?.best_month_history?.revenue_total || 0;
    const newProjectedGoal = bestMonthRevenue > 0 
      ? bestMonthRevenue * (1 + growthPercentageInput / 100)
      : bestMonthRevenue * 1.1;
    const newDailyProjectedGoal = newProjectedGoal / 22;

    const newGoalsData = {
      ...(employee.monthly_goals || {}),
      growth_percentage: growthPercentageInput,
      individual_goal: newProjectedGoal,
      daily_projected_goal: newDailyProjectedGoal,
      month: new Date().toISOString().substring(0, 7)
    };

    await onUpdate({ monthly_goals: newGoalsData });
    toast.success("Crescimento geral atualizado! Metas recalculadas automaticamente.");
    setEditingGrowth(false);
  };

  return (
    <div className="space-y-6">
      {/* CRESCIMENTO GERAL - Configuração */}
      <Card className="shadow-xl border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <TrendingUp className="w-6 h-6" />
              📊 Crescimento Geral
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
                  setGrowthPercentageInput(employee.monthly_goals?.growth_percentage || 10);
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
              <p className="text-sm text-orange-800 mb-1">Projeção Gerada</p>
              <p className="text-2xl font-bold text-orange-600">
                +{growthPercentageInput.toFixed(1)}%
              </p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-xs text-yellow-800">
              ℹ️ Esta porcentagem será aplicada sobre o Melhor Mês Histórico para calcular a Meta Projetada mensal. Se deixar em branco, o sistema usará 10% por padrão.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card de Espelhamento do Melhor Mês + Metas Mensais */}
      <Card className="shadow-xl border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-900">
            <Target className="w-6 h-6" />
            🎯 Metas Mensais - Previsto x Realizado - {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-600 mb-1">Melhor Mês Histórico</p>
              <p className="text-xl font-bold text-gray-900">
                R$ {bestMonthRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-500 mt-1">Base para projeção</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">% Crescimento</p>
              <p className="text-xl font-bold text-blue-600">
                +{growthPercentage.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">Configurado acima</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">PROJETADO (Mês)</p>
              <p className="text-xl font-bold text-blue-600">
                R$ {projectedGoal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-500 mt-1">Meta a atingir</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">PROJETADO (Dia)</p>
              <p className="text-xl font-bold text-purple-600">
                R$ {dailyProjectedGoal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-500 mt-1">Meta diária</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t-2 border-green-300">
            <div className="bg-white p-4 rounded-lg">
              <p className="text-xs text-blue-600 mb-1">PREVISTO (Mês)</p>
              <p className="text-2xl font-bold text-blue-600">
                R$ {projectedGoal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-500 mt-1">Melhor Mês + {growthPercentage.toFixed(1)}%</p>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <p className="text-xs text-green-600 mb-1">REALIZADO no Mês</p>
              <p className="text-2xl font-bold text-green-600">
                R$ {actualRevenueAchieved.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-500 mt-1">Alimentado pelo histórico</p>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">% Atingimento da Meta</p>
              <p className={`text-2xl font-bold ${achievementPercentage >= 100 ? 'text-green-600' : achievementPercentage >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                {achievementPercentage.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {achievementPercentage >= 100 ? '🎉 Meta superada!' : achievementPercentage >= 70 ? '⚡ Quase lá!' : '💪 Continue o esforço!'}
              </p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-800">
              💡 <strong>Como funciona:</strong> A meta PROJETADA é calculada automaticamente (Melhor Mês + % Crescimento). 
              O valor REALIZADO é atualizado conforme você registra sua produção no "Histórico Diário da Produção".
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
                                <SelectItem value="sales_services">Vendas de Serviços</SelectItem>
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

          {/* Botões de Ação no Rodapé */}
          {editing && goals.length > 0 && (
            <div className="flex justify-end gap-3 pt-4 border-t mt-4">
              <Button 
                variant="outline" 
                onClick={() => { 
                  setEditing(false); 
                  loadGoals(); 
                }}
                size="lg"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSave} 
                className="bg-green-600 hover:bg-green-700"
                size="lg"
              >
                <Save className="w-5 h-5 mr-2" />
                Salvar Todas as Metas
              </Button>
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