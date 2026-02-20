import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Target, TrendingUp, AlertCircle } from "lucide-react";
import { formatCurrency } from "../utils/formatters";

export default function EmployeeSummaryCard({ employee, goalHistory }) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthRecords = goalHistory.filter(
    record => record.employee_id === employee.id && record.month === currentMonth
  );
  
  const monthlyActualRevenue = currentMonthRecords.reduce(
    (sum, record) => sum + (record.achieved_total || 0), 
    0
  );

  const bestMonthRevenue = employee.best_month_history?.revenue_total || 0;
  const growthPercentage = employee.monthly_goals?.growth_percentage || 10;
  const monthlyGoal = employee.monthly_goals?.individual_goal || 
    (bestMonthRevenue > 0 ? bestMonthRevenue * (1 + growthPercentage / 100) : 0);
  const dailyGoalCalculated = monthlyGoal > 0 ? monthlyGoal / 22 : 0;
  const dailyGoal = employee.monthly_goals?.daily_projected_goal || dailyGoalCalculated;
  
  const actualRevenue = monthlyActualRevenue;
  const achievementPercentage = monthlyGoal > 0 ? (actualRevenue / monthlyGoal) * 100 : 0;
  const missingToGoal = Math.max(0, monthlyGoal - actualRevenue);

  // Aggregate sales funnel metrics
  const totalClientsScheduledBase = currentMonthRecords.reduce((sum, record) => sum + (record.clients_scheduled_base || 0), 0);
  const totalClientsDeliveredBase = currentMonthRecords.reduce((sum, record) => sum + (record.clients_delivered_base || 0), 0);
  const totalSalesBase = currentMonthRecords.reduce((sum, record) => sum + (record.sales_base || 0), 0);

  const totalClientsScheduledMkt = currentMonthRecords.reduce((sum, record) => sum + (record.clients_scheduled_mkt || 0), 0);
  const totalClientsDeliveredMkt = currentMonthRecords.reduce((sum, record) => sum + (record.clients_delivered_mkt || 0), 0);
  const totalSalesMarketing = currentMonthRecords.reduce((sum, record) => sum + (record.sales_marketing || 0), 0);

  const totalClientsScheduledReferral = currentMonthRecords.reduce((sum, record) => sum + (record.clients_scheduled_referral || 0), 0);
  const totalClientsDeliveredReferral = currentMonthRecords.reduce((sum, record) => sum + (record.clients_delivered_referral || 0), 0);
  
  const totalPaveCommercial = currentMonthRecords.reduce((sum, record) => sum + (record.pave_commercial || 0), 0);
  const totalKitMaster = currentMonthRecords.reduce((sum, record) => sum + (record.kit_master || 0), 0);
  const totalGpsVendas = currentMonthRecords.reduce((sum, record) => sum + (record.gps_vendas || 0), 0);

  return (
    <Card className="mb-6 shadow-xl border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-blue-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <User className="w-6 h-6 text-purple-600" />
            <div>
              <CardTitle className="text-xl text-purple-900">{employee.full_name}</CardTitle>
              <p className="text-sm text-gray-600">{employee.position} - {employee.area || "Geral"}</p>
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

        {/* Sales Funnel Metrics Section */}
        {(totalPaveCommercial > 0 || totalKitMaster > 0 || totalSalesBase > 0 || totalSalesMarketing > 0) && (
          <div className="mt-6 pt-6 border-t border-purple-200">
            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              Performance de Funil
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Base */}
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                <p className="text-xs font-bold text-blue-800 mb-2 uppercase">Base de Clientes</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Agendados:</span>
                    <span className="font-bold">{totalClientsScheduledBase}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Entregues:</span>
                    <span className="font-bold">{totalClientsDeliveredBase}</span>
                  </div>
                  <div className="flex justify-between text-xs pt-1 border-t border-blue-200">
                    <span className="text-gray-600">Vendas:</span>
                    <span className="font-bold text-blue-700">R$ {formatCurrency(totalSalesBase)}</span>
                  </div>
                </div>
              </div>

              {/* Marketing */}
              <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
                <p className="text-xs font-bold text-purple-800 mb-2 uppercase">Marketing</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Agendados:</span>
                    <span className="font-bold">{totalClientsScheduledMkt}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Entregues:</span>
                    <span className="font-bold">{totalClientsDeliveredMkt}</span>
                  </div>
                  <div className="flex justify-between text-xs pt-1 border-t border-purple-200">
                    <span className="text-gray-600">Vendas:</span>
                    <span className="font-bold text-purple-700">R$ {formatCurrency(totalSalesMarketing)}</span>
                  </div>
                </div>
              </div>

              {/* Indicação / Indicadores */}
              <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                <p className="text-xs font-bold text-orange-800 mb-2 uppercase">Indicação & KPIs</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Agendados (Ind):</span>
                    <span className="font-bold">{totalClientsScheduledReferral}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Entregues (Ind):</span>
                    <span className="font-bold">{totalClientsDeliveredReferral}</span>
                  </div>
                  <div className="flex justify-between text-xs pt-1 border-t border-orange-200 mt-1">
                    <span className="text-gray-600 font-semibold">PAVE Comercial:</span>
                    <span className="font-bold text-indigo-700">{totalPaveCommercial}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600 font-semibold">Kit Master:</span>
                    <span className="font-bold text-yellow-700">{totalKitMaster}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600 font-semibold">GPS Vendas:</span>
                    <span className="font-bold text-cyan-700">{totalGpsVendas}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}