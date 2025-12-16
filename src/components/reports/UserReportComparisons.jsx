import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function UserReportComparisons({ userData, filters }) {
  const { sessions, activityLogs } = userData;

  // Métricas do usuário
  const userMetrics = {
    totalSessions: sessions.length,
    totalActions: activityLogs.length,
    avgSessionTime: sessions.length > 0 
      ? sessions.reduce((acc, s) => {
          if (s.end_time) {
            return acc + (new Date(s.end_time) - new Date(s.start_time));
          }
          return acc;
        }, 0) / sessions.length / 60000 // em minutos
      : 0,
    actionsPerSession: sessions.length > 0 ? activityLogs.length / sessions.length : 0
  };

  // Simulação de médias (em produção, buscar dados reais)
  const averageMetrics = {
    totalSessions: 15,
    totalActions: 120,
    avgSessionTime: 25,
    actionsPerSession: 8
  };

  const compareMetric = (userValue, avgValue) => {
    const diff = ((userValue - avgValue) / avgValue) * 100;
    return {
      diff: diff.toFixed(1),
      isAbove: diff > 0,
      isBelow: diff < 0,
      isEqual: Math.abs(diff) < 5
    };
  };

  const comparisons = [
    {
      metric: "Sessões Totais",
      user: userMetrics.totalSessions,
      average: averageMetrics.totalSessions,
      comparison: compareMetric(userMetrics.totalSessions, averageMetrics.totalSessions)
    },
    {
      metric: "Ações Executadas",
      user: userMetrics.totalActions,
      average: averageMetrics.totalActions,
      comparison: compareMetric(userMetrics.totalActions, averageMetrics.totalActions)
    },
    {
      metric: "Tempo Médio por Sessão (min)",
      user: Math.round(userMetrics.avgSessionTime),
      average: averageMetrics.avgSessionTime,
      comparison: compareMetric(userMetrics.avgSessionTime, averageMetrics.avgSessionTime)
    },
    {
      metric: "Ações por Sessão",
      user: userMetrics.actionsPerSession.toFixed(1),
      average: averageMetrics.actionsPerSession,
      comparison: compareMetric(userMetrics.actionsPerSession, averageMetrics.actionsPerSession)
    }
  ];

  const chartData = comparisons.map(c => ({
    name: c.metric,
    Usuário: parseFloat(c.user),
    Média: c.average
  }));

  const getTrendIcon = (comparison) => {
    if (comparison.isAbove) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (comparison.isBelow) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-slate-400" />;
  };

  const getTrendColor = (comparison) => {
    if (comparison.isAbove) return 'text-green-600';
    if (comparison.isBelow) return 'text-red-600';
    return 'text-slate-600';
  };

  return (
    <div className="space-y-6">
      {/* Gráfico Comparativo */}
      <Card>
        <CardHeader>
          <CardTitle>Comparativo: Usuário vs Média do Perfil</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" angle={-15} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Usuário" fill="#3b82f6" />
              <Bar dataKey="Média" fill="#94a3b8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Comparações Detalhadas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {comparisons.map((comp, idx) => (
          <Card key={idx}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm text-slate-600">{comp.metric}</p>
                  <p className="text-2xl font-bold mt-1">{comp.user}</p>
                </div>
                {getTrendIcon(comp.comparison)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">
                  Média: {comp.average}
                </span>
                <Badge variant="outline" className={getTrendColor(comp.comparison)}>
                  {comp.comparison.isAbove && '+'}
                  {comp.comparison.diff}%
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alertas e Padrões */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Análise de Comportamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {comparisons.map((comp, idx) => {
              if (comp.comparison.isEqual) return null;
              
              return (
                <div 
                  key={idx} 
                  className={`p-4 rounded-lg border ${
                    comp.comparison.isAbove 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-orange-50 border-orange-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {comp.comparison.isAbove ? (
                      <TrendingUp className="w-5 h-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-orange-600 flex-shrink-0" />
                    )}
                    <div>
                      <p className={`text-sm font-medium ${
                        comp.comparison.isAbove ? 'text-green-900' : 'text-orange-900'
                      }`}>
                        {comp.metric}: {comp.comparison.isAbove ? 'Acima' : 'Abaixo'} da Média
                      </p>
                      <p className={`text-xs mt-1 ${
                        comp.comparison.isAbove ? 'text-green-700' : 'text-orange-700'
                      }`}>
                        {comp.comparison.isAbove 
                          ? `Usuário apresenta ${comp.comparison.diff}% mais que a média do perfil.`
                          : `Usuário apresenta ${Math.abs(comp.comparison.diff)}% menos que a média do perfil.`
                        }
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            {comparisons.every(c => c.comparison.isEqual) && (
              <div className="text-center py-8 text-slate-500">
                <p>Comportamento dentro do padrão esperado</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}