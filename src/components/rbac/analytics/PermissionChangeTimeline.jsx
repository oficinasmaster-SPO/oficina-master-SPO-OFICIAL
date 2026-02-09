import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Clock, TrendingUp } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PermissionChangeTimeline({ logs }) {
  const timelineData = useMemo(() => {
    // Últimos 6 meses
    const months = Array.from({ length: 6 }, (_, i) => {
      const monthDate = subMonths(new Date(), 5 - i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      const monthLogs = (logs || []).filter(log => {
        if (!log.created_date) return false;
        const logDate = new Date(log.created_date);
        return isWithinInterval(logDate, { start: monthStart, end: monthEnd });
      });

      return {
        month: format(monthDate, "MMM/yy", { locale: ptBR }),
        profileCreated: monthLogs.filter(l => l.action_type === 'profile_created').length,
        profileUpdated: monthLogs.filter(l => l.action_type === 'profile_updated').length,
        profileDeleted: monthLogs.filter(l => l.action_type === 'profile_deleted').length,
        roleCreated: monthLogs.filter(l => l.action_type === 'role_created').length,
        roleUpdated: monthLogs.filter(l => l.action_type === 'role_updated').length,
        roleDeleted: monthLogs.filter(l => l.action_type === 'role_deleted').length,
        total: monthLogs.length
      };
    });

    return months;
  }, [logs]);

  const mostActiveMonth = timelineData.reduce((max, month) => 
    month.total > max.total ? month : max, timelineData[0] || { total: 0 }
  );

  const lastMonthChanges = timelineData[timelineData.length - 1]?.total || 0;
  const previousMonthChanges = timelineData[timelineData.length - 2]?.total || 0;
  const monthTrend = previousMonthChanges > 0 
    ? ((lastMonthChanges - previousMonthChanges) / previousMonthChanges * 100).toFixed(1)
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="w-5 h-5 text-purple-600" />
            Linha do Tempo de Alterações (6 meses)
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-gray-600">Mês mais ativo:</p>
              <Badge className="bg-purple-100 text-purple-700">
                {mostActiveMonth.month} ({mostActiveMonth.total})
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={timelineData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" style={{ fontSize: '12px' }} />
            <YAxis style={{ fontSize: '12px' }} />
            <Tooltip />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="profileCreated" 
              stackId="1"
              stroke="#3b82f6" 
              fill="#3b82f6" 
              fillOpacity={0.6}
              name="Perfis Criados" 
            />
            <Area 
              type="monotone" 
              dataKey="profileUpdated" 
              stackId="1"
              stroke="#8b5cf6" 
              fill="#8b5cf6" 
              fillOpacity={0.6}
              name="Perfis Atualizados" 
            />
            <Area 
              type="monotone" 
              dataKey="roleCreated" 
              stackId="1"
              stroke="#10b981" 
              fill="#10b981" 
              fillOpacity={0.6}
              name="Roles Criadas" 
            />
            <Area 
              type="monotone" 
              dataKey="roleUpdated" 
              stackId="1"
              stroke="#f59e0b" 
              fill="#f59e0b" 
              fillOpacity={0.6}
              name="Roles Atualizadas" 
            />
          </AreaChart>
        </ResponsiveContainer>
        <div className="mt-4 flex items-center justify-center gap-2 text-sm">
          <TrendingUp className={`w-4 h-4 ${monthTrend >= 0 ? 'text-green-600' : 'text-red-600'}`} />
          <span className="text-gray-600">
            {monthTrend >= 0 ? '+' : ''}{monthTrend}% de alterações vs mês anterior
          </span>
        </div>
      </CardContent>
    </Card>
  );
}