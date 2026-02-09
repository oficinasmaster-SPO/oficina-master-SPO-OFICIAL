import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PermissionTrendsChart({ logs }) {
  const trendData = useMemo(() => {
    // Últimos 30 dias
    const days = Array.from({ length: 30 }, (_, i) => {
      const date = startOfDay(subDays(new Date(), 29 - i));
      const dayLogs = (logs || []).filter(log => {
        if (!log.created_date) return false;
        const logDate = startOfDay(new Date(log.created_date));
        return logDate.getTime() === date.getTime();
      });

      return {
        date: format(date, "dd/MM", { locale: ptBR }),
        profiles: dayLogs.filter(l => l.action_type?.includes('profile')).length,
        roles: dayLogs.filter(l => l.action_type?.includes('role')).length,
        permissions: dayLogs.filter(l => l.action_type?.includes('permission')).length,
        total: dayLogs.length
      };
    });

    return days;
  }, [logs]);

  const totalChanges = trendData.reduce((sum, day) => sum + day.total, 0);
  const lastWeekChanges = trendData.slice(-7).reduce((sum, day) => sum + day.total, 0);
  const previousWeekChanges = trendData.slice(-14, -7).reduce((sum, day) => sum + day.total, 0);
  
  const weekTrend = previousWeekChanges > 0 
    ? ((lastWeekChanges - previousWeekChanges) / previousWeekChanges * 100)
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Tendência de Alterações (30 dias)
          </CardTitle>
          <div className="flex items-center gap-2">
            {weekTrend >= 0 ? (
              <TrendingUp className="w-4 h-4 text-green-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-600" />
            )}
            <span className={`text-sm font-semibold ${weekTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {weekTrend >= 0 ? '+' : ''}{weekTrend.toFixed(1)}% vs semana anterior
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              style={{ fontSize: '11px' }}
              interval="preserveStartEnd"
            />
            <YAxis style={{ fontSize: '12px' }} />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="total" 
              stroke="#3b82f6" 
              name="Total" 
              strokeWidth={2}
              dot={{ r: 2 }}
            />
            <Line 
              type="monotone" 
              dataKey="profiles" 
              stroke="#8b5cf6" 
              name="Perfis" 
              strokeWidth={2}
              dot={{ r: 2 }}
            />
            <Line 
              type="monotone" 
              dataKey="roles" 
              stroke="#10b981" 
              name="Roles" 
              strokeWidth={2}
              dot={{ r: 2 }}
            />
            <Line 
              type="monotone" 
              dataKey="permissions" 
              stroke="#f59e0b" 
              name="Permissões" 
              strokeWidth={2}
              dot={{ r: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            Total de {totalChanges} alterações nos últimos 30 dias
          </p>
        </div>
      </CardContent>
    </Card>
  );
}