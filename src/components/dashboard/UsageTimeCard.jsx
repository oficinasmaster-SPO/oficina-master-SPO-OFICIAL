import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Clock, Users, TrendingUp } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

export default function UsageTimeCard({ userProfiles, workshopProfiles }) {
  // Calcular tempo total de uso
  const totalUserHours = userProfiles.reduce((sum, profile) => 
    sum + (profile.platform_usage_hours || 0), 0
  );

  const totalWorkshopHours = workshopProfiles.reduce((sum, profile) => 
    sum + (profile.total_engagement_hours || 0), 0
  );

  // Calcular média de engajamento
  const avgUserEngagement = userProfiles.length > 0
    ? userProfiles.reduce((sum, p) => sum + (p.total_actions || 0), 0) / userProfiles.length
    : 0;

  // Distribuição de uso por nível
  const usageByLevel = userProfiles.reduce((acc, profile) => {
    const level = profile.level_name || 'Iniciante';
    acc[level] = (acc[level] || 0) + (profile.platform_usage_hours || 0);
    return acc;
  }, {});

  const chartData = Object.entries(usageByLevel).map(([name, value]) => ({
    name,
    value: Math.round(value)
  }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Tempo de Uso da Plataforma
          </CardTitle>
          <CardDescription>Engajamento total de usuários e oficinas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600 mb-1">Usuários Totais</p>
                <p className="text-3xl font-bold text-blue-600">{totalUserHours.toFixed(0)}h</p>
                <p className="text-xs text-gray-500 mt-1">
                  Média: {(totalUserHours / Math.max(userProfiles.length, 1)).toFixed(1)}h por usuário
                </p>
              </div>
              <Users className="w-12 h-12 text-blue-600 opacity-50" />
            </div>

            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600 mb-1">Oficinas Totais</p>
                <p className="text-3xl font-bold text-green-600">{totalWorkshopHours.toFixed(0)}h</p>
                <p className="text-xs text-gray-500 mt-1">
                  Média: {(totalWorkshopHours / Math.max(workshopProfiles.length, 1)).toFixed(1)}h por oficina
                </p>
              </div>
              <TrendingUp className="w-12 h-12 text-green-600 opacity-50" />
            </div>

            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Engajamento Médio</p>
              <p className="text-2xl font-bold text-purple-600">
                {avgUserEngagement.toFixed(0)} ações/usuário
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Inclui diagnósticos, metas, e interações na plataforma
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Distribuição de Uso por Nível</CardTitle>
          <CardDescription>Horas de uso segmentadas por nível de gamificação</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value}h`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              Sem dados de uso registrados
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}