import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, DollarSign, Calendar, Award, BarChart3, Users, Loader2 } from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, LineChart, Line 
} from "recharts";

export default function PainelProducao({ employee }) {
  const [loading, setLoading] = useState(true);
  const [monthlyRecords, setMonthlyRecords] = useState([]);
  const [bestPerformance, setBestPerformance] = useState(null);

  useEffect(() => {
    loadData();
  }, [employee.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Buscar registros do MonthlyGoalHistory para este colaborador
      const records = await base44.entities.MonthlyGoalHistory.filter({
        employee_id: employee.id,
        entity_type: "employee"
      }, '-reference_date', 100);

      setMonthlyRecords(records || []);

      // Buscar melhor mês da entidade EmployeeBestPerformance
      const bestRecords = await base44.entities.EmployeeBestPerformance.filter({
        employee_id: employee.id
      }, '-created_date', 1);

      setBestPerformance(bestRecords?.[0] || null);
    } catch (error) {
      console.error("Erro ao carregar dados de produção:", error);
    } finally {
      setLoading(false);
    }
  };

  // Agrupar registros diários por mês para os gráficos
  const monthlyAggregated = useMemo(() => {
    const grouped = {};
    monthlyRecords.forEach(record => {
      const month = record.month || record.reference_date?.substring(0, 7);
      if (!month) return;
      if (!grouped[month]) {
        grouped[month] = { month, parts: 0, services: 0, total: 0, customers: 0, count: 0 };
      }
      grouped[month].parts += record.revenue_parts || 0;
      grouped[month].services += record.revenue_services || 0;
      grouped[month].total += record.revenue_total || 0;
      grouped[month].customers += record.customer_volume || 0;
      grouped[month].count += 1;
    });
    return Object.values(grouped).sort((a, b) => a.month.localeCompare(b.month));
  }, [monthlyRecords]);

  // Formatar mês para exibição
  const formatMonth = (monthStr) => {
    if (!monthStr) return "-";
    const [year, month] = monthStr.split("-");
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return `${months[parseInt(month) - 1]}/${year?.substring(2)}`;
  };

  // Dados para gráficos
  const chartData = monthlyAggregated.map(item => ({
    month: formatMonth(item.month),
    "Peças": item.parts,
    "Serviços": item.services,
    "Total": item.total
  }));

  // Calcular KPIs
  const totalProduction = monthlyAggregated.reduce((sum, m) => sum + m.total, 0);
  const avgMonthly = monthlyAggregated.length > 0 ? totalProduction / monthlyAggregated.length : 0;
  const bestMonthFromHistory = monthlyAggregated.reduce(
    (best, item) => item.total > best.total ? item : best, 
    { month: "-", total: 0 }
  );

  const currentMonth = monthlyAggregated[monthlyAggregated.length - 1];
  const previousMonth = monthlyAggregated[monthlyAggregated.length - 2];
  const growth = previousMonth?.total > 0
    ? (((currentMonth?.total || 0) - previousMonth.total) / previousMonth.total * 100).toFixed(1)
    : 0;

  // Melhor mês: priorizar EmployeeBestPerformance, fallback para employee.best_month_history
  const bestMonthData = bestPerformance || employee.best_month_history || null;

  const formatCurrency = (value) => 
    `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Melhor Mês Histórico - Destaque */}
      {bestMonthData && (bestMonthData.revenue_total > 0 || bestMonthData.customer_volume > 0) && (
        <Card className="shadow-xl border-2 border-yellow-400 bg-gradient-to-r from-yellow-50 to-amber-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <Award className="w-6 h-6" />
              🏆 Melhor Mês Histórico do Colaborador
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <p className="text-xs text-gray-600 mb-1">Data</p>
                <p className="text-lg font-bold text-gray-900">
                  {bestMonthData.date 
                    ? new Date(bestMonthData.date + "T12:00:00").toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) 
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Faturamento Total</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(bestMonthData.revenue_total)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Volume de Clientes</p>
                <p className="text-lg font-bold text-blue-600">{bestMonthData.customer_volume || 0} clientes</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Ticket Médio</p>
                <p className="text-lg font-bold text-purple-600">{formatCurrency(bestMonthData.average_ticket)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">% Lucro</p>
                <p className="text-lg font-bold text-orange-600">{(bestMonthData.profit_percentage || 0).toFixed(1)}%</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-yellow-200">
              <div>
                <p className="text-xs text-gray-600 mb-1">Faturamento Peças</p>
                <p className="text-sm font-semibold text-gray-700">{formatCurrency(bestMonthData.revenue_parts)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Faturamento Serviços</p>
                <p className="text-sm font-semibold text-gray-700">{formatCurrency(bestMonthData.revenue_services)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Ticket Médio Peças</p>
                <p className="text-sm font-semibold text-gray-700">{formatCurrency(bestMonthData.average_ticket_parts)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Ticket Médio Serviços</p>
                <p className="text-sm font-semibold text-gray-700">{formatCurrency(bestMonthData.average_ticket_services)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPIs calculados do MonthlyGoalHistory */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-lg border-2 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Produção Acumulada</p>
                <p className="text-xl font-bold text-blue-600">{formatCurrency(totalProduction)}</p>
                <p className="text-xs text-gray-400">{monthlyAggregated.length} meses registrados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-2 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Média Mensal</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(avgMonthly)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-2 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Award className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Melhor Mês (Registros)</p>
                <p className="text-lg font-bold text-purple-600">{formatMonth(bestMonthFromHistory.month)}</p>
                <p className="text-sm text-gray-500">{formatCurrency(bestMonthFromHistory.total)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-2 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Crescimento</p>
                <p className={`text-xl font-bold ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {growth >= 0 ? '+' : ''}{growth}%
                </p>
                <p className="text-xs text-gray-400">vs mês anterior</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Produção Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Nenhum histórico de produção registrado</p>
              <p className="text-sm text-gray-400 mt-1">Registre a produção diária para ver os gráficos aqui</p>
            </div>
          ) : (
            <Tabs defaultValue="bar">
              <TabsList className="mb-4">
                <TabsTrigger value="bar">Barras</TabsTrigger>
                <TabsTrigger value="line">Linha</TabsTrigger>
              </TabsList>

              <TabsContent value="bar">
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="Peças" fill="#3b82f6" />
                    <Bar dataKey="Serviços" fill="#10b981" />
                    <Bar dataKey="Total" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </TabsContent>

              <TabsContent value="line">
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Line type="monotone" dataKey="Peças" stroke="#3b82f6" strokeWidth={2} />
                    <Line type="monotone" dataKey="Serviços" stroke="#10b981" strokeWidth={2} />
                    <Line type="monotone" dataKey="Total" stroke="#8b5cf6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Tabela de Dados */}
      {monthlyAggregated.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Dados Mensais Detalhados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4">Mês</th>
                    <th className="text-right py-3 px-4">Peças</th>
                    <th className="text-right py-3 px-4">Serviços</th>
                    <th className="text-right py-3 px-4">Total</th>
                    <th className="text-right py-3 px-4">Registros</th>
                  </tr>
                </thead>
                <tbody>
                  {[...monthlyAggregated].reverse().map((item, index) => (
                    <tr key={item.month} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{formatMonth(item.month)}</td>
                      <td className="py-3 px-4 text-right text-blue-600">{formatCurrency(item.parts)}</td>
                      <td className="py-3 px-4 text-right text-green-600">{formatCurrency(item.services)}</td>
                      <td className="py-3 px-4 text-right font-bold text-purple-600">{formatCurrency(item.total)}</td>
                      <td className="py-3 px-4 text-right text-gray-500">{item.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}