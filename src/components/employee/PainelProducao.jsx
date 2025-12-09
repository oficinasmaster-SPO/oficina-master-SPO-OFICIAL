import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, DollarSign, Calendar, Award, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";

export default function PainelProducao({ employee }) {
  const productionHistory = employee.production_history || [];
  
  // Debug: ver o que está vindo no employee
  console.log('Employee data:', employee);
  console.log('Best month history:', employee.best_month_history);

  // Preparar dados para gráficos
  const chartData = productionHistory.map(item => ({
    month: item.month,
    peças: item.parts || 0,
    serviços: item.services || 0,
    total: item.total || 0
  }));

  // Calcular estatísticas
  const totalProduction = productionHistory.reduce((sum, item) => sum + (item.total || 0), 0);
  const avgMonthly = productionHistory.length > 0 ? totalProduction / productionHistory.length : 0;
  const bestMonth = productionHistory.reduce((best, item) => 
    (item.total || 0) > (best.total || 0) ? item : best, 
    { month: "-", total: 0 }
  );

  const currentMonthData = productionHistory[productionHistory.length - 1];
  const previousMonthData = productionHistory[productionHistory.length - 2];
  const growth = previousMonthData ? 
    (((currentMonthData?.total || 0) - (previousMonthData?.total || 0)) / (previousMonthData?.total || 1) * 100).toFixed(1) : 
    0;

  // Dados do melhor mês histórico
  const bestMonthHistory = employee.best_month_history || null;

  return (
    <div className="space-y-6">
      {/* Melhor Mês Histórico - Destaque */}
      {bestMonthHistory && (
        <Card className="shadow-xl border-2 border-yellow-400 bg-gradient-to-r from-yellow-50 to-amber-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <Award className="w-6 h-6" />
              🏆 Melhor Mês Histórico do Colaborador
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-600 mb-1">Data</p>
                <p className="text-lg font-bold text-gray-900">
                  {bestMonthHistory.date ? new Date(bestMonthHistory.date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Faturamento Total</p>
                <p className="text-lg font-bold text-green-600">
                  R$ {(bestMonthHistory.revenue_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Volume de Clientes</p>
                <p className="text-lg font-bold text-blue-600">
                  {bestMonthHistory.customer_volume || 0} clientes
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Ticket Médio</p>
                <p className="text-lg font-bold text-purple-600">
                  R$ {(bestMonthHistory.average_ticket || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-yellow-200">
              <div>
                <p className="text-xs text-gray-600 mb-1">Faturamento Peças</p>
                <p className="text-sm font-semibold text-gray-700">
                  R$ {(bestMonthHistory.revenue_parts || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Faturamento Serviços</p>
                <p className="text-sm font-semibold text-gray-700">
                  R$ {(bestMonthHistory.revenue_services || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">% Lucro</p>
                <p className="text-sm font-semibold text-gray-700">
                  {(bestMonthHistory.profit_percentage || 0).toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">% Rentabilidade</p>
                <p className="text-sm font-semibold text-gray-700">
                  {(bestMonthHistory.rentability_percentage || 0).toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-lg border-2 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Produção Total</p>
                <p className="text-2xl font-bold text-blue-600">R$ {totalProduction.toFixed(2)}</p>
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
                <p className="text-2xl font-bold text-green-600">R$ {avgMonthly.toFixed(2)}</p>
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
                <p className="text-sm text-gray-600">Melhor Mês</p>
                <p className="text-lg font-bold text-purple-600">{bestMonth.month}</p>
                <p className="text-sm text-gray-500">R$ {bestMonth.total.toFixed(2)}</p>
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
                <p className={`text-2xl font-bold ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {growth >= 0 ? '+' : ''}{growth}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Produção Realizada</CardTitle>
        </CardHeader>
        <CardContent>
          {productionHistory.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Nenhum histórico de produção registrado</p>
            </div>
          ) : (
            <Tabs defaultValue="bar">
              <TabsList className="mb-4">
                <TabsTrigger value="bar">Gráfico de Barras</TabsTrigger>
                <TabsTrigger value="line">Gráfico de Linha</TabsTrigger>
              </TabsList>

              <TabsContent value="bar">
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => `R$ ${value.toFixed(2)}`}
                      contentStyle={{ background: 'white', border: '1px solid #ccc' }}
                    />
                    <Legend />
                    <Bar dataKey="peças" fill="#3b82f6" name="Peças" />
                    <Bar dataKey="serviços" fill="#10b981" name="Serviços" />
                    <Bar dataKey="total" fill="#8b5cf6" name="Total" />
                  </BarChart>
                </ResponsiveContainer>
              </TabsContent>

              <TabsContent value="line">
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => `R$ ${value.toFixed(2)}`}
                      contentStyle={{ background: 'white', border: '1px solid #ccc' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="peças" stroke="#3b82f6" strokeWidth={2} name="Peças" />
                    <Line type="monotone" dataKey="serviços" stroke="#10b981" strokeWidth={2} name="Serviços" />
                    <Line type="monotone" dataKey="total" stroke="#8b5cf6" strokeWidth={2} name="Total" />
                  </LineChart>
                </ResponsiveContainer>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Tabela de Dados */}
      {productionHistory.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Dados Detalhados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4">Mês</th>
                    <th className="text-right py-2 px-4">Peças</th>
                    <th className="text-right py-2 px-4">Serviços</th>
                    <th className="text-right py-2 px-4">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {productionHistory.map((item, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-4 font-medium">{item.month}</td>
                      <td className="py-2 px-4 text-right text-blue-600">R$ {(item.parts || 0).toFixed(2)}</td>
                      <td className="py-2 px-4 text-right text-green-600">R$ {(item.services || 0).toFixed(2)}</td>
                      <td className="py-2 px-4 text-right font-bold text-purple-600">R$ {(item.total || 0).toFixed(2)}</td>
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