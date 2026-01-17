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
      </CardContent>
    </Card>
  );
}