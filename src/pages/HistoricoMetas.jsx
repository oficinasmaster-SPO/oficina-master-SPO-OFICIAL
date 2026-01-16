import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "react-router-dom";
import { Plus, Download, Target, TrendingUp, Award, AlertCircle, Building2, User, X, Activity, BarChart3, Calendar, DollarSign, CheckCircle2, Eye, EyeOff, RefreshCw, Trash2 } from "lucide-react";
import { formatCurrency, formatNumber } from "../components/utils/formatters";
import ManualGoalRegistration from "../components/goals/ManualGoalRegistration";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import AdminViewBanner from "../components/shared/AdminViewBanner";
import { useSyncData } from "../components/hooks/useSyncData";

export default function HistoricoMetas() {
  const [workshop, setWorkshop] = useState(null);
  const [user, setUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [filterType, setFilterType] = useState("workshop");
  const [filterEmployee, setFilterEmployee] = useState(null);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().substring(0, 7));
  const [expandedCards, setExpandedCards] = useState({});
  const [showAllRecords, setShowAllRecords] = useState(true); // Sempre mostrar todos por padrão
  const queryClient = useQueryClient();
  const [isAdminView, setIsAdminView] = useState(false);
  const location = useLocation();
  const { syncMonthlyData, updateDREFromMonthlyGoals } = useSyncData();

  useEffect(() => {
    loadUser();
  }, [location.search]);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // Verificar se há workshop_id na URL (admin visualizando)
      const urlParams = new URLSearchParams(location.search);
      const adminWorkshopId = urlParams.get('workshop_id');

      let userWorkshop = null;
      
      if (adminWorkshopId && currentUser.role === 'admin') {
        // Admin visualizando oficina específica
        userWorkshop = await base44.entities.Workshop.get(adminWorkshopId);
        setIsAdminView(true);
      } else {
        // Fluxo normal
        const workshops = await base44.entities.Workshop.filter({ owner_id: currentUser.id });
        if (workshops.length > 0) {
          userWorkshop = workshops[0];
        }
        setIsAdminView(false);
      }
      
      setWorkshop(userWorkshop);
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  const { data: goalHistory = [], isLoading, refetch: refetchGoals, isFetching } = useQuery({
    queryKey: ['goal-history', workshop?.id, filterType, filterEmployee, filterMonth],
    queryFn: async () => {
      if (!workshop) return [];
      
      // Força reload do workshop para pegar dados atualizados do melhor mês
      const updatedWorkshop = await base44.entities.Workshop.get(workshop.id);
      setWorkshop(updatedWorkshop);
      
      let query = { workshop_id: workshop.id };
      
      if (filterType === "employee" && filterEmployee) {
        query.employee_id = filterEmployee;
      }
      // Se filtro é "workshop", busca TODOS os registros da oficina (não filtra por entity_type)

      if (filterMonth) {
        query.month = filterMonth;
      }

      const result = await base44.entities.MonthlyGoalHistory.filter(query);
      return result.sort((a, b) => new Date(b.reference_date) - new Date(a.reference_date));
    },
    enabled: !!workshop,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    staleTime: 0,
    cacheTime: 0
  });

  const { data: employees = [], refetch: refetchEmployees } = useQuery({
    queryKey: ['employees', workshop?.id, filterEmployee],
    queryFn: async () => {
      if (!workshop) return [];
      const allEmployees = await base44.entities.Employee.filter({ 
        workshop_id: workshop.id,
        status: "ativo"
      });
      // Força reload individual para pegar melhor mês atualizado
      const employeesWithUpdatedData = await Promise.all(
        allEmployees.map(emp => base44.entities.Employee.get(emp.id))
      );
      return employeesWithUpdatedData;
    },
    enabled: !!workshop,
    refetchOnWindowFocus: true,
    staleTime: 0
  });

  // NOVO: Buscar faturamento REAL de VendasServicos
  const { data: vendasMes = [] } = useQuery({
    queryKey: ['vendas-mes', workshop?.id, filterMonth],
    queryFn: async () => {
      if (!workshop) return [];
      const vendas = await base44.entities.VendasServicos.filter({
        workshop_id: workshop.id,
        month: filterMonth
      });
      return vendas || [];
    },
    enabled: !!workshop,
    staleTime: 0
  });

  const handleExport = () => {
    toast.info("Exportação em desenvolvimento...");
  };

  const toggleCardExpansion = (recordId) => {
    setExpandedCards(prev => ({
      ...prev,
      [recordId]: !prev[recordId]
    }));
  };

  if (!workshop) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        
        {isAdminView && workshop && (
          <AdminViewBanner workshopName={workshop.name} />
        )}
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Target className="w-8 h-8 text-blue-600" />
              Histórico da Produção Diária
            </h1>
            <p className="text-gray-600 mt-2">
              Acompanhe os resultados e desempenho da oficina e colaboradores
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={async () => {
                try {
                  toast.info("Sincronizando dados...");
                  const response = await base44.functions.invoke('syncEmployeeRealized', {
                    workshop_id: workshop.id,
                    month: filterMonth
                  });
                  
                  if (response.data.success) {
                    toast.success(`✅ ${response.data.employees_synced} colaboradores sincronizados!`);
                    queryClient.invalidateQueries(['goal-history']);
                    queryClient.invalidateQueries(['shared-workshop']);
                    queryClient.invalidateQueries(['shared-employees']);
                    refetchGoals();
                    refetchEmployees();
                  }
                } catch (error) {
                  console.error("Erro na sincronização:", error);
                  toast.error("Erro ao sincronizar dados");
                }
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Sincronizar Tudo
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                queryClient.invalidateQueries(['goal-history']);
                refetchGoals();
              }}
              disabled={isFetching}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              {isFetching ? 'Atualizando...' : 'Atualizar'}
            </Button>
            <Button variant="outline" onClick={() => window.location.href = createPageUrl("GraficosProducao")}>
              <BarChart3 className="w-4 h-4 mr-2" />
              Gráficos
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Novo Registro Manual
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Filtrar por</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="workshop">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Oficina (Geral)
                      </div>
                    </SelectItem>
                    <SelectItem value="employee">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Colaborador
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filterType === "employee" && (
                <div>
                  <Label>Colaborador</Label>
                  <Select value={filterEmployee} onValueChange={setFilterEmployee}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os colaboradores" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Todos</SelectItem>
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.full_name} - {emp.position}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              </div>

              <div className="mt-4">
              <Label>Filtrar por Mês</Label>
              <Input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="max-w-xs"
              />
              </div>

              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAllRecords(!showAllRecords)}
                  className="w-full"
                >
                  {showAllRecords ? (
                    <>
                      <EyeOff className="w-4 h-4 mr-2" />
                      Ocultar registros sem faturamento
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      Mostrar todos os registros (incluindo sem faturamento)
                    </>
                  )}
                </Button>
                <p className="text-xs text-gray-500 mt-1">
                  {showAllRecords 
                    ? "Mostrando todos os registros, inclusive dias sem faturamento (para editar dados de marketing, agendamentos, etc.)" 
                    : "Mostrando apenas dias com faturamento registrado"}
                </p>
              </div>
              </CardContent>
              </Card>

        {/* Resumo da Oficina (Geral) */}
        {filterType === "workshop" && (() => {
          const currentMonth = new Date().toISOString().slice(0, 7);
          const currentMonthRecords = goalHistory.filter(
            record => record.entity_type === "workshop" && record.month === currentMonth
          );

          // PUXAR FATURAMENTO REAL (sem duplicação) de VendasServicos
          const vendasDoMes = vendasMes.filter(v => v.month === currentMonth);
          const monthlyActualRevenue = vendasDoMes.reduce((sum, v) => sum + (v.valor_total || 0), 0);

          // Puxar meta projetada corretamente: Melhor Mês + % Crescimento
          // Usar dados sincronizados do workshop se disponível
          const bestMonthRevenue = workshop.best_month_history?.revenue_total || 0;
          const growthPercentage = workshop.monthly_goals?.growth_percentage || 10;
          const monthlyGoal = bestMonthRevenue > 0 
            ? bestMonthRevenue * (1 + growthPercentage / 100)
            : workshop.monthly_goals?.individual_goal || 0;
          const actualRevenue = monthlyActualRevenue;
          
          const achievementPercentage = monthlyGoal > 0 ? (actualRevenue / monthlyGoal) * 100 : 0;
          const missingToGoal = Math.max(0, monthlyGoal - actualRevenue);

          return (
            <Card className="mb-6 shadow-xl border-2 border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-6 h-6 text-blue-600" />
                    <div>
                      <CardTitle className="text-xl text-blue-900">{workshop.name}</CardTitle>
                      <p className="text-sm text-gray-600">Resumo Geral da Oficina - {new Date(currentMonth + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-600 mb-1">Atingimento</p>
                    <Badge className={`text-lg px-4 py-2 ${
                      achievementPercentage >= 100 ? 'bg-green-100 text-green-800' : 
                      achievementPercentage >= 70 ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-red-100 text-red-800'
                    }`}>
                      {achievementPercentage.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-lg border-l-4 border-blue-500 shadow-sm">
                    <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      Meta Mensal (Previsto)
                    </p>
                    <p className="text-2xl font-bold text-blue-600">
                      R$ {formatCurrency(monthlyGoal)}
                    </p>
                    {monthlyGoal === 0 && (
                      <p className="text-xs text-red-500 mt-1">⚠️ Meta não definida</p>
                    )}
                  </div>
                  <div className="bg-white p-4 rounded-lg border-l-4 border-green-500 shadow-sm">
                    <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Realizado no Mês
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      R$ {formatCurrency(actualRevenue)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {currentMonthRecords.length} registro(s) no mês
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border-l-4 border-orange-500 shadow-sm">
                    <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Falta para Meta
                    </p>
                    <p className={`text-2xl font-bold ${achievementPercentage >= 100 ? 'text-green-600' : 'text-orange-600'}`}>
                      R$ {formatCurrency(missingToGoal)}
                    </p>
                    {achievementPercentage >= 100 ? (
                      <p className="text-xs text-green-600 mt-1 font-semibold">🎉 Meta batida!</p>
                    ) : (
                      <p className="text-xs text-gray-500 mt-1">Para atingir</p>
                    )}
                  </div>
                  <div className="bg-white p-4 rounded-lg border-l-4 border-purple-500 shadow-sm">
                    <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      Dias Registrados
                    </p>
                    <p className="text-2xl font-bold text-purple-600">
                      {currentMonthRecords.length}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      no mês atual
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Resumo do Colaborador Selecionado */}
        {filterType === "employee" && filterEmployee && (() => {
          const selectedEmployee = employees.find(e => e.id === filterEmployee);
          if (!selectedEmployee) {
            return (
              <Card className="mb-6 shadow-xl border-2 border-red-300 bg-red-50">
                <CardContent className="p-6 text-center">
                  <p className="text-red-600">Colaborador não encontrado. Por favor, selecione novamente.</p>
                </CardContent>
              </Card>
            );
          }

          // Calcular o mês atual
          const currentMonth = new Date().toISOString().slice(0, 7);
          
          // Buscar registros do mês atual para este colaborador
          const currentMonthRecords = goalHistory.filter(
            record => record.employee_id === filterEmployee && record.month === currentMonth
          );
          
          // PUXAR FATURAMENTO REAL de VendasServicos (sem duplicação)
          const vendasDoColaborador = vendasMes.filter(v => {
            // Buscar se esse colaborador participou desta venda
            return v.month === currentMonth;
          });
          
          // Somar APENAS vendas onde o colaborador tem atribuição
          const monthlyActualRevenue = 0; // será calculado via atribuições

          // Puxar meta projetada corretamente: Melhor Mês + % Crescimento
          const bestMonthRevenue = selectedEmployee.best_month_history?.revenue_total || 0;
          const growthPercentage = selectedEmployee.monthly_goals?.growth_percentage || 10;
          const monthlyGoal = selectedEmployee.monthly_goals?.individual_goal || 
            (bestMonthRevenue > 0 ? bestMonthRevenue * (1 + growthPercentage / 100) : 0);
          const dailyGoalCalculated = monthlyGoal > 0 ? monthlyGoal / 22 : 0;
          const dailyGoal = selectedEmployee.monthly_goals?.daily_projected_goal || dailyGoalCalculated;
          
          // Usar APENAS o valor calculado dos registros
          const actualRevenue = monthlyActualRevenue;
          
          const achievementPercentage = monthlyGoal > 0 ? (actualRevenue / monthlyGoal) * 100 : 0;
          const missingToGoal = Math.max(0, monthlyGoal - actualRevenue);

          return (
            <Card className="mb-6 shadow-xl border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-blue-50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <User className="w-6 h-6 text-purple-600" />
                    <div>
                      <CardTitle className="text-xl text-purple-900">{selectedEmployee.full_name}</CardTitle>
                      <p className="text-sm text-gray-600">{selectedEmployee.position} - {selectedEmployee.area || "Geral"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-600 mb-1">Atingimento</p>
                    <Badge className={`text-lg px-4 py-2 ${
                      achievementPercentage >= 100 ? 'bg-green-100 text-green-800' : 
                      achievementPercentage >= 70 ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-red-100 text-red-800'
                    }`}>
                      {achievementPercentage.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-lg border-l-4 border-blue-500 shadow-sm">
                    <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      Meta Mensal (Previsto)
                    </p>
                    <p className="text-2xl font-bold text-blue-600">
                      R$ {formatCurrency(monthlyGoal)}
                    </p>
                    {monthlyGoal === 0 && (
                      <p className="text-xs text-red-500 mt-1">⚠️ Meta não definida</p>
                    )}
                  </div>
                  <div className="bg-white p-4 rounded-lg border-l-4 border-purple-500 shadow-sm">
                    <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      Meta Diária
                    </p>
                    <p className="text-2xl font-bold text-purple-600">
                      R$ {formatCurrency(dailyGoal)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {dailyGoalCalculated > 0 ? `(${formatCurrency(monthlyGoal)} ÷ 22 dias)` : 'Não calculada'}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border-l-4 border-green-500 shadow-sm">
                    <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Realizado no Mês
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      R$ {formatCurrency(actualRevenue)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {currentMonthRecords.length} registro(s) no mês
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border-l-4 border-orange-500 shadow-sm">
                    <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Falta para Meta
                    </p>
                    <p className={`text-2xl font-bold ${achievementPercentage >= 100 ? 'text-green-600' : 'text-orange-600'}`}>
                      R$ {formatCurrency(missingToGoal)}
                    </p>
                    {achievementPercentage >= 100 ? (
                      <p className="text-xs text-green-600 mt-1 font-semibold">🎉 Meta batida!</p>
                    ) : (
                      <p className="text-xs text-gray-500 mt-1">Para atingir</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Lista de Histórico */}
        <div className="space-y-4">
          {isLoading ? (
            <Card className="shadow-lg">
              <CardContent className="p-12 text-center">
                <p className="text-gray-500">Carregando histórico...</p>
              </CardContent>
            </Card>
          ) : goalHistory.length === 0 ? (
            <Card className="shadow-lg">
              <CardContent className="p-12 text-center">
                <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">Nenhum registro encontrado</p>
                <Button onClick={() => setShowModal(true)} className="bg-blue-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeiro Registro
                </Button>
              </CardContent>
            </Card>
          ) : (
            goalHistory
              .filter(record => showAllRecords || (record.revenue_total > 0 || record.achieved_total > 0))
              .map((record) => {
              const achievementPercentage = record.projected_total > 0 
                ? (record.achieved_total / record.projected_total) * 100 
                : 0;

              const employee = employees.find(e => e.id === record.employee_id);
              const isExpanded = expandedCards[record.id];
              const metaAchieved = achievementPercentage >= 100;
              const hasFaturamento = (record.revenue_total > 0 || record.achieved_total > 0);

              return (
                <Card key={record.id} className={`hover:shadow-lg transition-all ${
                  !hasFaturamento ? 'border-l-4 border-gray-400 bg-gray-50/30' :
                  metaAchieved ? 'border-l-4 border-green-500 bg-green-50/30' : 'border-l-4 border-orange-400 bg-orange-50/30'
                }`}>
                  <CardContent className="p-4">
                    {/* Visão Compacta - Sempre Visível */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        {/* Data */}
                        <div className="text-center min-w-[70px]">
                          <p className="text-3xl font-bold text-gray-900">
                            {new Date(record.reference_date).getDate()}
                          </p>
                          <p className="text-xs text-gray-500 uppercase">
                            {new Date(record.reference_date).toLocaleDateString('pt-BR', { month: 'short' })}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(record.reference_date).getFullYear()}
                          </p>
                        </div>

                        {/* Info Principal */}
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 mb-1">
                            {new Date(record.reference_date).toLocaleDateString('pt-BR', { 
                              weekday: 'long', 
                              day: '2-digit', 
                              month: 'long'
                            })}
                          </p>
                          {employee && (
                            <p className="text-xs text-gray-600">
                              {employee.full_name} - {employee.position}
                            </p>
                          )}

                          {/* Indicador de Meta */}
                          <div className="flex items-center gap-2 mt-2">
                            {!hasFaturamento ? (
                              <div className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-400 text-white">
                                Sem Faturamento
                              </div>
                            ) : (
                              <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                metaAchieved 
                                  ? 'bg-green-500 text-white' 
                                  : achievementPercentage >= 70 
                                    ? 'bg-yellow-500 text-white'
                                    : 'bg-red-500 text-white'
                              }`}>
                                {metaAchieved ? '✓ Meta Atingida' : `${achievementPercentage.toFixed(0)}% da meta`}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Valores - Compacto */}
                        <div className="flex gap-3">
                          <div className="text-center bg-blue-50 px-4 py-2 rounded-lg shadow-sm min-w-[120px]">
                            <p className="text-xs text-blue-700 mb-1">Previsto</p>
                            <p className="text-xl font-bold text-blue-600">
                              R$ {formatCurrency(record.projected_total || 0)}
                            </p>
                            {(!record.projected_total || record.projected_total === 0) && (
                              <p className="text-xs text-orange-500 mt-1">Meta não definida</p>
                            )}
                          </div>
                          <div className="text-center bg-white px-4 py-2 rounded-lg shadow-sm min-w-[120px]">
                            <p className="text-xs text-purple-700 mb-1">Realizado</p>
                            <p className={`text-xl font-bold ${metaAchieved ? 'text-green-600' : 'text-orange-600'}`}>
                              R$ {formatCurrency(record.achieved_total)}
                            </p>
                          </div>
                        </div>

                        {/* Botão Expandir - Sempre visível para permitir edição de dados de marketing */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleCardExpansion(record.id)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          {isExpanded ? (
                            <>
                              <X className="w-4 h-4 mr-1" />
                              Fechar
                            </>
                          ) : (
                            <>
                              <Target className="w-4 h-4 mr-1" />
                              Detalhes
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Detalhes Expandidos */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                        {/* Detalhamento de Faturamento */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                            <p className="text-xs text-blue-700 mb-1">Faturamento Peças</p>
                            <p className="text-lg font-bold text-blue-600">
                              R$ {formatCurrency(record.revenue_parts)}
                            </p>
                          </div>
                          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                            <p className="text-xs text-green-700 mb-1">Faturamento Serviços</p>
                            <p className="text-lg font-bold text-green-600">
                              R$ {formatCurrency(record.revenue_services)}
                            </p>
                          </div>
                          <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                            <p className="text-xs text-purple-700 mb-1">Total Faturado</p>
                            <p className="text-lg font-bold text-purple-600">
                              R$ {formatCurrency(record.revenue_total)}
                            </p>
                          </div>
                        </div>

                        {/* Clientes e Ticket Médio */}
                        {record.customer_volume > 0 && (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-200">
                              <p className="text-xs text-indigo-700 mb-1">Clientes Atendidos</p>
                              <p className="text-lg font-bold text-indigo-600">
                                {record.customer_volume} clientes
                              </p>
                            </div>
                            <div className="bg-pink-50 p-3 rounded-lg border border-pink-200">
                              <p className="text-xs text-pink-700 mb-1">Ticket Médio</p>
                              <p className="text-lg font-bold text-pink-600">
                                R$ {formatCurrency(record.average_ticket || 0)}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Detalhes Comerciais */}
                        {(record.pave_commercial > 0 || record.kit_master > 0 || record.sales_base > 0 || record.sales_marketing > 0 || record.clients_delivered > 0) && (
                          <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-200">
                            <p className="text-sm font-semibold text-indigo-900 mb-2">🎯 Comercial</p>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                              {record.pave_commercial > 0 && (
                                <div>
                                  <p className="text-gray-600">PAVE (Leads Base):</p>
                                  <p className="font-bold">{record.pave_commercial} leads</p>
                                </div>
                              )}
                              {record.kit_master > 0 && (
                                <div>
                                  <p className="text-gray-600">Kit Master:</p>
                                  <p className="font-bold">R$ {formatCurrency(record.kit_master)}</p>
                                </div>
                              )}
                              {record.sales_base > 0 && (
                                <div>
                                  <p className="text-gray-600">Vendas Base:</p>
                                  <p className="font-bold">R$ {formatCurrency(record.sales_base)}</p>
                                </div>
                              )}
                              {record.sales_marketing > 0 && (
                                <div>
                                  <p className="text-gray-600">Vendas Mkt:</p>
                                  <p className="font-bold">R$ {formatCurrency(record.sales_marketing)}</p>
                                </div>
                              )}
                              {record.clients_delivered > 0 && (
                                <div>
                                  <p className="text-gray-600">Clientes Entregues:</p>
                                  <p className="font-bold">{record.clients_delivered}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Detalhes de Agendamento - Comercial */}
                        {(record.clients_scheduled_base > 0 || record.clients_delivered_base > 0 || 
                          record.clients_scheduled_mkt > 0 || record.clients_delivered_mkt > 0 ||
                          record.clients_scheduled_referral > 0 || record.clients_delivered_referral > 0) && (
                          <div className="bg-teal-50 p-3 rounded-lg border border-teal-200">
                            <p className="text-sm font-semibold text-teal-900 mb-2">📅 Agendamentos e Entregas</p>
                            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
                              <div>
                                <p className="text-gray-600">Agend. Base:</p>
                                <p className="font-bold">{record.clients_scheduled_base || 0}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Entreg. Base:</p>
                                <p className="font-bold">{record.clients_delivered_base || 0}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Agend. Mkt:</p>
                                <p className="font-bold">{record.clients_scheduled_mkt || 0}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Entreg. Mkt:</p>
                                <p className="font-bold">{record.clients_delivered_mkt || 0}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Agend. Indic.:</p>
                                <p className="font-bold">{record.clients_scheduled_referral || 0}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Entreg. Indic.:</p>
                                <p className="font-bold">{record.clients_delivered_referral || 0}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Marketing Data */}
                        {record.marketing_data && record.marketing_data.leads_generated > 0 && (
                          <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                            <p className="text-sm font-semibold text-purple-900 mb-2">📣 Marketing</p>
                            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                              <div>
                                <p className="text-gray-600">Leads:</p>
                                <p className="font-bold">{record.marketing_data.leads_generated}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Agendados:</p>
                                <p className="font-bold">{record.marketing_data.leads_scheduled}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Comparec.:</p>
                                <p className="font-bold">{record.marketing_data.leads_showed_up}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Vendidos:</p>
                                <p className="font-bold">{record.marketing_data.leads_sold}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Investido:</p>
                                <p className="font-bold">R$ {formatCurrency(record.marketing_data.invested_value || 0)}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Custo/Venda:</p>
                                <p className="font-bold">R$ {formatCurrency(record.marketing_data.cost_per_sale || 0)}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Observações */}
                        {record.notes && (
                         <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                           <p className="text-xs font-semibold text-yellow-900 mb-1">📝 Observações</p>
                           <p className="text-sm text-gray-700">{record.notes}</p>
                         </div>
                        )}

                        {/* Botões de Ação */}
                        <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={async () => {
                             if (window.confirm('Tem certeza que deseja excluir este registro permanentemente? Esta ação não pode ser desfeita.')) {
                               try {
                                 await base44.entities.MonthlyGoalHistory.delete(record.id);
                                 toast.success('Registro excluído com sucesso!');
                                 queryClient.invalidateQueries(['goal-history']);
                                 refetchGoals();
                               } catch (error) {
                                 console.error('Erro ao excluir:', error);
                                 toast.error('Erro ao excluir o registro');
                               }
                             }
                           }}
                           className="text-red-600 hover:text-red-700 hover:bg-red-50"
                         >
                           <Trash2 className="w-4 h-4 mr-2" />
                           Excluir
                         </Button>
                         <Button
                           size="sm"
                           onClick={() => {
                             setEditingRecord(record);
                             setShowModal(true);
                             toggleCardExpansion(record.id);
                           }}
                           className="bg-blue-600 hover:bg-blue-700"
                         >
                           <Activity className="w-4 h-4 mr-2" />
                           Editar Registro
                         </Button>
                        </div>
                        </div>
                        )}
                        </CardContent>
                        </Card>
                        );
                        })
                        )}
                        </div>

        {/* Modal de Registro */}
        <ManualGoalRegistration
         open={showModal}
         onClose={() => {
           setShowModal(false);
           setEditingRecord(null);
         }}
         workshop={workshop}
         editingRecord={editingRecord}
         key={`${workshop?.id}-${showModal}`}
          onSave={async () => {
            // Sincronizar após salvar registro
            if (workshop) {
              // 1. Atualizar DRE com valores consolidados dos registros diários
              await updateDREFromMonthlyGoals(workshop.id, filterMonth);
              // 2. Sincronizar dados mensais
              await syncMonthlyData(workshop.id, filterMonth);
            }
            queryClient.invalidateQueries(['goal-history']);
            queryClient.invalidateQueries(['dre-list']);
            queryClient.invalidateQueries(['employees']);
            refetchEmployees();
            setEditingRecord(null);
          }}
        />
      </div>
    </div>
  );
}