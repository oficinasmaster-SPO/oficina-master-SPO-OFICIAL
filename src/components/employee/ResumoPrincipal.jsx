import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/components/utils/formatters";
import { TrendingUp, Calendar, User, BarChart3 } from "lucide-react";

export default function ResumoPrincipal({ employee, monthlyGoalsData, bestMonthData, monthlyHistoryData }) {
  if (!employee) return null;

  const monthlyGoals = monthlyGoalsData || {};
  const bestMonth = bestMonthData || {};
  const history = monthlyHistoryData || {};

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Melhor Mês Histórico */}
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-blue-900">
            <Calendar className="w-4 h-4" />
            Melhor Mês
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {bestMonth.date && (
            <div className="text-xs text-blue-700">
              <span className="font-medium">Data:</span> {new Date(bestMonth.date).toLocaleDateString("pt-BR")}
            </div>
          )}
          <div className="text-lg font-bold text-blue-900">
            {formatCurrency(bestMonth.revenue_total || 0)}
          </div>
          <div className="text-xs text-blue-700 space-y-1">
            <div>Peças: {formatCurrency(bestMonth.revenue_parts || 0)}</div>
            <div>Serviços: {formatCurrency(bestMonth.revenue_services || 0)}</div>
            <div>Clientes: {bestMonth.customer_volume || 0}</div>
            {bestMonth.profit_percentage && (
              <div>Lucro: {formatNumber(bestMonth.profit_percentage)}%</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Remuneração */}
      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-green-900">
            <User className="w-4 h-4" />
            Remuneração
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-lg font-bold text-green-900">
            {formatCurrency(employee.salary || 0)}
          </div>
          <div className="text-xs text-green-700 space-y-1">
            <div>Comissão: {formatCurrency(employee.commission_rule?.[0]?.percentage || 0)}</div>
            {employee.benefits && employee.benefits.length > 0 && (
              <div>Benefícios: {employee.benefits.length}</div>
            )}
            {employee.benefits && (
              <div className="mt-2 text-green-600">
                {employee.benefits.map((b, i) => (
                  <div key={i} className="text-xs">
                    {b.name}: {formatCurrency(b.value || 0)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Meta Mensal */}
      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-purple-900">
            <TrendingUp className="w-4 h-4" />
            Meta Mensal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {monthlyGoals.month && (
            <div className="text-xs text-purple-700">
              <span className="font-medium">Período:</span> {monthlyGoals.month}
            </div>
          )}
          <div className="text-lg font-bold text-purple-900">
            {formatCurrency(monthlyGoals.projected_revenue || 0)}
          </div>
          <div className="text-xs text-purple-700 space-y-1">
            <div>Diária: {formatCurrency((monthlyGoals.projected_revenue || 0) / 22)}</div>
            {monthlyGoals.growth_percentage && (
              <div>Crescimento: {formatNumber(monthlyGoals.growth_percentage)}%</div>
            )}
            {monthlyGoals.projected_revenue && (
              <div className="font-semibold text-purple-900">
                Realizado: {formatCurrency(monthlyGoals.actual_revenue_achieved || 0)}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Histórico Produção */}
      <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-orange-900">
            <BarChart3 className="w-4 h-4" />
            Produção
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {history.month && (
            <div className="text-xs text-orange-700">
              <span className="font-medium">Mês:</span> {history.month}
            </div>
          )}
          {history.revenue_total ? (
            <>
              <div className="text-lg font-bold text-orange-900">
                {formatCurrency(history.revenue_total)}
              </div>
              <div className="text-xs text-orange-700 space-y-1">
                <div>Peças: {formatCurrency(history.revenue_parts || 0)}</div>
                <div>Serviços: {formatCurrency(history.revenue_services || 0)}</div>
                <div>Clientes: {history.customer_volume || 0}</div>
              </div>
            </>
          ) : (
            <div className="text-sm text-orange-700">Sem registros</div>
          )}
        </CardContent>
      </Card>

      {/* Produção Prevista (sem valores - preenchida automaticamente) */}
      <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-300 md:col-span-1 lg:col-span-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700">
            Produção Prevista (Preenchida Automaticamente)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-gray-600">
            Campo reservado para cálculo automático de produção prevista baseado em métricas do sistema.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}