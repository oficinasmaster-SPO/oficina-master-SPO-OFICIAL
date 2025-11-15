import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, DollarSign, TrendingUp, Percent, Target, Users, Award, BarChart3 } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

import MetricCard from "../components/dashboard/MetricCard";
import LevelBadge from "../components/dashboard/LevelBadge";
import BadgeCard from "../components/dashboard/BadgeCard";
import RankingTable from "../components/dashboard/RankingTable";
import AIInsight from "../components/dashboard/AIInsight";
import HRInsights from "../components/dashboard/HRInsights";
import TechnicianRanking from "../components/dashboard/TechnicianRanking";
import SalesRanking from "../components/dashboard/SalesRanking";
import ManagerRanking from "../components/dashboard/ManagerRanking";
import UsageTimeCard from "../components/dashboard/UsageTimeCard";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [stateFilter, setStateFilter] = useState("all");
  const [segmentFilter, setSegmentFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("month");

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
    queryFn: () => base44.entities.Workshop.list(),
    enabled: isAuthorized
  });

  const { data: osAssessments = [] } = useQuery({
    queryKey: ['os-assessments'],
    queryFn: () => base44.entities.ServiceOrderDiagnostic.list('-created_date'),
    enabled: isAuthorized
  });

  const { data: gameProfiles = [] } = useQuery({
    queryKey: ['game-profiles'],
    queryFn: () => base44.entities.WorkshopGameProfile.list(),
    enabled: isAuthorized
  });

  const { data: userGameProfiles = [] } = useQuery({
    queryKey: ['user-game-profiles'],
    queryFn: () => base44.entities.UserGameProfile.list(),
    enabled: isAuthorized
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    enabled: isAuthorized
  });

  if (!isAuthorized || loadingWorkshops) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Função para filtrar por período
  const filterByPeriod = (date) => {
    if (!date) return false;
    
    const now = new Date();
    const itemDate = new Date(date);
    
    switch (periodFilter) {
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return itemDate >= weekAgo;
      case 'month':
        return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
      case 'quarter':
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const itemQuarter = Math.floor(itemDate.getMonth() / 3);
        return itemQuarter === currentQuarter && itemDate.getFullYear() === now.getFullYear();
      case 'year':
        return itemDate.getFullYear() === now.getFullYear();
      default:
        return true;
    }
  };

  // Filtrar workshops por estado e segmento
  const filteredWorkshops = workshops.filter(w => {
    if (stateFilter !== "all" && w.state !== stateFilter) return false;
    if (segmentFilter !== "all" && w.segment !== segmentFilter) return false;
    return true;
  });

  // Filtrar OSs por período
  const filteredOSs = osAssessments.filter(os => filterByPeriod(os.created_date));

  // Filtrar funcionários por período de contratação
  const filteredEmployees = employees.filter(emp => {
    if (emp.hire_date && !filterByPeriod(emp.hire_date)) return false;
    return true;
  });

  // Estados e segmentos únicos
  const uniqueStates = [...new Set(workshops.map(w => w.state).filter(Boolean))].sort();
  
  const segmentLabels = {
    mecanica_leve: "Mecânica Leve",
    mecanica_pesada: "Truck Pesado",
    motos: "Oficina de Motos",
    centro_automotivo: "Centro Automotivo",
    premium: "Oficina Premium",
    outro: "Outro"
  };

  const periodLabels = {
    week: "Esta Semana",
    month: "Este Mês",
    quarter: "Este Trimestre",
    year: "Este Ano"
  };

  // KPIs principais com filtros aplicados
  const totalRevenue = filteredWorkshops.reduce((sum, w) => 
    sum + (w.monthly_goals?.revenue_parts || 0) + (w.monthly_goals?.revenue_services || 0), 0
  );

  const avgTicket = filteredWorkshops.length > 0
    ? filteredWorkshops.reduce((sum, w) => sum + (w.monthly_goals?.average_ticket || 0), 0) / filteredWorkshops.length
    : 0;

  const avgProfit = filteredWorkshops.length > 0
    ? filteredWorkshops.reduce((sum, w) => sum + (w.monthly_goals?.profit_percentage || 0), 0) / filteredWorkshops.length
    : 0;

  const totalOS = filteredOSs.length;
  const perfectOS = filteredOSs.filter(os => os.classification === 'perfeita').length;

  // Calcular faturamento por técnico (com período aplicado)
  const technicians = employees.filter(emp => emp.area === 'tecnico' && emp.status === 'ativo');
  const totalTechProduction = technicians.reduce((sum, tech) => 
    sum + (tech.production_parts || 0) + (tech.production_services || 0), 0
  );
  const avgTechRevenue = technicians.length > 0 ? totalTechProduction / technicians.length : 0;

  // Rankings com filtros aplicados
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

  const rankingRentabilidade = filteredOSs
    .filter(os => os.investment_percentage && os.revenue_percentage)
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

  // Metas por área
  const metasPorArea = [
    { area: "Vendas", meta: 100000, realizado: 85000, cor: "#3b82f6" },
    { area: "Comercial", meta: 50000, realizado: 48000, cor: "#10b981" },
    { area: "Marketing", meta: 30000, realizado: 22000, cor: "#f59e0b" },
    { area: "Técnico", meta: 120000, realizado: totalTechProduction, cor: "#8b5cf6" },
    { area: "Financeiro", meta: 200000, realizado: 180000, cor: "#ec4899" },
    { area: "Pessoas", meta: 80000, realizado: 75000, cor: "#06b6d4" }
  ].map(m => ({
    ...m,
    percentual: Math.round((m.realizado / m.meta) * 100),
    status: m.realizado >= m.meta ? "atingida" : m.realizado >= m.meta * 0.8 ? "em_progresso" : "em_alerta"
  }));

  // Insights IA
  const aiInsights = [
    {
      type: "positive",
      message: `${filteredWorkshops.length} oficinas ativas no período ${periodLabels[periodFilter].toLowerCase()}. Faturamento: R$ ${(totalRevenue / 1000).toFixed(0)}k.`
    },
    {
      type: "up",
      message: `${perfectOS} OSs com rentabilidade ideal (R70/I30) em ${totalOS} ordens analisadas.`
    },
    {
      type: "info",
      message: `Faturamento médio por técnico: R$ ${avgTechRevenue.toFixed(0)} no período.`
    }
  ];

  // Badges de exemplo
  const workshopBadges = [
    { badge_id: "1", name: "Top 10 Brasil", icon: "trophy", color: "gold", earned_date: new Date().toISOString() },
    { badge_id: "2", name: "R70/30 Master", icon: "award", color: "blue", earned_date: new Date().toISOString() },
    { badge_id: "3", name: "Alta Conversão", icon: "zap", color: "green", earned_date: new Date().toISOString() }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header com Filtros */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 mb-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Dashboard Oficinas Master 2.0
              </h1>
              <p className="text-gray-600">
                Rankings nacionais, métricas em tempo real e análise inteligente
              </p>
            </div>
            
            <Card className="shadow-lg bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">Filtros Ativos</h3>
                </div>
                <div className="flex flex-wrap gap-4">
                  <Select value={periodFilter} onValueChange={setPeriodFilter}>
                    <SelectTrigger className="w-48 bg-white">
                      <SelectValue placeholder="Período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">📅 Esta Semana</SelectItem>
                      <SelectItem value="month">📅 Este Mês</SelectItem>
                      <SelectItem value="quarter">📅 Este Trimestre</SelectItem>
                      <SelectItem value="year">📅 Este Ano</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={stateFilter} onValueChange={setStateFilter}>
                    <SelectTrigger className="w-48 bg-white">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">🌎 Todos os Estados</SelectItem>
                      {uniqueStates.map(state => (
                        <SelectItem key={state} value={state}>{state}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={segmentFilter} onValueChange={setSegmentFilter}>
                    <SelectTrigger className="w-48 bg-white">
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
                  <strong>Período:</strong> {periodLabels[periodFilter]} | 
                  <strong className="ml-2">Estado:</strong> {stateFilter === 'all' ? 'Todos' : stateFilter} | 
                  <strong className="ml-2">Segmento:</strong> {segmentFilter === 'all' ? 'Todos' : segmentLabels[segmentFilter]}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Nível e Conquistas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-1">
            <LevelBadge level={4} xp={7500} />
          </div>
          <div className="lg:col-span-2">
            <Card className="shadow-lg h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-500" />
                  Conquistas Desbloqueadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                  {workshopBadges.map((badge) => (
                    <BadgeCard key={badge.badge_id} badge={badge} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Faturamento Total"
            value={`R$ ${(totalRevenue / 1000).toFixed(0)}k`}
            icon={DollarSign}
            color="green"
            subtitle={periodLabels[periodFilter]}
            trend="up"
            trendValue="+12%"
            badges={["Top 10 BR"]}
          />
          <MetricCard
            title="Ticket Médio"
            value={`R$ ${avgTicket.toFixed(0)}`}
            icon={TrendingUp}
            color="blue"
            subtitle={`${filteredWorkshops.length} oficinas`}
            trend="up"
            trendValue="+8%"
          />
          <MetricCard
            title="Faturamento/Técnico"
            value={`R$ ${(avgTechRevenue / 1000).toFixed(1)}k`}
            icon={Users}
            color="cyan"
            subtitle={`${technicians.length} técnicos ativos`}
          />
          <MetricCard
            title="OSs Perfeitas"
            value={`${perfectOS}/${totalOS}`}
            icon={Award}
            color="orange"
            subtitle="R70/I30 ideal"
            badges={["R70/30 Master"]}
          />
        </div>

        {/* Insights IA */}
        <div className="mb-8">
          <AIInsight insights={aiInsights} />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="rankings" className="space-y-6">
          <TabsList className="bg-white shadow-md">
            <TabsTrigger value="rankings">🏆 Rankings Empresas</TabsTrigger>
            <TabsTrigger value="people">👥 Rankings Pessoas</TabsTrigger>
            <TabsTrigger value="metas">🎯 Metas por Área</TabsTrigger>
            <TabsTrigger value="evolucao">📈 Evolução</TabsTrigger>
            <TabsTrigger value="engajamento">⚡ Tempo de Uso</TabsTrigger>
            <TabsTrigger value="rh">💼 Insights RH</TabsTrigger>
          </TabsList>

          {/* Rankings Empresas */}
          <TabsContent value="rankings" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-green-600" />
                    Top 50 - Faturamento
                  </CardTitle>
                  <CardDescription>
                    {periodLabels[periodFilter]} | {stateFilter === 'all' ? 'Brasil' : stateFilter} | {segmentFilter === 'all' ? 'Todos' : segmentLabels[segmentFilter]}
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
                    {periodLabels[periodFilter]} | {stateFilter === 'all' ? 'Brasil' : stateFilter} | {segmentFilter === 'all' ? 'Todos' : segmentLabels[segmentFilter]}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RankingTable data={rankingTicket.slice(0, 10)} type="ticket" />
                </CardContent>
              </Card>

              <Card className="shadow-lg lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Percent className="w-5 h-5 text-purple-600" />
                    Top 20 - Rentabilidade (R70/I30)
                  </CardTitle>
                  <CardDescription>
                    {periodLabels[periodFilter]} - Melhores rentabilidades por OS
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RankingTable data={rankingRentabilidade} type="percentage" />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Rankings Pessoas */}
          <TabsContent value="people" className="space-y-6">
            <TechnicianRanking employees={employees} />
            <SalesRanking employees={employees} />
            <ManagerRanking employees={employees} />
          </TabsContent>

          {/* Metas por Área */}
          <TabsContent value="metas" className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Acompanhamento de Metas - {periodLabels[periodFilter]}
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {metasPorArea.map((area, index) => (
                <Card key={index} className="shadow-lg">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg">{area.area}</h3>
                        <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                          area.status === 'atingida' ? 'bg-green-100 text-green-700' :
                          area.status === 'em_progresso' ? 'bg-blue-100 text-blue-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {area.percentual}%
                        </div>
                      </div>
                      <div className="relative pt-1">
                        <div className="overflow-hidden h-4 text-xs flex rounded-full bg-gray-200">
                          <div
                            style={{ width: `${Math.min(area.percentual, 100)}%`, backgroundColor: area.cor }}
                            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500"
                          />
                        </div>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Realizado:</span>
                        <span className="font-bold">R$ {(area.realizado / 1000).toFixed(0)}k</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Meta:</span>
                        <span className="font-bold">R$ {(area.meta / 1000).toFixed(0)}k</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Evolução */}
          <TabsContent value="evolucao" className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Evolução de Indicadores - 12 Meses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={[
                    { mes: "Jan", faturamento: 80000, lucro: 15 },
                    { mes: "Fev", faturamento: 85000, lucro: 16 },
                    { mes: "Mar", faturamento: 90000, lucro: 18 },
                    { mes: "Abr", faturamento: 95000, lucro: 17 },
                    { mes: "Mai", faturamento: 100000, lucro: 19 },
                    { mes: "Jun", faturamento: 105000, lucro: 20 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="faturamento" stroke="#3b82f6" strokeWidth={2} name="Faturamento (R$)" />
                    <Line type="monotone" dataKey="lucro" stroke="#10b981" strokeWidth={2} name="Lucro (%)" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tempo de Uso */}
          <TabsContent value="engajamento" className="space-y-6">
            <UsageTimeCard userProfiles={userGameProfiles} workshopProfiles={gameProfiles} />
          </TabsContent>

          {/* Insights RH */}
          <TabsContent value="rh" className="space-y-6">
            <HRInsights employees={employees} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}