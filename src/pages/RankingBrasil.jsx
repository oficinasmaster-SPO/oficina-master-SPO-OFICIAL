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
    queryFn: () => base44.entities.Employee.list(null, 1000)
  });

  const { data: workshops = [], isLoading: loadingWorkshops } = useQuery({
    queryKey: ['workshops-all'],
    queryFn: () => base44.entities.Workshop.list(null, 1000)
  });

  const { data: history = [], isLoading: loadingHistory } = useQuery({
    queryKey: ['history-all-types'],
    queryFn: () => base44.entities.MonthlyGoalHistory.list(null, 3000)
  });

  const { data: diagnostics = [], isLoading: loadingDiagnostics } = useQuery({
    queryKey: ['diagnostics-all'],
    queryFn: () => base44.entities.ProductivityDiagnostic.list(null, 2000)
  });

  const isLoading = loadingEmployees || loadingWorkshops || loadingHistory || loadingDiagnostics;

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
    // 1. Processar e Consolidar Histórico (Agregando Colaboradores)
    const historyByWorkshopMonth = {}; // Map: workshopId-month -> { ...aggregatedData }

    history.forEach(record => {
        if (!record.workshop_id || !record.month) return;
        const key = `${record.workshop_id}-${record.month}`;
        
        if (!historyByWorkshopMonth[key]) {
            historyByWorkshopMonth[key] = {
                workshop_id: record.workshop_id,
                month: record.month,
                revenue_total: 0,
                revenue_parts: 0,
                revenue_services: 0,
                kit_master: 0,
                tire_sales: 0,
                leads_sold: 0,
                leads_showed_up: 0,
                customer_volume: 0,
                tcmp2_sum: 0,
                tcmp2_count: 0,
                profit_sum: 0,
                profit_count: 0,
                rentability_sum: 0,
                rentability_count: 0,
                projected_total: 0 // Usually target is on workshop record
            };
        }

        const acc = historyByWorkshopMonth[key];

        // Se for registro de OFICINA, pegamos as metas e valores consolidados se existirem
        if (record.entity_type === 'workshop') {
            acc.projected_total = Math.max(acc.projected_total, record.projected_total || record.projected_revenue || 0);
            
            // Dados diretos do registro da oficina
            acc.workshop_record_revenue = record.revenue_total || record.achieved_total || 0;
            acc.workshop_record_kit = record.kit_master || 0;
            acc.workshop_record_tires = record.tire_sales || 0;
            
            // Dados de média (Rentabilidade, Lucro, TCMP2, Ticket Médio)
            // Se existirem no registro da oficina, usamos para compor as médias
            if (record.profit_percentage) {
                acc.profit_sum += record.profit_percentage;
                acc.profit_count++;
            }
            if (record.rentability_percentage || (record.r70_i30?.r70)) {
                acc.rentability_sum += (record.rentability_percentage || record.r70_i30?.r70 || 0);
                acc.rentability_count++;
            }
            if (record.tcmp2 || record.actual_tcmp2_value) {
                acc.tcmp2_sum += (record.tcmp2 || record.actual_tcmp2_value);
                acc.tcmp2_count++;
            }
            if (record.average_ticket) {
                acc.workshop_avg_ticket = record.average_ticket;
            }
        }
        
        // Se for registro de COLABORADOR, somamos na agregação
        if (record.entity_type === 'employee') {
            acc.revenue_total += (record.revenue_total || record.achieved_total || 0);
            acc.revenue_parts += (record.revenue_parts || 0);
            acc.revenue_services += (record.revenue_services || 0);
            acc.kit_master += (record.kit_master || record.actual_kit_master_score || 0);
            acc.tire_sales += (record.tire_sales || 0); // Assuming field name
            acc.customer_volume += (record.customer_volume || 0);
            
            // Marketing data aggregation
            const mkt = record.marketing_data || {};
            acc.leads_sold += (mkt.leads_sold || 0);
            acc.leads_showed_up += (mkt.leads_showed_up || 0);

            // Colaborador geralmente não tem TCMP2 ou Rentabilidade da oficina, mas pode ter produção
        }
    });

    // Encontrar o MELHOR mês para cada oficina (baseado no faturamento consolidado)
    const bestHistoryByWorkshop = {};
    
    Object.values(historyByWorkshopMonth).forEach(aggregated => {
        // Resolve conflito: Soma de Colaboradores vs Registro da Oficina
        // Usamos o MAIOR valor para não zerar se não tiver colaboradores lançados mas tiver oficina
        const finalRevenue = Math.max(aggregated.revenue_total, aggregated.workshop_record_revenue || 0);
        const finalKit = Math.max(aggregated.kit_master, aggregated.workshop_record_kit || 0);
        const finalTires = Math.max(aggregated.tire_sales, aggregated.workshop_record_tires || 0);
        
        // Médias
        const avgTcmp2 = aggregated.tcmp2_count > 0 ? (aggregated.tcmp2_sum / aggregated.tcmp2_count) : 0;
        const avgProfit = aggregated.profit_count > 0 ? (aggregated.profit_sum / aggregated.profit_count) : 0;
        const avgRentability = aggregated.rentability_count > 0 ? (aggregated.rentability_sum / aggregated.rentability_count) : 0;
        
        // Ticket Médio Calculado: Se tiver volume de clientes > 0, calcula. Senão usa o registrado na oficina se existir.
        let avgTicket = 0;
        if (aggregated.customer_volume > 0) {
            avgTicket = finalRevenue / aggregated.customer_volume;
        } else if (aggregated.workshop_avg_ticket) {
            avgTicket = aggregated.workshop_avg_ticket;
        }

        const consolidatedRecord = {
            ...aggregated,
            revenue_total: finalRevenue,
            kit_master: finalKit,
            tire_sales: finalTires,
            tcmp2: avgTcmp2,
            profit_percentage: avgProfit,
            rentability_percentage: avgRentability,
            average_ticket: avgTicket,
            marketing_data: {
                leads_sold: aggregated.leads_sold,
                leads_showed_up: aggregated.leads_showed_up
            }
        };

        if (!bestHistoryByWorkshop[aggregated.workshop_id] || 
            finalRevenue > bestHistoryByWorkshop[aggregated.workshop_id].revenue_total) {
            bestHistoryByWorkshop[aggregated.workshop_id] = consolidatedRecord;
        }
    });

    // 2. Processar diagnósticos para encontrar faturamento recorde calculado
    const bestDiagnosticByWorkshop = {};
    const workshopMonthlyRevenue = {};
    diagnostics.forEach(diag => {
        if (!diag.workshop_id) return;
        const key = `${diag.workshop_id}-${diag.period_month}`;
        if (!workshopMonthlyRevenue[key]) workshopMonthlyRevenue[key] = 0;
        
        const prod = diag.productivity_data || {};
        const total = (prod.services_value || 0) + (prod.parts_value || 0) + (prod.sales_value || 0);
        workshopMonthlyRevenue[key] += total;
    });
    
    // Encontrar o maior faturamento mensal por oficina
    Object.keys(workshopMonthlyRevenue).forEach(key => {
        const [wid, month] = key.split('-');
        const revenue = workshopMonthlyRevenue[key];
        if (!bestDiagnosticByWorkshop[wid] || revenue > bestDiagnosticByWorkshop[wid].revenue_total) {
            bestDiagnosticByWorkshop[wid] = { revenue_total: revenue };
        }
    });

    // 3. Consolidar dados de produção dos colaboradores (acumulado)
    const employeeAggregation = employees.reduce((acc, emp) => {
        if (emp.status !== 'ativo' || !emp.workshop_id) return acc;
        if (!acc[emp.workshop_id]) acc[emp.workshop_id] = { revenue_total: 0 };
        
        const prod = (emp.production_parts || 0) + (emp.production_parts_sales || 0) + (emp.production_services || 0);
        acc[emp.workshop_id].revenue_total += prod;
        return acc;
    }, {});

    return workshops
      .map(workshop => {
        // Estratégia de Consolidação de Dados (Merge de Fontes)
        // Prioridade (da menor para maior): Metas < Cadastro (Best Month) < Histórico < Diagnósticos
        // Isso garante que dados parciais sejam preenchidos pelas fontes de menor prioridade se faltarem na principal
        
        const currentGoals = workshop.monthly_goals || {};
        const registeredBest = workshop.best_month_history || {};
        const historyRecord = bestHistoryByWorkshop[workshop.id] || {};
        const diagnosticBest = bestDiagnosticByWorkshop[workshop.id] || {};
        const aggregated = employeeAggregation[workshop.id] || {};

        // Normalização de campos para um objeto comum antes do merge
        const normalize = (data) => ({
            revenue_total: data.revenue_total || data.actual_revenue_achieved || data.revenue || 0,
            average_ticket: data.average_ticket || 0,
            tcmp2: data.tcmp2 || data.actual_tcmp2_value || data.target_tcmp2_value || 0,
            kit_master: data.kit_master || data.actual_kit_master_score || data.target_kit_master_score || 0,
            profit_percentage: data.profit_percentage || 0,
            rentability: data.rentability_percentage || (typeof data.r70_i30 === 'object' ? data.r70_i30.r70 : 0) || 0,
            tire_sales: data.tire_sales || data.revenue_tires || data.vendas_pneus || 0,
            marketing: data.marketing_data || data.marketing || {},
            projected: data.projected_revenue || data.projected_total || data.target_revenue_total || 0
        });

        // Mesclando fontes (último objeto sobrescreve campos anteriores se tiver valor > 0)
        // Usamos uma lógica customizada de merge: só sobrescreve se o novo valor for válido (truthy/positivo)
        const mergeData = (...sources) => {
            const result = {};
            sources.forEach(src => {
                const norm = normalize(src);
                Object.keys(norm).forEach(key => {
                    // Sobrescreve se o valor no source atual for válido/existente
                    // Para números, considera > 0. Para objetos, considera não vazio.
                    const val = norm[key];
                    const isNumber = typeof val === 'number';
                    const isObject = typeof val === 'object' && val !== null;
                    
                    if ((isNumber && val > 0) || (isObject && Object.keys(val).length > 0)) {
                        result[key] = val;
                    } else if (result[key] === undefined) {
                         // Se ainda não tem valor, aceita mesmo que seja 0 ou vazio, para inicializar
                        result[key] = val;
                    }
                });
            });
            return result;
        };

        // NOVA LÓGICA: Seleção baseada no Maior Faturamento (Recorde)
        // Coletamos todas as fontes possíveis
        const sources = [
            { name: 'diagnostic', data: normalize(diagnosticBest) },
            { name: 'history', data: normalize(historyRecord) },
            { name: 'cadastro', data: normalize(registeredBest) },
            { name: 'metas', data: normalize(currentGoals) },
            { name: 'agregado', data: normalize(aggregated) }
        ];

        // Ordenamos decrescente pelo faturamento total para encontrar o "Recorde"
        sources.sort((a, b) => b.data.revenue_total - a.data.revenue_total);

        // O primeiro da lista é nossa fonte principal (Winner)
        const winner = sources[0].data;
        
        // Criamos o objeto consolidado inicial com os dados do vencedor
        const consolidated = { ...winner };

        // FALLBACK INTELIGENTE:
        // Se o vencedor tiver campos zerados (ex: tem faturamento mas não tem lucro),
        // buscamos o melhor valor disponível nas outras fontes para preencher os buracos.
        // Isso garante que o dashboard fique o mais completo possível.
        const fieldsToFill = ['average_ticket', 'tcmp2', 'kit_master', 'profit_percentage', 'rentability', 'tire_sales', 'projected'];
        
        fieldsToFill.forEach(field => {
            if (!consolidated[field] || consolidated[field] === 0) {
                // Procura na lista de fontes alguém que tenha esse dado
                const backupSource = sources.find(s => s.data[field] > 0);
                if (backupSource) {
                    consolidated[field] = backupSource.data[field];
                }
            }
        });

        // --- FALLBACK FINAL PARA FATURAMENTO ZERADO ---
        // Se após tudo o faturamento ainda for zero, usamos a faixa de faturamento cadastrada
        if (!consolidated.revenue_total || consolidated.revenue_total === 0) {
            const revenueMap = {
                "0_20k": 10000, "20k_40k": 30000, "40k_60k": 50000, "60k_80k": 70000,
                "80k_100k": 90000, "100k_130k": 115000, "130k_160k": 145000, "160k_190k": 175000,
                "190k_200k": 195000, "200k_250k": 225000, "250k_300k": 275000, "300k_350k": 325000,
                "350k_400k": 375000, "400k_450k": 425000, "450k_500k": 475000, "500k_600k": 550000,
                "600k_700k": 650000, "700k_800k": 750000, "800k_900k": 850000, "900k_1m": 950000,
                "acima_1m": 1000000
            };
            consolidated.revenue_total = revenueMap[workshop.monthly_revenue] || 0;
        }

        const employeeCount = workshop.employees_count || 1;
        
        // Extração Final
        const revenue_total = consolidated.revenue_total || 0;
        const average_ticket = consolidated.average_ticket || 0;
        const tcmp2 = consolidated.tcmp2 || 0;
        const kit_master = consolidated.kit_master || 0;
        const profit_percentage = consolidated.profit_percentage || 0;
        const rentability = consolidated.rentability || 0;
        const tire_sales = consolidated.tire_sales || 0;

        const revenue_per_tech = employeeCount > 0 ? revenue_total / employeeCount : 0;
        
        const marketing = consolidated.marketing || {};
        const leads_sold = marketing.leads_sold || 0;
        const leads_showed_up = marketing.leads_showed_up || 0;
        const conversion_rate = (leads_sold > 0 && leads_showed_up > 0) ? (leads_sold / leads_showed_up) * 100 : 0;
          
        const projected = consolidated.projected || 0;
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