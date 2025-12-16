import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { AlertCircle } from "lucide-react";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function UserReportNavigation({ userData, filters }) {
  const { activityLogs } = userData;

  // Agrupar por página
  const pageStats = useMemo(() => {
    const stats = {};
    
    activityLogs.forEach(log => {
      const pageName = log.page_name || 'Página desconhecida';
      if (!stats[pageName]) {
        stats[pageName] = {
          visits: 0,
          totalTime: 0,
          actions: []
        };
      }
      stats[pageName].visits++;
      if (log.duration_seconds) {
        stats[pageName].totalTime += log.duration_seconds;
      }
      stats[pageName].actions.push(log.action_type);
    });

    return Object.entries(stats).map(([page, data]) => ({
      page,
      visits: data.visits,
      avgTime: data.visits > 0 ? Math.round(data.totalTime / data.visits) : 0,
      totalTime: data.totalTime
    })).sort((a, b) => b.visits - a.visits);
  }, [activityLogs]);

  // Dados para gráfico de barras
  const chartData = pageStats.slice(0, 10).map(stat => ({
    name: stat.page.length > 20 ? stat.page.substring(0, 20) + '...' : stat.page,
    visits: stat.visits,
    tempo: Math.round(stat.totalTime / 60) // em minutos
  }));

  // Dados para gráfico de pizza
  const pieData = pageStats.slice(0, 7).map(stat => ({
    name: stat.page,
    value: stat.visits
  }));

  return (
    <div className="space-y-6">
      {/* Top 10 Páginas Mais Visitadas */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Páginas Mais Visitadas</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p>Nenhuma navegação registrada</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="visits" fill="#3b82f6" name="Visitas" />
                <Bar dataKey="tempo" fill="#10b981" name="Tempo (min)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Distribuição de Acessos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Acessos</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <p>Sem dados</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name.substring(0, 15)}...`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Estatísticas Detalhadas */}
        <Card>
          <CardHeader>
            <CardTitle>Estatísticas por Página</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[250px] overflow-y-auto">
              {pageStats.slice(0, 10).map((stat, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {stat.page}
                    </p>
                    <p className="text-xs text-slate-500">
                      Tempo médio: {Math.floor(stat.avgTime / 60)}min {stat.avgTime % 60}s
                    </p>
                  </div>
                  <Badge variant="outline">
                    {stat.visits} visitas
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista Completa */}
      <Card>
        <CardHeader>
          <CardTitle>Mapa Completo de Navegação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left p-3">Página</th>
                  <th className="text-center p-3">Visitas</th>
                  <th className="text-center p-3">Tempo Total</th>
                  <th className="text-center p-3">Tempo Médio</th>
                </tr>
              </thead>
              <tbody>
                {pageStats.map((stat, idx) => (
                  <tr key={idx} className="border-b hover:bg-slate-50">
                    <td className="p-3 font-medium">{stat.page}</td>
                    <td className="text-center p-3">{stat.visits}</td>
                    <td className="text-center p-3">
                      {Math.floor(stat.totalTime / 60)}min {stat.totalTime % 60}s
                    </td>
                    <td className="text-center p-3">
                      {Math.floor(stat.avgTime / 60)}min {stat.avgTime % 60}s
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}