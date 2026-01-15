import React, { useState } from "react";
import { useEmployeeMetrics } from "@/components/hooks/useEmployeeMetrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, DollarSign, Edit, Trash2, Target, TrendingUp, Eye, Plus, X, Save } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import ManualGoalRegistration from "@/components/goals/ManualGoalRegistration";

export default function HistoricoDiarioProducao({ employee, onUpdate }) {
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingGoal, setEditingGoal] = useState(false);
  const [expandedRecords, setExpandedRecords] = useState({});
  const [dailyHistoryFromDB, setDailyHistoryFromDB] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showManualRegistration, setShowManualRegistration] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [goalFormData, setGoalFormData] = useState({ growth_percentage: 10, individual_goal: 0 });
  const { bestMonthData, monthlyGoalsData, updateMonthlyGoals } = useEmployeeMetrics(employee);

  const dailyHistory = dailyHistoryFromDB.length > 0 ? dailyHistoryFromDB : (employee.daily_production_history || []);
  
  // Cálculo de metas sincronizado via hook
  const monthlyProjectedGoal = monthlyGoalsData?.individual_goal || 0;
  const dailyProjectedGoal = monthlyGoalsData?.daily_projected_goal || (monthlyProjectedGoal / 22);
  const actualRevenueAchieved = monthlyGoalsData?.actual_revenue_achieved || 0;

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

  // Sincronizar meta quando o employee mudar
  React.useEffect(() => {
    setEditingGoal(false);
  }, [employee.id]);

  const handleRegistrationSave = async () => {
    // Recarregar histórico após salvar via ManualGoalRegistration
    await loadDailyHistory();
    setShowManualRegistration(false);
    setEditingRecord(null);
    toast.success("Registro salvo com sucesso!");
  };

  const handleDelete = async (recordId) => {
    if (!confirm("Deseja realmente excluir este registro?")) return;

    try {
      await base44.entities.MonthlyGoalHistory.delete(recordId);
      toast.success("Registro excluído com sucesso!");
      await loadDailyHistory();
    } catch (error) {
      console.error("Erro ao deletar registro:", error);
      toast.error("Erro ao deletar registro");
    }
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

  const calculateGoalFromGrowth = () => {
    if (bestMonthData?.revenue_total) {
      const newGoal = bestMonthData.revenue_total * (1 + goalFormData.growth_percentage / 100);
      setGoalFormData({ ...goalFormData, individual_goal: newGoal });
    }
  };

  const handleSaveGoal = async () => {
    try {
      const newGoalsData = {
        ...monthlyGoalsData,
        growth_percentage: parseFloat(goalFormData.growth_percentage) || 10,
        individual_goal: parseFloat(goalFormData.individual_goal) || 0,
        daily_projected_goal: (parseFloat(goalFormData.individual_goal) || 0) / 22
      };
      
      const success = await updateMonthlyGoals(newGoalsData);
      if (success) {
        setGoalFormData(newGoalsData);
        setEditingGoal(false);
      }
    } catch (error) {
      console.error("Erro ao salvar meta:", error);
    }
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
                      {bestMonthData?.revenue_total ? 
                        `R$ ${(bestMonthData.revenue_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
                        : '⚠️ Não definido'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Data:</p>
                    <p className="font-semibold text-gray-900">
                      {bestMonthData?.date 
                        ? new Date(bestMonthData.date + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
                        : '⚠️ Não registrado'}
                    </p>
                  </div>
                </div>
                {!bestMonthData?.revenue_total && (
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
                  {bestMonthData?.revenue_total ? (
                   <p className="text-xs text-gray-500 mt-1">
                     Ex: 10% = {((bestMonthData.revenue_total * 1.1).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))}
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
             <Button onClick={() => {
               setShowManualRegistration(true);
               setEditingRecord(null);
             }} className="bg-blue-600 hover:bg-blue-700">
               <Plus className="w-4 h-4 mr-2" />
               Novo Registro
             </Button>
           </div>
         </CardHeader>
         <CardContent>

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
                  <Card key={`${entry.date}-${index}`} className={`hover:shadow-md transition-all ${
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
                              onClick={() => {
                                setEditingRecord(entry);
                                setShowManualRegistration(true);
                              }}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 w-8"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDelete(entry.id)}
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

          {/* Modal Unificado */}
          <ManualGoalRegistration
          open={showManualRegistration}
          onClose={() => {
          setShowManualRegistration(false);
          setEditingRecord(null);
          }}
          workshop={{ id: employee.workshop_id }}
          editingRecord={editingRecord}
          onSave={handleRegistrationSave}
          />
          </div>
          );
          }