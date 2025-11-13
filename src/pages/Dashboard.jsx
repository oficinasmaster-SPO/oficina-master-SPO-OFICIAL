import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, BarChart3, PieChart as PieChartIcon, TrendingUp, Users, Building, Award, Clock, CheckCircle2 } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [periodFilter, setPeriodFilter] = useState("all");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      // Verificar se é admin ou consultor
      if (currentUser.role === "admin" || currentUser.role === "user") {
        setIsAuthorized(true);
      } else {
        navigate(createPageUrl("Home"));
      }
    } catch (error) {
      navigate(createPageUrl("Home"));
    }
  };

  const { data: diagnostics, isLoading: loadingDiagnostics } = useQuery({
    queryKey: ['diagnostics', periodFilter],
    queryFn: () => base44.entities.Diagnostic.list('-created_date'),
    initialData: [],
    enabled: isAuthorized
  });

  const { data: workshops, isLoading: loadingWorkshops } = useQuery({
    queryKey: ['workshops'],
    queryFn: () => base44.entities.Workshop.list(),
    initialData: [],
    enabled: isAuthorized
  });

  const { data: actionPlans, isLoading: loadingPlans } = useQuery({
    queryKey: ['actionPlans'],
    queryFn: () => base44.entities.ActionPlan.list(),
    initialData: [],
    enabled: isAuthorized
  });

  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
    enabled: isAuthorized
  });

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const isLoading = loadingDiagnostics || loadingWorkshops || loadingPlans || loadingUsers;

  // Filtrar diagnósticos por período
  const filterDiagnosticsByPeriod = () => {
    if (periodFilter === "all") return diagnostics;
    
    const now = new Date();
    const daysAgo = {
      "30": 30,
      "90": 90,
      "180": 180,
      "365": 365
    }[periodFilter];

    if (!daysAgo) return diagnostics;
    
    const cutoffDate = new Date(now.setDate(now.getDate() - daysAgo));
    return diagnostics.filter(d => new Date(d.created_date) >= cutoffDate);
  };

  const filteredDiagnostics = filterDiagnosticsByPeriod();

  // Cálculos de métricas
  const totalDiagnostics = filteredDiagnostics.length;
  const completedPlans = actionPlans.filter(plan => 
    plan.actions.every(action => action.status === "concluido")
  ).length;

  // Distribuição por fase
  const phaseDistribution = [
    { name: "Fase 1 - Sobrevivência", value: filteredDiagnostics.filter(d => d.phase === 1).length, color: "#ef4444" },
    { name: "Fase 2 - Crescimento", value: filteredDiagnostics.filter(d => d.phase === 2).length, color: "#f59e0b" },
    { name: "Fase 3 - Organização", value: filteredDiagnostics.filter(d => d.phase === 3).length, color: "#3b82f6" },
    { name: "Fase 4 - Consolidação", value: filteredDiagnostics.filter(d => d.phase === 4).length, color: "#10b981" }
  ];

  // Distribuição por estado
  const workshopsByState = workshops.reduce((acc, workshop) => {
    const state = workshop.state || "Não informado";
    acc[state] = (acc[state] || 0) + 1;
    return acc;
  }, {});

  const stateDistribution = Object.entries(workshopsByState).map(([state, count]) => ({
    name: state,
    value: count
  })).slice(0, 10); // Top 10 estados

  // Fases por segmento
  const phaseBySegment = workshops.reduce((acc, workshop) => {
    const diagnostic = filteredDiagnostics.find(d => d.workshop_id === workshop.id);
    if (!diagnostic) return acc;

    const segment = workshop.segment || "outro";
    if (!acc[segment]) {
      acc[segment] = { mecanica_leve: 0, premium: 0, moto: 0, caminhao: 0, outro: 0 };
    }
    
    const phaseName = `fase${diagnostic.phase}`;
    acc[segment][phaseName] = (acc[segment][phaseName] || 0) + 1;
    
    return acc;
  }, {});

  const segmentData = Object.entries(phaseBySegment).map(([segment, phases]) => ({
    segment: segment.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    ...phases
  }));

  // Progresso dos planos ao longo do tempo
  const planProgress = actionPlans.map(plan => {
    const completed = plan.actions.filter(a => a.status === "concluido").length;
    const total = plan.actions.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    const diagnostic = filteredDiagnostics.find(d => d.id === plan.diagnostic_id);
    
    return {
      id: plan.id,
      percentage,
      phase: diagnostic?.phase || 0,
      date: diagnostic?.created_date || plan.created_date
    };
  });

  const avgProgress = planProgress.length > 0 
    ? Math.round(planProgress.reduce((sum, p) => sum + p.percentage, 0) / planProgress.length)
    : 0;

  // Desempenho por consultor
  const consultantPerformance = users
    .filter(u => u.role === "user" || u.role === "admin")
    .map(consultant => {
      const consultantDiagnostics = filteredDiagnostics.filter(d => d.user_id === consultant.id);
      const consultantPlans = actionPlans.filter(plan => 
        consultantDiagnostics.some(d => d.id === plan.diagnostic_id)
      );
      
      const completedPlans = consultantPlans.filter(plan =>
        plan.actions.every(a => a.status === "concluido")
      ).length;

      return {
        name: consultant.full_name || consultant.email,
        diagnosticos: consultantDiagnostics.length,
        planosCompletos: completedPlans,
        taxaConclusao: consultantPlans.length > 0 
          ? Math.round((completedPlans / consultantPlans.length) * 100)
          : 0
      };
    })
    .filter(c => c.diagnosticos > 0)
    .sort((a, b) => b.diagnosticos - a.diagnosticos);

  // Evolução temporal
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - i));
    return date;
  });

  const temporalEvolution = last6Months.map(date => {
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    const monthDiagnostics = diagnostics.filter(d => {
      const diagDate = new Date(d.created_date);
      return diagDate >= monthStart && diagDate <= monthEnd;
    });

    return {
      mes: date.toLocaleDateString('pt-BR', { month: 'short' }),
      diagnosticos: monthDiagnostics.length,
      fase1: monthDiagnostics.filter(d => d.phase === 1).length,
      fase2: monthDiagnostics.filter(d => d.phase === 2).length,
      fase3: monthDiagnostics.filter(d => d.phase === 3).length,
      fase4: monthDiagnostics.filter(d => d.phase === 4).length
    };
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Dashboard de Consultoria
              </h1>
              <p className="text-gray-600">
                Análise completa dos diagnósticos e desempenho
              </p>
            </div>
            
            <div className="w-full md:w-64">
              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo o Período</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                  <SelectItem value="180">Últimos 6 meses</SelectItem>
                  <SelectItem value="365">Último ano</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total de Diagnósticos</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{totalDiagnostics}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Oficinas Cadastradas</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{workshops.length}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Building className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Planos Completos</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{completedPlans}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Progresso Médio</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{avgProgress}%</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white shadow-md">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="regions">Regiões</TabsTrigger>
            <TabsTrigger value="segments">Segmentos</TabsTrigger>
            <TabsTrigger value="consultants">Consultores</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Distribuição por Fase */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChartIcon className="w-5 h-5" />
                    Distribuição por Fase
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={phaseDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name.split(' - ')[0]}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {phaseDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Evolução Temporal */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Evolução nos Últimos 6 Meses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={temporalEvolution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="diagnosticos" stroke="#3b82f6" name="Total" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Evolução por Fase */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Evolução por Fase
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={temporalEvolution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="fase1" fill="#ef4444" name="Fase 1" />
                    <Bar dataKey="fase2" fill="#f59e0b" name="Fase 2" />
                    <Bar dataKey="fase3" fill="#3b82f6" name="Fase 3" />
                    <Bar dataKey="fase4" fill="#10b981" name="Fase 4" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Regions Tab */}
          <TabsContent value="regions" className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  Distribuição por Estado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={stateDistribution} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" name="Oficinas" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Segments Tab */}
          <TabsContent value="segments" className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5" />
                  Fases por Segmento de Oficina
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={segmentData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="segment" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="fase1" fill="#ef4444" name="Fase 1" />
                    <Bar dataKey="fase2" fill="#f59e0b" name="Fase 2" />
                    <Bar dataKey="fase3" fill="#3b82f6" name="Fase 3" />
                    <Bar dataKey="fase4" fill="#10b981" name="Fase 4" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Consultants Tab */}
          <TabsContent value="consultants" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Diagnósticos por Consultor
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={consultantPerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="diagnosticos" fill="#3b82f6" name="Diagnósticos" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    Taxa de Conclusão por Consultor
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={consultantPerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="taxaConclusao" fill="#10b981" name="Taxa (%)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Tabela de Performance */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Ranking de Consultores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-semibold text-gray-700">Posição</th>
                        <th className="text-left p-3 font-semibold text-gray-700">Consultor</th>
                        <th className="text-center p-3 font-semibold text-gray-700">Diagnósticos</th>
                        <th className="text-center p-3 font-semibold text-gray-700">Planos Completos</th>
                        <th className="text-center p-3 font-semibold text-gray-700">Taxa de Conclusão</th>
                      </tr>
                    </thead>
                    <tbody>
                      {consultantPerformance.map((consultant, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="p-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                              index === 0 ? 'bg-yellow-100 text-yellow-700' :
                              index === 1 ? 'bg-gray-100 text-gray-700' :
                              index === 2 ? 'bg-orange-100 text-orange-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {index + 1}
                            </div>
                          </td>
                          <td className="p-3 font-medium">{consultant.name}</td>
                          <td className="p-3 text-center">{consultant.diagnosticos}</td>
                          <td className="p-3 text-center">{consultant.planosCompletos}</td>
                          <td className="p-3 text-center">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              consultant.taxaConclusao >= 80 ? 'bg-green-100 text-green-700' :
                              consultant.taxaConclusao >= 50 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {consultant.taxaConclusao}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}