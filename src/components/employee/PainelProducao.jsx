import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, DollarSign, Calendar, Award, BarChart3, Users, Loader2, Tag } from "lucide-react";
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
    if (!monthStr || monthStr === "-") return "-";
    const parts = monthStr.split("-");
    if (parts.length < 2 || !parts[1]) return "-";
    const [year, month] = parts;
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const idx = parseInt(month) - 1;
    if (isNaN(idx) || idx < 0 || idx > 11) return "-";
    return `${monthNames[idx]}/${year?.substring(2)}`;
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
      {/* KPIs calculados do MonthlyGoalHistory */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <p className="text-sm text-gray-600">Melhor Mês Histórico</p>
                {bestMonthFromHistory.total > 0 ? (
                  <>
                    <p className="text-lg font-bold text-purple-600">{formatMonth(bestMonthFromHistory.month)}</p>
                    <p className="text-sm text-gray-500">{formatCurrency(bestMonthFromHistory.total)}</p>
                  </>
                ) : bestMonthData ? (
                  <>
                    <p className="text-lg font-bold text-purple-600">{formatMonth(bestMonthData.date?.substring(0, 7))}</p>
                    <p className="text-sm text-gray-500">{formatCurrency(bestMonthData.revenue_total)}</p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-bold text-purple-600">-</p>
                    <p className="text-sm text-gray-500">R$ 0,00</p>
                  </>
                )}
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

      {/* Ticket Médio Peças e Serviços (do Melhor Mês Histórico) */}
      {bestMonthData && (bestMonthData.revenue_total > 0 || bestMonthData.revenue_parts > 0 || bestMonthData.revenue_services > 0) && (() => {
        const vol = bestMonthData.customer_volume || 0;
        const ticketParts = bestMonthData.average_ticket_parts || (vol > 0 ? (bestMonthData.revenue_parts || 0) / vol : 0);
        const ticketServices = bestMonthData.average_ticket_services || (vol > 0 ? (bestMonthData.revenue_services || 0) / vol : 0);
        const ticketTotal = bestMonthData.average_ticket || (vol > 0 ? (bestMonthData.revenue_total || 0) / vol : 0);
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="shadow-lg border-2 border-yellow-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Award className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Ticket Médio Total</p>
                    <p className="text-xl font-bold text-yellow-600">{formatCurrency(ticketTotal)}</p>
                    <p className="text-xs text-gray-400">Melhor mês · {vol} clientes</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-2 border-indigo-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                    <Tag className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Ticket Médio Peças</p>
                    <p className="text-xl font-bold text-indigo-600">{formatCurrency(ticketParts)}</p>
                    <p className="text-xs text-gray-400">Melhor mês histórico</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-2 border-teal-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                    <Tag className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Ticket Médio Serviços</p>
                    <p className="text-xl font-bold text-teal-600">{formatCurrency(ticketServices)}</p>
                    <p className="text-xs text-gray-400">Melhor mês histórico</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })()}

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