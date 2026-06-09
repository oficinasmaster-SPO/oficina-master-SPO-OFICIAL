import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, TrendingUp, CheckCircle, XCircle, Eye } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ['#0088FE', '#FF8042', '#00C49F'];

export default function DashboardTelemetriaPerfis() {
  const [periodo, setPeriodo] = useState('7d');

  const { data: telemetria, isLoading } = useQuery({
    queryKey: ['telemetria-perfis', periodo],
    queryFn: async () => {
      const dados = await base44.asServiceRole.entities.ProfileSuggestionTelemetry.list();
      return dados || [];
    },
    enabled: true,
  });

  // Calcular métricas
  const metricas = React.useMemo(() => {
    if (!telemetria) return null;

    const totalGeradas = telemetria.filter(t => t.event_type === 'profile_suggestion_generated').length;
    const totalAceitas = telemetria.filter(t => t.event_type === 'profile_suggestion_accepted').length;
    const totalRejeitadas = telemetria.filter(t => t.event_type === 'profile_suggestion_rejected').length;
    
    const taxaAceitacao = totalGeradas > 0 ? ((totalAceitas / totalGeradas) * 100).toFixed(1) : 0;
    
    // Agrupar por job_role
    const porJobRole = {};
    telemetria.forEach(t => {
      if (!porJobRole[t.job_role]) {
        porJobRole[t.job_role] = { geradas: 0, aceitas: 0, rejeitadas: 0 };
      }
      if (t.event_type === 'profile_suggestion_generated') porJobRole[t.job_role].geradas++;
      if (t.event_type === 'profile_suggestion_accepted') porJobRole[t.job_role].aceitas++;
      if (t.event_type === 'profile_suggestion_rejected') porJobRole[t.job_role].rejeitadas++;
    });

    const jobRolesData = Object.entries(porJobRole).map(([job_role, dados]) => ({
      job_role,
      geradas: dados.geradas,
      aceitas: dados.aceitas,
      rejeitadas: dados.rejeitadas,
      taxa_aceitacao: dados.geradas > 0 ? ((dados.aceitas / dados.geradas) * 100).toFixed(1) : 0
    }));

    // Top job_roles com mais rejeições
    const topRejeicoes = [...jobRolesData]
      .sort((a, b) => b.rejeitadas - a.rejeitadas)
      .slice(0, 5);

    return {
      totalGeradas,
      totalAceitas,
      totalRejeitadas,
      taxaAceitacao,
      jobRolesData,
      topRejeicoes
    };
  }, [telemetria]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Telemetria de Perfis - Fase 3.5</h1>
          <p className="text-gray-600">Acompanhamento de sugestões de perfil por job_role</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sugestões Geradas</CardTitle>
              <Eye className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metricas?.totalGeradas || 0}</div>
              <p className="text-xs text-gray-500">Total de sugestões exibidas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sugestões Aceitas</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metricas?.totalAceitas || 0}</div>
              <p className="text-xs text-gray-500">Usuários aceitaram a sugestão</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sugestões Rejeitadas</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metricas?.totalRejeitadas || 0}</div>
              <p className="text-xs text-gray-500">Usuários escolheram outro perfil</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Aceitação</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metricas?.taxaAceitacao || 0}%</div>
              <p className="text-xs text-gray-500">
                {metricas?.taxaAceitacao >= 90 ? '✅ Excelente' : 
                 metricas?.taxaAceitacao >= 80 ? '⚠️ Boa' : '❌ Revisar mapeamento'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico por Job Role */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Sugestões por Job Role</CardTitle>
              <CardDescription>Distribuição de sugestões por cargo</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metricas?.jobRolesData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="job_role" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="geradas" fill="#0088FE" name="Geradas" />
                  <Bar dataKey="aceitas" fill="#00C49F" name="Aceitas" />
                  <Bar dataKey="rejeitadas" fill="#FF8042" name="Rejeitadas" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Taxa de Aceitação por Job Role</CardTitle>
              <CardDescription>Qualidade do mapeamento por cargo</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metricas?.jobRolesData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="job_role" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Bar dataKey="taxa_aceitacao" fill="#8884d8" name="Taxa de Aceitação (%)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Top Rejeições */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Top 5 Job Roles com Mais Rejeições</CardTitle>
            <CardDescription>Cargos que precisam de revisão no mapeamento</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metricas?.topRejeicoes.map((item, index) => (
                <div key={item.job_role} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-red-600">#{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{item.job_role}</p>
                      <p className="text-sm text-gray-500">
                        {item.aceitas} aceitas / {item.rejeitadas} rejeitadas
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-red-600">{item.rejeitadas}</p>
                    <p className="text-xs text-gray-500">rejeições</p>
                  </div>
                </div>
              ))}
              {(!metricas?.topRejeicoes || metricas.topRejeicoes.length === 0) && (
                <p className="text-gray-500 text-center py-8">Nenhuma rejeição registrada</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabela Detalhada */}
        <Card>
          <CardHeader>
            <CardTitle>Dados Detalhados por Job Role</CardTitle>
            <CardDescription>Métricas completas de telemetria</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Job Role</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Geradas</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Aceitas</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Rejeitadas</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Taxa de Aceitação</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {metricas?.jobRolesData.map((item) => (
                    <tr key={item.job_role} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{item.job_role}</td>
                      <td className="text-center py-3 px-4">{item.geradas}</td>
                      <td className="text-center py-3 px-4 text-green-600">{item.aceitas}</td>
                      <td className="text-center py-3 px-4 text-red-600">{item.rejeitadas}</td>
                      <td className="text-center py-3 px-4 font-bold">{item.taxa_aceitacao}%</td>
                      <td className="text-center py-3 px-4">
                        {item.taxa_aceitacao >= 90 ? (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">✅ Excelente</span>
                        ) : item.taxa_aceitacao >= 80 ? (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-semibold">⚠️ Boa</span>
                        ) : (
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">❌ Revisar</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}