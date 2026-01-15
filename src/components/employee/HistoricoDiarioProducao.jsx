import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Calendar, DollarSign, Edit, Trash2, Save, X, Target, TrendingUp, Eye } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import RegistroComercial from "./RegistroComercial";
import RegistroMarketing from "./RegistroMarketing";
import RegistroTecnico from "./RegistroTecnico";
import RegistroGenerico from "./RegistroGenerico";

export default function HistoricoDiarioProducao({ employee, onUpdate }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingGoal, setEditingGoal] = useState(false);
  const [expandedRecords, setExpandedRecords] = useState({});
  const [dailyHistoryFromDB, setDailyHistoryFromDB] = useState([]);
  const [loading, setLoading] = useState(true);
  const [goalFormData, setGoalFormData] = useState({
    individual_goal: 0,
    growth_percentage: 10
  });
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    parts_revenue: 0,
    services_revenue: 0,
    notes: "",
    // Comercial
    clientes_agendados_base: 0,
    clientes_agendados_marketing: 0,
    clientes_entregues_marketing: 0,
    vendas_leads_marketing: 0,
    // Marketing
    leads_gerados: 0,
    leads_agendados: 0,
    leads_compareceram: 0,
    leads_vendidos: 0,
    valor_investido_trafego: 0,
    valor_faturado_leads: 0,
    // Técnico
    faturamento_pecas: 0,
    faturamento_servicos: 0,
    qgp_aplicados: 0,
    clientes_atendidos: 0,
    // Genérico
    atividades_concluidas: 0,
    horas_trabalhadas: 0,
    observacoes: ""
  });

  const dailyHistory = dailyHistoryFromDB.length > 0 ? dailyHistoryFromDB : (employee.daily_production_history || []);
  
  // Cálculo de metas
  const monthlyProjectedGoal = employee.monthly_goals?.individual_goal || 0;
  const dailyProjectedGoal = employee.monthly_goals?.daily_projected_goal || (monthlyProjectedGoal / 22);
  const actualRevenueAchieved = employee.monthly_goals?.actual_revenue_achieved || 0;

  // Carregar histórico da base de dados
  React.useEffect(() => {
    loadDailyHistory();
  }, [employee.id]);

  const loadDailyHistory = async () => {
    try {
      setLoading(true);
      const currentMonth = new Date().toISOString().substring(0, 7);
      const records = await base44.entities.MonthlyGoalHistory.filter({
        workshop_id: employee.workshop_id,
        employee_id: employee.id,
        month: currentMonth
      });

      if (records && records.length > 0) {
        // Converter registros do banco para formato do histórico diário
        const formattedHistory = records.map(record => ({
          date: record.reference_date,
          parts_revenue: record.revenue_parts || 0,
          services_revenue: record.revenue_services || 0,
          total_revenue: record.revenue_total || 0,
          notes: record.notes || "",
          area_data: {
            clientes_agendados_base: record.clients_scheduled_base || 0,
            clientes_entregues_base: record.clients_delivered_base || 0,
            clientes_agendados_marketing: record.clients_scheduled_mkt || 0,
            clientes_entregues_marketing: record.clients_delivered_mkt || 0,
            vendas_leads_marketing: record.sales_marketing || 0,
            leads_gerados: record.marketing_data?.leads_generated || 0,
            leads_agendados: record.marketing_data?.leads_scheduled || 0,
            leads_compareceram: record.marketing_data?.leads_showed_up || 0,
            leads_vendidos: record.marketing_data?.leads_sold || 0,
            valor_investido_trafego: record.marketing_data?.invested_value || 0,
            valor_faturado_leads: record.marketing_data?.revenue_from_traffic || 0,
            custo_por_venda: record.marketing_data?.cost_per_sale || 0
          }
        }));
        
        setDailyHistoryFromDB(formattedHistory.sort((a, b) => new Date(b.date) - new Date(a.date)));
      }
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
    } finally {
      setLoading(false);
    }
  };

  // Inicializar dados da meta quando o employee mudar
  React.useEffect(() => {
    const bestMonthRevenue = employee.best_month_history?.revenue_total || 0;
    const currentGoal = employee.monthly_goals?.individual_goal || 0;
    const growthPct = employee.monthly_goals?.growth_percentage || 10;
    
    setGoalFormData({
      individual_goal: currentGoal > 0 ? currentGoal : bestMonthRevenue * 1.1,
      growth_percentage: growthPct
    });
  }, [employee]);

  const handleSubmit = async () => {
    // Calcula faturamento baseado na área/função do colaborador
    let totalRevenue = 0;
    
    if (employee.area === 'tecnico') {
      totalRevenue = parseFloat(formData.faturamento_pecas || 0) + parseFloat(formData.faturamento_servicos || 0);
    } else if (employee.area === 'comercial' || employee.area === 'marketing') {
      totalRevenue = parseFloat(formData.vendas_leads_marketing || 0) + parseFloat(formData.valor_faturado_leads || 0);
    } else {
      totalRevenue = parseFloat(formData.parts_revenue || 0) + parseFloat(formData.services_revenue || 0);
    }
    
    const newEntry = {
      date: formData.date,
      parts_revenue: parseFloat(formData.parts_revenue) || 0,
      services_revenue: parseFloat(formData.services_revenue) || 0,
      total_revenue: totalRevenue,
      notes: formData.notes,
      // Dados específicos por área
      area_data: {
        // Comercial
        clientes_agendados_base: parseFloat(formData.clientes_agendados_base) || 0,
        clientes_agendados_marketing: parseFloat(formData.clientes_agendados_marketing) || 0,
        clientes_entregues_marketing: parseFloat(formData.clientes_entregues_marketing) || 0,
        vendas_leads_marketing: parseFloat(formData.vendas_leads_marketing) || 0,
        // Marketing
        leads_gerados: parseFloat(formData.leads_gerados) || 0,
        leads_agendados: parseFloat(formData.leads_agendados) || 0,
        leads_compareceram: parseFloat(formData.leads_compareceram) || 0,
        leads_vendidos: parseFloat(formData.leads_vendidos) || 0,
        valor_investido_trafego: parseFloat(formData.valor_investido_trafego) || 0,
        valor_faturado_leads: parseFloat(formData.valor_faturado_leads) || 0,
        custo_por_venda: formData.leads_vendidos > 0 ? (parseFloat(formData.valor_investido_trafego) || 0) / parseFloat(formData.leads_vendidos) : 0,
        // Técnico
        faturamento_pecas: parseFloat(formData.faturamento_pecas) || 0,
        faturamento_servicos: parseFloat(formData.faturamento_servicos) || 0,
        qgp_aplicados: parseFloat(formData.qgp_aplicados) || 0,
        clientes_atendidos: parseFloat(formData.clientes_atendidos) || 0,
        // Genérico
        atividades_concluidas: parseFloat(formData.atividades_concluidas) || 0,
        horas_trabalhadas: parseFloat(formData.horas_trabalhadas) || 0,
        observacoes: formData.observacoes || ""
      }
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
    await loadDailyHistory();
    resetForm();
  };

  const handleEdit = (index) => {
    const entry = dailyHistory[index];
    setFormData({
      date: entry.date,
      parts_revenue: entry.parts_revenue || 0,
      services_revenue: entry.services_revenue || 0,
      notes: entry.notes || "",
      // Carregar dados específicos da área se existirem
      clientes_agendados_base: entry.area_data?.clientes_agendados_base || 0,
      clientes_agendados_marketing: entry.area_data?.clientes_agendados_marketing || 0,
      clientes_entregues_marketing: entry.area_data?.clientes_entregues_marketing || 0,
      vendas_leads_marketing: entry.area_data?.vendas_leads_marketing || 0,
      leads_gerados: entry.area_data?.leads_gerados || 0,
      leads_agendados: entry.area_data?.leads_agendados || 0,
      leads_compareceram: entry.area_data?.leads_compareceram || 0,
      leads_vendidos: entry.area_data?.leads_vendidos || 0,
      valor_investido_trafego: entry.area_data?.valor_investido_trafego || 0,
      valor_faturado_leads: entry.area_data?.valor_faturado_leads || 0,
      faturamento_pecas: entry.area_data?.faturamento_pecas || 0,
      faturamento_servicos: entry.area_data?.faturamento_servicos || 0,
      qgp_aplicados: entry.area_data?.qgp_aplicados || 0,
      clientes_atendidos: entry.area_data?.clientes_atendidos || 0,
      atividades_concluidas: entry.area_data?.atividades_concluidas || 0,
      horas_trabalhadas: entry.area_data?.horas_trabalhadas || 0,
      observacoes: entry.area_data?.observacoes || ""
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
    await loadDailyHistory();
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      parts_revenue: 0,
      services_revenue: 0,
      notes: "",
      clientes_agendados_base: 0,
      clientes_agendados_marketing: 0,
      clientes_entregues_marketing: 0,
      vendas_leads_marketing: 0,
      leads_gerados: 0,
      leads_agendados: 0,
      leads_compareceram: 0,
      leads_vendidos: 0,
      valor_investido_trafego: 0,
      valor_faturado_leads: 0,
      faturamento_pecas: 0,
      faturamento_servicos: 0,
      qgp_aplicados: 0,
      clientes_atendidos: 0,
      atividades_concluidas: 0,
      horas_trabalhadas: 0,
      observacoes: ""
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

  const toggleRecordExpansion = (index) => {
    setExpandedRecords(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleSaveGoal = async () => {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const dailyGoalCalculated = goalFormData.individual_goal / 22;

      await onUpdate({
        monthly_goals: {
          ...employee.monthly_goals,
          month: currentMonth,
          individual_goal: parseFloat(goalFormData.individual_goal) || 0,
          daily_projected_goal: dailyGoalCalculated,
          growth_percentage: parseFloat(goalFormData.growth_percentage) || 10,
          actual_revenue_achieved: actualRevenueAchieved
        }
      });

      toast.success("Meta mensal atualizada com sucesso!");
      setEditingGoal(false);
    } catch (error) {
      console.error("Erro ao salvar meta:", error);
      toast.error("Erro ao salvar meta");
    }
  };

  const calculateGoalFromGrowth = () => {
    const bestMonthRevenue = employee.best_month_history?.revenue_total || 0;
    const growthPct = parseFloat(goalFormData.growth_percentage) || 10;
    const calculatedGoal = bestMonthRevenue * (1 + growthPct / 100);
    
    setGoalFormData({
      ...goalFormData,
      individual_goal: calculatedGoal
    });
  };

  return (
    <div className="space-y-6">
      {/* Configuração de Meta Mensal do Colaborador */}
      <Card className="shadow-xl border-2 border-indigo-300 bg-gradient-to-r from-indigo-50 to-purple-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-6 h-6 text-indigo-600" />
              <CardTitle className="text-indigo-900">Meta Mensal do Colaborador</CardTitle>
            </div>
            {!editingGoal ? (
              <Button onClick={() => setEditingGoal(true)} size="sm" variant="outline" className="border-indigo-400">
                <Edit className="w-4 h-4 mr-2" />
                Editar Meta
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditingGoal(false)} size="sm">
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
                <Button onClick={handleSaveGoal} size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                  <Save className="w-4 h-4 mr-2" />
                  Salvar
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editingGoal ? (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg border-2 border-blue-200">
                <p className="text-sm font-semibold text-blue-900 mb-3">📊 Referência - Melhor Mês Histórico</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Faturamento do Melhor Mês:</p>
                    <p className="text-xl font-bold text-blue-600">
                      {employee.best_month_history?.revenue_total ? 
                        `R$ ${(employee.best_month_history.revenue_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
                        : '⚠️ Não definido'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Data:</p>
                    <p className="font-semibold text-gray-900">
                      {employee.best_month_history?.date 
                        ? new Date(employee.best_month_history.date + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
                        : '⚠️ Não registrado'}
                    </p>
                  </div>
                </div>
                {!employee.best_month_history?.revenue_total && (
                  <p className="text-xs text-red-600 mt-2">⚠️ Configure o melhor mês na aba de Dados Pessoais</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>% Crescimento sobre Melhor Mês</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="0.1"
                      value={goalFormData.growth_percentage}
                      onChange={(e) => setGoalFormData({ ...goalFormData, growth_percentage: e.target.value })}
                      className="flex-1"
                    />
                    <Button variant="outline" onClick={calculateGoalFromGrowth} size="sm">
                      Calcular
                    </Button>
                  </div>
                  {employee.best_month_history?.revenue_total ? (
                    <p className="text-xs text-gray-500 mt-1">
                      Ex: 10% = {((employee.best_month_history.revenue_total * 1.1).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))}
                    </p>
                  ) : (
                    <p className="text-xs text-red-500 mt-1">
                      ⚠️ Configure o melhor mês em Dados Pessoais para usar este cálculo
                    </p>
                  )}
                </div>

                <div>
                  <Label>Meta Mensal (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={goalFormData.individual_goal}
                    onChange={(e) => setGoalFormData({ ...goalFormData, individual_goal: e.target.value })}
                    className="text-lg font-bold"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Meta Diária: R$ {(goalFormData.individual_goal / 22).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                <p className="text-xs text-amber-800">
                  💡 <strong>Como funciona:</strong> Defina o percentual de crescimento ou edite a meta diretamente. 
                  A meta diária será calculada automaticamente (Meta Mensal ÷ 22 dias úteis).
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg border-l-4 border-indigo-500 shadow-sm">
                <p className="text-xs text-gray-600 mb-1">Meta Mensal Definida</p>
                <p className="text-2xl font-bold text-indigo-600">
                  R$ {monthlyProjectedGoal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                {monthlyProjectedGoal === 0 && (
                  <p className="text-xs text-red-500 mt-1">⚠️ Defina a meta</p>
                )}
              </div>
              <div className="bg-white p-4 rounded-lg border-l-4 border-purple-500 shadow-sm">
                <p className="text-xs text-gray-600 mb-1">Meta Diária Calculada</p>
                <p className="text-2xl font-bold text-purple-600">
                  R$ {dailyProjectedGoal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500 mt-1">(Meta ÷ 22 dias)</p>
              </div>
              <div className="bg-white p-4 rounded-lg border-l-4 border-green-500 shadow-sm">
                <p className="text-xs text-gray-600 mb-1">Realizado no Mês</p>
                <p className="text-2xl font-bold text-green-600">
                  R$ {actualRevenueAchieved.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg border-l-4 border-orange-500 shadow-sm">
                <p className="text-xs text-gray-600 mb-1">Falta para Meta</p>
                <p className="text-2xl font-bold text-orange-600">
                  R$ {Math.max(0, monthlyProjectedGoal - actualRevenueAchieved).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {monthlyProjectedGoal > 0 && actualRevenueAchieved >= monthlyProjectedGoal ? '🎉 Meta batida!' : 'Para atingir'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cards de Resumo e Metas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="shadow-lg border-2 border-blue-200 bg-blue-50">
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
                {monthlyProjectedGoal === 0 && (
                  <p className="text-xs text-red-600 mt-1">⚠️ Defina a meta acima</p>
                )}
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

        <Card className="shadow-lg border-2 border-gray-200 bg-gray-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <Calendar className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Dias Registrados</p>
                <p className="text-lg font-bold text-gray-900">
                  {dailyHistory.length} dias
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

              <div className="space-y-4">
                <div>
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full md:w-64"
                  />
                </div>

                {/* Formulário específico por área */}
                {(employee.area === 'comercial' || employee.job_role === 'comercial' || employee.job_role === 'consultor_vendas') && (
                  <RegistroComercial 
                    formData={formData}
                    onChange={(data) => setFormData({ ...formData, ...data })}
                  />
                )}

                {(employee.area === 'marketing' || employee.job_role === 'marketing') && (
                  <RegistroMarketing
                    formData={formData}
                    onChange={(data) => setFormData({ ...formData, ...data })}
                  />
                )}

                {(employee.area === 'tecnico' || employee.job_role === 'tecnico' || employee.job_role === 'lider_tecnico') && (
                  <RegistroTecnico
                    formData={formData}
                    onChange={(data) => setFormData({ ...formData, ...data })}
                  />
                )}

                {!['comercial', 'marketing', 'tecnico'].includes(employee.area) && 
                 !['comercial', 'consultor_vendas', 'marketing', 'tecnico', 'lider_tecnico'].includes(employee.job_role) && (
                  <RegistroGenerico
                    formData={formData}
                    onChange={(data) => setFormData({ ...formData, ...data })}
                    jobRole={employee.job_role}
                  />
                )}
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
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500">Carregando histórico...</p>
            </div>
          ) : dailyHistory.length === 0 ? (
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
                const isExpanded = expandedRecords[index];

                return (
                  <Card key={index} className={`hover:shadow-md transition-all ${
                    metaDayAchieved ? 'border-l-4 border-green-500 bg-green-50/30' : 'border-l-4 border-orange-400 bg-orange-50/30'
                  }`}>
                    <CardContent className="p-4">
                      {/* Visão Compacta - Sempre Visível */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          {/* Data */}
                          <div className="text-center min-w-[60px]">
                            <p className="text-2xl font-bold text-gray-900">
                              {new Date(entry.date).getDate()}
                            </p>
                            <p className="text-xs text-gray-500 uppercase">
                              {new Date(entry.date).toLocaleDateString('pt-BR', { month: 'short' })}
                            </p>
                          </div>

                          {/* Info Principal */}
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900 mb-1">
                              {new Date(entry.date).toLocaleDateString('pt-BR', { 
                                weekday: 'long', 
                                day: '2-digit', 
                                month: 'long'
                              })}
                            </p>

                            {/* Indicador de Meta */}
                            <div className="flex items-center gap-2">
                              <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                metaDayAchieved 
                                  ? 'bg-green-500 text-white' 
                                  : dailyAchievementPercentage >= 70 
                                    ? 'bg-yellow-500 text-white'
                                    : 'bg-red-500 text-white'
                              }`}>
                                {metaDayAchieved ? '✓ Meta Atingida' : `${dailyAchievementPercentage.toFixed(0)}% da meta`}
                              </div>
                            </div>
                          </div>

                          {/* Previsto e Realizado - Lado a Lado */}
                          <div className="flex gap-3 items-stretch">
                            <div className="text-right bg-purple-50 px-3 py-2 rounded-lg border border-purple-200 shadow-sm min-w-[120px]">
                              <p className="text-xs text-purple-600 font-semibold mb-1">Previsto</p>
                              <p className="text-lg font-bold text-purple-600">
                                R$ {dailyProjectedGoal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                            <div className="text-right bg-white px-3 py-2 rounded-lg border border-green-200 shadow-sm min-w-[120px]">
                              <p className="text-xs text-gray-500 font-semibold mb-1">Realizado</p>
                              <p className={`text-lg font-bold ${metaDayAchieved ? 'text-green-600' : 'text-orange-600'}`}>
                                R$ {entry.total_revenue.toFixed(2)}
                              </p>
                            </div>
                          </div>

                          {/* Botão Expandir */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleRecordExpansion(index)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            {isExpanded ? (
                              <>
                                <X className="w-4 h-4 mr-1" />
                                Fechar
                              </>
                            ) : (
                              <>
                                <Eye className="w-4 h-4 mr-1" />
                                Detalhes
                              </>
                            )}
                          </Button>

                          {/* Ações */}
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEdit(index)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 w-8"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDelete(index)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Detalhes Expandidos */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                          {/* Detalhamento de Faturamento */}
                          <div className="grid grid-cols-3 gap-4">
                            <div className="bg-blue-50 p-3 rounded-lg">
                              <p className="text-xs text-blue-700 mb-1">Faturamento Peças</p>
                              <p className="text-lg font-bold text-blue-600">
                                R$ {entry.parts_revenue.toFixed(2)}
                              </p>
                            </div>
                            <div className="bg-green-50 p-3 rounded-lg">
                              <p className="text-xs text-green-700 mb-1">Faturamento Serviços</p>
                              <p className="text-lg font-bold text-green-600">
                                R$ {entry.services_revenue.toFixed(2)}
                              </p>
                            </div>
                            <div className="bg-purple-50 p-3 rounded-lg">
                              <p className="text-xs text-purple-700 mb-1">Total do Dia</p>
                              <p className="text-lg font-bold text-purple-600">
                                R$ {entry.total_revenue.toFixed(2)}
                              </p>
                            </div>
                          </div>

                          {/* Meta vs Realizado */}
                          <div className="bg-white border-2 border-gray-200 p-3 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-semibold text-gray-700">Meta Diária vs Realizado</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs text-gray-600 mb-1">Meta Diária (Previsto)</p>
                                <p className="text-lg font-bold text-purple-600">
                                  R$ {dailyProjectedGoal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-600 mb-1">Atingimento</p>
                                <p className={`text-lg font-bold ${
                                  metaDayAchieved ? 'text-green-600' : 'text-orange-600'
                                }`}>
                                  {dailyAchievementPercentage.toFixed(1)}%
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {metaDayAchieved 
                                    ? '✅ Meta do dia batida!' 
                                    : `Faltaram R$ ${(dailyProjectedGoal - entry.total_revenue).toFixed(2)}`
                                  }
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Notas/Observações */}
                          {entry.notes && (
                            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                              <p className="text-xs text-yellow-800 font-semibold mb-1">📝 Observações:</p>
                              <p className="text-sm text-gray-700">{entry.notes}</p>
                            </div>
                          )}
                        </div>
                      )}
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