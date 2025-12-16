import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function UsageStatistics({ sessions }) {
  // Páginas mais visitadas
  const pageViews = {};
  
  // Calcular estatísticas
  const hourlyData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}h`,
    sessions: 0
  }));

  sessions.forEach(session => {
    const hour = new Date(session.login_time).getHours();
    hourlyData[hour].sessions += 1;
  });

  const COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Sessões por Horário</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="sessions" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resumo de Atividade</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Total de Sessões</span>
              <span className="text-2xl font-bold text-blue-600">{sessions.length}</span>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Sessões Ativas</span>
              <span className="text-2xl font-bold text-green-600">
                {sessions.filter(s => s.is_active).length}
              </span>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Média de Páginas/Sessão</span>
              <span className="text-2xl font-bold text-purple-600">
                {sessions.length > 0 
                  ? Math.round(sessions.reduce((acc, s) => acc + (s.pages_visited || 0), 0) / sessions.length)
                  : 0}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}