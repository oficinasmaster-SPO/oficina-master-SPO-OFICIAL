import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Users, Shield, TrendingUp, Clock, User } from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];

export default function RBACLogStats({ logs }) {
  const stats = {
    total: logs.length,
    profileChanges: logs.filter(l => l.action_type?.includes('profile')).length,
    roleChanges: logs.filter(l => l.action_type?.includes('role')).length,
    permissionChanges: logs.filter(l => l.action_type?.includes('permission')).length,
    affectedUsers: logs.reduce((sum, l) => sum + (l.affected_users_count || 0), 0)
  };

  // Tendência nos últimos 7 dias
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = startOfDay(subDays(new Date(), 6 - i));
    const dayLogs = logs.filter(log => {
      if (!log.created_date) return false;
      const logDate = startOfDay(new Date(log.created_date));
      return logDate.getTime() === date.getTime();
    });
    
    return {
      date: format(date, "dd/MM", { locale: ptBR }),
      total: dayLogs.length,
      profiles: dayLogs.filter(l => l.action_type?.includes('profile')).length,
      roles: dayLogs.filter(l => l.action_type?.includes('role')).length
    };
  });

  // Distribuição por tipo de ação
  const actionTypes = [
    { name: 'Perfis', value: stats.profileChanges, color: '#3b82f6' },
    { name: 'Roles', value: stats.roleChanges, color: '#8b5cf6' },
    { name: 'Permissões', value: stats.permissionChanges, color: '#10b981' }
  ].filter(item => item.value > 0);

  // Top 5 usuários mais ativos
  const userActivity = {};
  logs.forEach(log => {
    const user = log.performed_by_name || log.performed_by || 'Desconhecido';
    userActivity[user] = (userActivity[user] || 0) + 1;
  });
  
  const topUsers = Object.entries(userActivity)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  return (
    <div className="space-y-6 mb-6">
      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Total de Ações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Perfis Alterados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{stats.profileChanges}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Roles Alteradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-600">{stats.roleChanges}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Usuários Impactados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600">{stats.affectedUsers}</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos de tendências e distribuição */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tendência últimos 7 dias */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Tendência de Atividade (7 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={last7Days}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" style={{ fontSize: '12px' }} />
                <YAxis style={{ fontSize: '12px' }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#3b82f6" name="Total" strokeWidth={2} />
                <Line type="monotone" dataKey="profiles" stroke="#8b5cf6" name="Perfis" strokeWidth={2} />
                <Line type="monotone" dataKey="roles" stroke="#10b981" name="Roles" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribuição por tipo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="w-5 h-5 text-purple-600" />
              Distribuição por Tipo de Ação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={actionTypes}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {actionTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top usuários ativos */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="w-5 h-5 text-orange-600" />
              Usuários Mais Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topUsers}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" style={{ fontSize: '12px' }} />
                <YAxis style={{ fontSize: '12px' }} />
                <Tooltip />
                <Bar dataKey="count" fill="#f59e0b" name="Ações Realizadas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}