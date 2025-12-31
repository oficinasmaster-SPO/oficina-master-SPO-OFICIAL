import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Users, Target, Clock } from "lucide-react";

export default function RitualAnalytics({ workshop }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (workshop?.id) {
      loadAnalytics();
    }
  }, [workshop?.id]);

  const loadAnalytics = async () => {
    try {
      const [rituals, schedules, employees] = await Promise.all([
        base44.entities.Ritual.filter({ workshop_id: workshop.id }),
        base44.entities.ScheduledRitual.filter({ workshop_id: workshop.id }),
        base44.entities.Employee.filter({ workshop_id: workshop.id, status: "ativo" })
      ]);

      // Rituais mais executados
      const ritualExecutionCount = {};
      schedules.forEach(s => {
        const ritual = rituals.find(r => r.id === s.ritual_id);
        if (ritual) {
          ritualExecutionCount[ritual.name] = (ritualExecutionCount[ritual.name] || 0) + 1;
        }
      });

      const topRituals = Object.entries(ritualExecutionCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, executions: count }));

      // Status dos agendamentos
      const statusCount = schedules.reduce((acc, s) => {
        acc[s.status] = (acc[s.status] || 0) + 1;
        return acc;
      }, {});

      const statusData = Object.entries(statusCount).map(([status, count]) => ({
        name: status === "agendado" ? "Agendado" : status === "concluido" ? "Concluído" : "Realizado",
        value: count
      }));

      // Responsáveis mais ativos
      const responsibleCount = {};
      rituals.forEach(r => {
        if (r.responsible_user_id) {
          const emp = employees.find(e => e.user_id === r.responsible_user_id || e.id === r.responsible_user_id);
          if (emp) {
            responsibleCount[emp.full_name] = (responsibleCount[emp.full_name] || 0) + 1;
          }
        }
      });

      const topResponsibles = Object.entries(responsibleCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, rituais: count }));

      setAnalytics({
        topRituals,
        statusData,
        topResponsibles,
        totalRituals: rituals.length,
        totalSchedules: schedules.length,
        completionRate: schedules.length > 0 
          ? Math.round((schedules.filter(s => s.status === "concluido").length / schedules.length) * 100)
          : 0
      });
    } catch (error) {
      console.error("Erro ao carregar analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          Carregando métricas...
        </CardContent>
      </Card>
    );
  }

  if (!analytics) return null;

  const COLORS = ["#8b5cf6", "#ec4899", "#3b82f6", "#10b981", "#f59e0b"];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{analytics.totalRituals}</p>
                <p className="text-xs text-gray-600">Rituais Criados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{analytics.totalSchedules}</p>
                <p className="text-xs text-gray-600">Total Agendamentos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{analytics.completionRate}%</p>
                <p className="text-xs text-gray-600">Taxa Conclusão</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Rituais */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rituais Mais Executados</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.topRituals.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.topRituals}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} fontSize={10} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="executions" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">Nenhum dado disponível</p>
            )}
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição por Status</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics.statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analytics.statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">Nenhum dado disponível</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Responsáveis */}
      {analytics.topResponsibles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-5 h-5" />
              Responsáveis Mais Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.topResponsibles.map((resp, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm font-medium">{resp.name}</span>
                  <Badge>{resp.rituais} rituais</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}