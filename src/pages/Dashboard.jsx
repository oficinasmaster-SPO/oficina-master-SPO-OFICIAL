import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, DollarSign, TrendingUp, Percent, Target, Users, Award, BarChart3, Clock, Wrench, ShoppingCart, Calendar, CheckCircle, Calculator, UserCheck } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { formatCurrency, formatPercent } from "../components/utils/formatters";
import { Button } from "@/components/ui/button";

import MetricCard from "../components/dashboard/MetricCard";
import RankingTable from "../components/dashboard/RankingTable";
import UsageTimeCard from "../components/dashboard/UsageTimeCard";
import TechnicianRanking from "../components/dashboard/TechnicianRanking";
import SalesRanking from "../components/dashboard/SalesRanking";
import ManagerRanking from "../components/dashboard/ManagerRanking";
import IntegrationStatusWidget from "../components/dashboard/IntegrationStatusWidget";
import IntegrationMetricsChart from "../components/dashboard/IntegrationMetricsChart";
import QuickIntegrationsPanel from "../components/dashboard/QuickIntegrationsPanel";
import IntegrationHealthScore from "../components/dashboard/IntegrationHealthScore";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [stateFilter, setStateFilter] = useState("all");
  const [segmentFilter, setSegmentFilter] = useState("all");
  const [showUsageAsPercentage, setShowUsageAsPercentage] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      if (currentUser.role === "admin" || currentUser.role === "user") {
        setIsAuthorized(true);
      } else {
        navigate(createPageUrl("Home"));
      }
    } catch (error) {
      navigate(createPageUrl("Home"));
    }
  };

  const { data: workshops = [], isLoading: loadingWorkshops } = useQuery({
    queryKey: ['workshops'],
    queryFn: async () => {
      try {
        const result = await base44.entities.Workshop.list();
        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.log("Error fetching workshops:", error);
        return [];
      }
    },
    enabled: isAuthorized,
    retry: 1
  });

  const { data: osAssessments = [] } = useQuery({
    queryKey: ['os-assessments'],
    queryFn: async () => {
      try {
        const result = await base44.entities.ServiceOrderDiagnostic.list('-created_date');
        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.log("Error fetching OS assessments:", error);
        return [];
      }
    },
    enabled: isAuthorized,
    retry: 1
  });

  const { data: gameProfiles = [] } = useQuery({
    queryKey: ['game-profiles'],
    queryFn: async () => {
      try {
        const result = await base44.entities.WorkshopGameProfile.list();
        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.log("Error fetching game profiles:", error);
        return [];
      }
    },
    enabled: isAuthorized,
    retry: 1
  });

  const { data: userGameProfiles = [] } = useQuery({
    queryKey: ['user-game-profiles'],
    queryFn: async () => {
      try {
        const result = await base44.entities.UserGameProfile.list();
        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.log("Error fetching user game profiles:", error);
        return [];
      }
    },
    enabled: isAuthorized,
    retry: 1
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      try {
        const result = await base44.entities.Employee.list();
        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.log("Error fetching employees:", error);
        return [];
      }
    },
    enabled: isAuthorized,
    retry: 1
  });

  const { data: areaGoals = [] } = useQuery({
    queryKey: ['area-goals'],
    queryFn: async () => {
      try {
        const result = await base44.entities.AreaGoal.list();
        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.log("Error fetching area goals:", error);
        return [];
      }
    },
    enabled: isAuthorized,
    retry: 1
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      try {
        const users = await base44.entities.User.list();
        return Array.isArray(users) ? users : [];
      } catch (error) {
        console.log("Error fetching users:", error);
        return [];
      }
    },
    enabled: isAuthorized,
    retry: 1
  });

  const { data: userProgress = [] } = useQuery({
    queryKey: ['user-progress'],
    queryFn: async () => {
      try {
        const result = await base44.entities.UserProgress.list();
        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.log("Error fetching user progress:", error);
        return [];
      }
    },
    enabled: isAuthorized,
    retry: 1
  });

  if (!isAuthorized || loadingWorkshops) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Filtrar workshops
  const workshopsArray = Array.isArray(workshops) ? workshops : [];
  const filteredWorkshops = workshopsArray.filter(w => {
    if (!w) return false;
    if (stateFilter !== "all" && w.state !== stateFilter) return false;
    if (segmentFilter !== "all" && w.segment !== segmentFilter) return false;
    return true;
  });

  // Estados e segmentos
  const uniqueStates = [...new Set(workshopsArray.map(w => w?.state).filter(Boolean))].sort();
  
  const segmentLabels = {
    mecanica_leve: "Mecânica Auto",
    mecanica_pesada: "Truck Pesado",
    motos: "Oficina Motos",
    centro_automotivo: "Centro Automotivo",
    premium: "Oficina Premium Car",
    premium_motos: "Oficina Premium Motos",
    auto_center: "Auto Center (Pneus)",
    diesel_leve: "Diesel Leve",
    outro: "Outro"
  };

  // KPIs principais
  const totalRevenue = filteredWorkshops.reduce((sum, w) => 
    sum + (w.monthly_goals?.revenue_parts || 0) + (w.monthly_goals?.revenue_services || 0), 0
  );

  const avgTicket = filteredWorkshops.length > 0
    ? filteredWorkshops.reduce((sum, w) => sum + (w.monthly_goals?.average_ticket || 0), 0) / filteredWorkshops.length
    : 0;

  const avgProfit = filteredWorkshops.length > 0
    ? filteredWorkshops.reduce((sum, w) => sum + (w.monthly_goals?.profit_percentage || 0), 0) / filteredWorkshops.length
    : 0;

  const totalOS = osAssessments.length;
  const perfectOS = osAssessments.filter(os => os.classification === 'perfeita').length;
  const avgRentability = totalOS > 0 
    ? osAssessments.reduce((sum, os) => sum + (os.revenue_percentage || 0), 0) / totalOS 
    : 0;

  // Faturamento por técnico
  const employeesArray = Array.isArray(employees) ? employees : [];
  const technicians = employeesArray.filter(emp => emp?.area === 'tecnico' && emp?.status === 'ativo');
  const totalTechProduction = technicians.reduce((sum, tech) => 
    sum + (tech.production_parts || 0) + (tech.production_services || 0), 0
  );
  const avgTechRevenue = technicians.length > 0 ? totalTechProduction / technicians.length : 0;

  // Kit Master e Pneus (simulado - pode ser adicionado ao Workshop schema)
  const avgKitMaster = filteredWorkshops.length > 0 
    ? filteredWorkshops.reduce((sum, w) => sum + ((w.monthly_goals?.kit_master_sales || 0)), 0) / filteredWorkshops.length
    : 0;

  const avgPneusSales = filteredWorkshops.length > 0
    ? filteredWorkshops.reduce((sum, w) => sum + ((w.monthly_goals?.pneus_sales || 0)), 0) / filteredWorkshops.length
    : 0;

  // Agendamentos vs Vendas (simulado)
  const totalScheduled = filteredWorkshops.reduce((sum, w) => sum + (w.monthly_goals?.scheduled || 0), 0);
  const totalSold = filteredWorkshops.reduce((sum, w) => sum + (w.monthly_goals?.customer_volume || 0), 0);
  const conversionRate = totalScheduled > 0 ? (totalSold / totalScheduled) * 100 : 0;

  // TCMP2 médio
  const avgTCMP2 = osAssessments.length > 0
    ? osAssessments.reduce((sum, os) => sum + (os.ideal_hour_value || 0), 0) / osAssessments.length
    : 0;

  // Rankings
  const rankingFaturamento = filteredWorkshops
    .map(w => ({
      name: w.name,
      state: w.state,
      segment: segmentLabels[w.segment] || w.segment,
      value: (w.monthly_goals?.revenue_parts || 0) + (w.monthly_goals?.revenue_services || 0)
    }))
    .filter(w => w.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 50);

  const rankingTicket = filteredWorkshops
    .map(w => ({
      name: w.name,
      state: w.state,
      segment: segmentLabels[w.segment] || w.segment,
      value: w.monthly_goals?.average_ticket || 0
    }))
    .filter(w => w.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 50);

  const rankingRentabilidade = osAssessments
    .filter(os => os.revenue_percentage)
    .map(os => {
      const workshop = workshops.find(w => w.id === os.workshop_id);
      return {
        name: os.os_number,
        state: workshop?.state || "N/A",
        segment: segmentLabels[workshop?.segment] || "N/A",
        value: os.revenue_percentage
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 20);

  const rankingLucro = filteredWorkshops
    .map(w => ({
      name: w.name,
      state: w.state,
      segment: segmentLabels[w.segment] || w.segment,
      value: w.monthly_goals?.profit_percentage || 0
    }))
    .filter(w => w.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 50);

  // Atingimento de Metas
  const metasAtingidas = areaGoals.filter(g => g.status === 'atingida').length;
  const totalMetas = areaGoals.length;
  const metasPercentual = totalMetas > 0 ? (metasAtingidas / totalMetas) * 100 : 0;

  // Dados para gráfico de metas
  const metasPorArea = [
    { area: "Vendas", meta: 100000, realizado: 85000 },
    { area: "Comercial", meta: 50000, realizado: 48000 },
    { area: "Técnico", meta: 120000, realizado: totalTechProduction },
    { area: "Marketing", meta: 30000, realizado: 25000 }
  ].map(m => ({
    ...m,
    percentual: Math.round((m.realizado / m.meta) * 100)
  }));

  // Distribuição por segmento
  const segmentDistribution = Object.keys(segmentLabels).map(key => ({
    name: segmentLabels[key],
    value: workshops.filter(w => w.segment === key).length
  })).filter(s => s.value > 0);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

  // Cálculos de uso da plataforma
  const totalUsers = allUsers.length;
  const activeUsers = userProgress.filter(up => {
    const lastLogin = up.last_login_date ? new Date(up.last_login_date) : null;
    if (!lastLogin) return false;
    const daysSinceLastLogin = (new Date() - lastLogin) / (1000 * 60 * 60 * 24);
    return daysSinceLastLogin <= 30; // Ativo nos últimos 30 dias
  }).length;
  
  const usersWithDiagnostic = userProgress.filter(up => up.checklist_items?.fez_primeiro_diagnostico).length;
  const usersWithWorkshop = workshops.length;
  
  const platformUsagePercentage = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;
  const diagnosticUsagePercentage = totalUsers > 0 ? (usersWithDiagnostic / totalUsers) * 100 : 0;
  const workshopUsagePercentage = totalUsers > 0 ? (usersWithWorkshop / totalUsers) * 100 : 0;

  const showAsPercentage = totalUsers < 1000 || showUsageAsPercentage;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Wrench className="w-10 h-10 text-blue-600" />
            <div>
              <h1 className="text-4xl font-bold text-gray-900">
                Dashboard Nacional Oficinas Master
              </h1>
              <p className="text-gray-600 mt-1">
                Rankings, métricas e desempenho em tempo real
              </p>
            </div>
          </div>
          
          {/* Filtros */}
          <Card className="shadow-lg bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Filtros</h3>
              </div>
              <div className="flex flex-wrap gap-4">
                <Select value={stateFilter} onValueChange={setStateFilter}>
                  <SelectTrigger className="w-48 bg-white">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">🌎 Brasil</SelectItem>
                    {uniqueStates.map(state => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={segmentFilter} onValueChange={setSegmentFilter}>
                  <SelectTrigger className="w-64 bg-white">
                    <SelectValue placeholder="Segmento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">🏭 Todos Segmentos</SelectItem>
                    {Object.entries(segmentLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-gray-600 mt-3">
                <strong>Filtros aplicados:</strong> {stateFilter === 'all' ? 'Brasil' : stateFilter} | {segmentFilter === 'all' ? 'Todos' : segmentLabels[segmentFilter]}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Painel de Integrações */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <IntegrationStatusWidget />
          <IntegrationHealthScore />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <QuickIntegrationsPanel />
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Uso das Integrações</CardTitle>
            </CardHeader>
            <CardContent>
              <IntegrationMetricsChart />
            </CardContent>
          </Card>
        </div>

        {/* KPIs Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Faturamento Total"
            value={formatCurrency(totalRevenue / 1000) + 'k'}
            icon={DollarSign}
            color="green"
            subtitle={`${filteredWorkshops.length} oficinas`}
            trend="up"
            trendValue="+12%"
          />
          <MetricCard
            title="Ticket Médio"
            value={formatCurrency(avgTicket)}
            icon={TrendingUp}
            color="blue"
            subtitle="Média nacional"
            trend="up"
            trendValue="+8%"
          />
          <MetricCard
            title="Rentabilidade R70/I30"
            value={formatPercent(avgRentability)}
            icon={Percent}
            color="purple"
            subtitle={`${totalOS} OSs analisadas`}
          />
          <MetricCard
            title="Lucro Médio"
            value={formatPercent(avgProfit)}
            icon={Target}
            color="orange"
            subtitle="Margem líquida"
            trend="up"
            trendValue="+5%"
          />
        </div>

        {/* KPIs Secundários */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Faturamento/Técnico"
            value={formatCurrency(avgTechRevenue / 1000) + 'k'}
            icon={Wrench}
            color="cyan"
            subtitle={`${technicians.length} técnicos ativos`}
          />
          <MetricCard
            title="TCMP² Médio"
            value={formatCurrency(avgTCMP2)}
            icon={Calculator}
            color="blue"
            subtitle="Valor hora ideal"
          />
          <MetricCard
            title="Taxa Conversão"
            value={formatPercent(conversionRate)}
            icon={CheckCircle}
            color="green"
            subtitle={`${totalScheduled} agendados`}
          />
          <MetricCard
            title="Atingimento Metas"
            value={`${metasPercentual.toFixed(0)}%`}
            icon={Target}
            color="purple"
            subtitle={`${metasAtingidas}/${totalMetas} metas`}
          />
        </div>

        {/* Uso da Plataforma */}
        <Card className="shadow-lg mb-8 bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-6 h-6 text-indigo-600" />
                <CardTitle>Uso da Plataforma</CardTitle>
              </div>
              {totalUsers >= 1000 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUsageAsPercentage(!showUsageAsPercentage)}
                  className="bg-white"
                >
                  {showUsageAsPercentage ? '👥 Ver Usuários' : '📊 Ver %'}
                </Button>
              )}
            </div>
            <CardDescription>
              Métricas de engajamento e adoção da plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Usuários Ativos (30d)</span>
                  <Users className="w-4 h-4 text-indigo-600" />
                </div>
                <p className="text-3xl font-bold text-indigo-600">
                  {showAsPercentage ? `${platformUsagePercentage.toFixed(1)}%` : activeUsers}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {showAsPercentage ? `${activeUsers} de ${totalUsers} usuários` : `${platformUsagePercentage.toFixed(1)}% do total`}
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Fizeram Diagnóstico</span>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <p className="text-3xl font-bold text-green-600">
                  {showAsPercentage ? `${diagnosticUsagePercentage.toFixed(1)}%` : usersWithDiagnostic}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {showAsPercentage ? `${usersWithDiagnostic} usuários` : `${diagnosticUsagePercentage.toFixed(1)}% do total`}
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Oficinas Cadastradas</span>
                  <Wrench className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-3xl font-bold text-blue-600">
                  {showAsPercentage ? `${workshopUsagePercentage.toFixed(1)}%` : usersWithWorkshop}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {showAsPercentage ? `${usersWithWorkshop} oficinas` : `${workshopUsagePercentage.toFixed(1)}% do total`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Kit Master e Pneus */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="shadow-lg border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-orange-600" />
                Kit Master Médio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-orange-600">
                {formatCurrency(avgKitMaster)}
              </p>
              <p className="text-sm text-gray-600 mt-2">Por oficina/mês</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                Vendas Pneus
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">
                {formatCurrency(avgPneusSales)}
              </p>
              <p className="text-sm text-gray-600 mt-2">Média mensal</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="rankings" className="space-y-6">
          <TabsList className="bg-white shadow-md">
            <TabsTrigger value="rankings">🏆 Rankings Brasil</TabsTrigger>
            <TabsTrigger value="pessoas">👥 Rankings Pessoas</TabsTrigger>
            <TabsTrigger value="metas">🎯 Metas por Área</TabsTrigger>
            <TabsTrigger value="tempo">⚡ Tempo de Uso</TabsTrigger>
            <TabsTrigger value="segmentos">📊 Segmentos</TabsTrigger>
          </TabsList>

          {/* Rankings Brasil */}
          <TabsContent value="rankings" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-green-600" />
                    Top 50 - Faturamento
                  </CardTitle>
                  <CardDescription>
                    {stateFilter === 'all' ? 'Brasil' : stateFilter} | {segmentFilter === 'all' ? 'Todos' : segmentLabels[segmentFilter]}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RankingTable data={rankingFaturamento.slice(0, 10)} type="faturamento" />
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-blue-600" />
                    Top 50 - Ticket Médio
                  </CardTitle>
                  <CardDescription>
                    {stateFilter === 'all' ? 'Brasil' : stateFilter} | {segmentFilter === 'all' ? 'Todos' : segmentLabels[segmentFilter]}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RankingTable data={rankingTicket.slice(0, 10)} type="ticket" />
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Percent className="w-5 h-5 text-purple-600" />
                    Top 20 - Rentabilidade R70/I30
                  </CardTitle>
                  <CardDescription>Melhores rentabilidades</CardDescription>
                </CardHeader>
                <CardContent>
                  <RankingTable data={rankingRentabilidade.slice(0, 10)} type="percentage" />
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-orange-600" />
                    Top 50 - Lucro %
                  </CardTitle>
                  <CardDescription>Maior margem de lucro</CardDescription>
                </CardHeader>
                <CardContent>
                  <RankingTable data={rankingLucro.slice(0, 10)} type="percentage" />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Rankings Pessoas */}
          <TabsContent value="pessoas" className="space-y-6">
            <TechnicianRanking employees={employees} />
            <SalesRanking employees={employees} />
            <ManagerRanking employees={employees} />
          </TabsContent>

          {/* Metas */}
          <TabsContent value="metas" className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Atingimento de Metas por Área
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={metasPorArea}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="area" />
                    <YAxis />
                    <Tooltip formatter={(value) => `R$ ${value.toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="meta" fill="#cbd5e1" name="Meta" />
                    <Bar dataKey="realizado" fill="#3b82f6" name="Realizado" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {metasPorArea.map((area, index) => (
                <Card key={index} className="shadow-lg">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg">{area.area}</h3>
                        <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                          area.percentual >= 100 ? 'bg-green-100 text-green-700' :
                          area.percentual >= 80 ? 'bg-blue-100 text-blue-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {area.percentual}%
                        </div>
                      </div>
                      <div className="relative pt-1">
                        <div className="overflow-hidden h-4 text-xs flex rounded-full bg-gray-200">
                          <div
                            style={{ width: `${Math.min(area.percentual, 100)}%` }}
                            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600 transition-all duration-500"
                          />
                        </div>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Realizado:</span>
                        <span className="font-bold">R$ {(area.realizado / 1000).toFixed(0)}k</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Meta:</span>
                        <span className="font-bold">R$ ${(area.meta / 1000).toFixed(0)}k</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Tempo de Uso */}
          <TabsContent value="tempo">
            <UsageTimeCard userProfiles={userGameProfiles} workshopProfiles={gameProfiles} />
          </TabsContent>

          {/* Segmentos */}
          <TabsContent value="segmentos" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Distribuição por Segmento</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={segmentDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {segmentDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Oficinas por Segmento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {segmentDistribution.map((segment, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium">{segment.name}</span>
                        <span className="text-2xl font-bold" style={{ color: COLORS[index % COLORS.length] }}>
                          {segment.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}