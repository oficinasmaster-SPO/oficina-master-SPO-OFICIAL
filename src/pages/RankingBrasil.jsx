import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Medal, Award, TrendingUp, Users, Building2, BarChart3, Target, DollarSign, Percent } from "lucide-react";
import { formatCurrency, formatPercent } from "@/components/utils/formatters";
import { Loader2 } from "lucide-react";

export default function RankingBrasil() {
  const [selectedArea, setSelectedArea] = useState("all");

  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ['employees-all'],
    queryFn: () => base44.entities.Employee.list(null, 200)
  });

  const { data: workshops = [], isLoading: loadingWorkshops } = useQuery({
    queryKey: ['workshops-all'],
    queryFn: () => base44.entities.Workshop.list(null, 200)
  });

  const { data: history = [], isLoading: loadingHistory } = useQuery({
    queryKey: ['history-all'],
    queryFn: () => base44.entities.MonthlyGoalHistory.filter({ entity_type: 'workshop' }, '-revenue_total', 300)
  });

  const isLoading = loadingEmployees || loadingWorkshops || loadingHistory;

  const getEmployeeRanking = () => {
    let filtered = employees.filter(e => e.status === "ativo");
    
    if (selectedArea !== "all") {
      filtered = filtered.filter(e => e.area === selectedArea);
    }

    return filtered
      .map(emp => {
        const totalProduction = (emp.production_parts || 0) + 
                               (emp.production_parts_sales || 0) + 
                               (emp.production_services || 0);
        const totalCost = (emp.salary || 0) + (emp.commission || 0) + (emp.bonus || 0);
        const productivity = totalCost > 0 ? (totalProduction / totalCost) * 100 : 0;

        const workshop = workshops.find(w => w.id === emp.workshop_id);

        return {
          id: emp.id,
          name: emp.full_name,
          position: emp.position,
          area: emp.area,
          workshopName: workshop?.name || "Sem oficina",
          city: workshop?.city || "-",
          state: workshop?.state || "-",
          totalProduction,
          productivity
        };
      })
      .sort((a, b) => b.productivity - a.productivity);
  };

  const getWorkshopRanking = () => {
    // 1. Processar histórico para encontrar o melhor mês de cada oficina
    const bestHistoryByWorkshop = {};
    
    // Ordena histórico por faturamento decrescente para pegar o melhor primeiro
    const sortedHistory = [...history].sort((a, b) => (b.revenue_total || 0) - (a.revenue_total || 0));
    
    sortedHistory.forEach(record => {
      // Se ainda não temos um registro para esta oficina, este é o melhor (pois está ordenado)
      if (record.workshop_id && !bestHistoryByWorkshop[record.workshop_id]) {
        bestHistoryByWorkshop[record.workshop_id] = record;
      }
    });

    return workshops
      .map(workshop => {
        // Prioridade: 1. Histórico (Melhor Mês Global) | 2. Best Month no Cadastro | 3. Metas Atuais
        const historyRecord = bestHistoryByWorkshop[workshop.id];
        const registeredBest = workshop.best_month_history;
        const currentGoals = workshop.monthly_goals;

        // Fonte de dados consolidada
        const sourceData = historyRecord || registeredBest || currentGoals || {};
        const employeeCount = workshop.employees_count || 1;
        
        // Extração de dados com fallbacks entre as fontes
        const revenue_total = sourceData.revenue_total || sourceData.actual_revenue_achieved || 0;
        const average_ticket = sourceData.average_ticket || 0;
        const tcmp2 = sourceData.tcmp2 || 0;
        const kit_master = sourceData.kit_master || 0;
        
        // Métricas compostas ou específicas
        const profit_percentage = sourceData.profit_percentage || 0; // Mais comum em best_month_history
        const rentability = sourceData.rentability_percentage || sourceData.r70_i30?.r70 || 0; 
        
        // Vendas Pneus (Não presente no schema padrão, tentando campo customizado ou revenue_parts como proxy se zero)
        const tire_sales = sourceData.tire_sales || 0;

        // Cálculos derivados
        const revenue_per_tech = employeeCount > 0 ? revenue_total / employeeCount : 0;
        
        // Taxa de Conversão
        const marketing = sourceData.marketing_data || sourceData.marketing || {};
        const conversion_rate = marketing.leads_sold && marketing.leads_showed_up 
          ? (marketing.leads_sold / marketing.leads_showed_up) * 100 
          : 0;
          
        // Atingimento de Metas
        const projected = sourceData.monthly_goals?.projected_revenue || sourceData.projected_revenue || sourceData.projected_total || 1;
        const goal_achievement = projected > 0 ? (revenue_total / projected) * 100 : 0;

        return {
          id: workshop.id,
          name: workshop.name,
          city: workshop.city,
          state: workshop.state,
          employeeCount,
          
          revenue_total,
          average_ticket,
          rentability,
          profit_percentage,
          revenue_per_tech,
          tcmp2,
          conversion_rate,
          goal_achievement,
          kit_master,
          tire_sales
        };
      })
      .sort((a, b) => b.revenue_total - a.revenue_total);
  };

  const employeeRanking = getEmployeeRanking();
  const workshopRanking = getWorkshopRanking();

  const getMedalIcon = (position) => {
    if (position === 0) return <Trophy className="w-6 h-6 text-yellow-500" />;
    if (position === 1) return <Medal className="w-6 h-6 text-gray-400" />;
    if (position === 2) return <Award className="w-6 h-6 text-orange-600" />;
    return <span className="text-gray-600 font-bold">{position + 1}º</span>;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full mb-4">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Ranking Nacional
          </h1>
          <p className="text-gray-600">
            Os melhores colaboradores e oficinas do Brasil
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ranking de Colaboradores */}
          <Card className="shadow-xl border-2 border-blue-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle>Top Colaboradores</CardTitle>
                    <CardDescription>Por produtividade</CardDescription>
                  </div>
                </div>
                <Select value={selectedArea} onValueChange={setSelectedArea}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="vendas">Vendas</SelectItem>
                    <SelectItem value="comercial">Comercial</SelectItem>
                    <SelectItem value="tecnico">Técnico</SelectItem>
                    <SelectItem value="gerencia">Gerência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {employeeRanking.slice(0, 50).map((emp, index) => (
                  <div 
                    key={emp.id} 
                    className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                      index === 0 ? 'bg-yellow-50 border-yellow-300' :
                      index === 1 ? 'bg-gray-50 border-gray-300' :
                      index === 2 ? 'bg-orange-50 border-orange-300' :
                      'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 flex justify-center">
                        {getMedalIcon(index)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{emp.name}</p>
                        <p className="text-xs text-gray-600">
                          {emp.position} • {emp.workshopName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {emp.city}/{emp.state}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-blue-600">
                        {emp.productivity.toFixed(0)}%
                      </p>
                      <p className="text-xs text-gray-600">
                        R$ {emp.totalProduction.toFixed(0)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Ranking de Oficinas */}
          <Card className="shadow-xl border-2 border-green-200">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle>Top Oficinas</CardTitle>
                  <CardDescription>Por Faturamento Recorde</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {workshopRanking.slice(0, 50).map((workshop, index) => (
                  <div 
                    key={workshop.id} 
                    className={`flex flex-col p-4 rounded-lg border-2 ${
                      index === 0 ? 'bg-yellow-50 border-yellow-300' :
                      index === 1 ? 'bg-gray-50 border-gray-300' :
                      index === 2 ? 'bg-orange-50 border-orange-300' :
                      'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-4">
                        <div className="w-10 flex justify-center">
                          {getMedalIcon(index)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{workshop.name}</p>
                          <p className="text-xs text-gray-600">
                            {workshop.city}/{workshop.state} • {workshop.employeeCount} colab.
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-700">
                          {formatCurrency(workshop.revenue_total)}
                        </p>
                        <p className="text-xs text-gray-500">Faturamento Recorde</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs border-t pt-2 border-gray-200/50">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Ticket Médio:</span>
                        <span className="font-medium">{formatCurrency(workshop.average_ticket)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Lucro Médio:</span>
                        <span className="font-medium text-green-600">{formatPercent(workshop.profit_percentage)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Rentabilidade:</span>
                        <span className="font-medium">{formatPercent(workshop.rentability)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Fat./Técnico:</span>
                        <span className="font-medium">{formatCurrency(workshop.revenue_per_tech)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">TCMP² Médio:</span>
                        <span className="font-medium">{formatCurrency(workshop.tcmp2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Conversão:</span>
                        <span className="font-medium">{formatPercent(workshop.conversion_rate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Meta Atingida:</span>
                        <span className="font-medium text-blue-600">{formatPercent(workshop.goal_achievement)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Kit Master:</span>
                        <span className="font-medium">{workshop.kit_master}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Vendas Pneus:</span>
                        <span className="font-medium">{formatCurrency(workshop.tire_sales)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <TrendingUp className="w-12 h-12 text-blue-600" />
              <div>
                <h3 className="text-lg font-bold text-gray-900">Como subir no ranking?</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Aumente sua produtividade mantendo custos equilibrados. Colaboradores e oficinas 
                  com maior percentual de produção sobre custos aparecem no topo do ranking nacional.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}