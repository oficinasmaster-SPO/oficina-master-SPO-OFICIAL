import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, DollarSign, TrendingUp, Percent, Building, Target, Users, Award, Zap, BarChart3 } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

import MetricCard from "../components/dashboard/MetricCard";
import LevelBadge from "../components/dashboard/LevelBadge";
import BadgeCard from "../components/dashboard/BadgeCard";
import RankingTable from "../components/dashboard/RankingTable";
import AIInsight from "../components/dashboard/AIInsight";

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

  const { data: areaGoals = [] } = useQuery({
    queryKey: ['area-goals'],
    queryFn: () => base44.entities.AreaGoal.list(),
    enabled: isAuthorized
  });

  if (!isAuthorized || loadingWorkshops) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Filtrar workshops
  const filteredWorkshops = workshops.filter(w => {
    if (stateFilter !== "all" && w.state !== stateFilter) return false;
    if (segmentFilter !== "all" && w.segment !== segmentFilter) return false;
    return true;
  });

  // Estados e segmentos únicos
  const uniqueStates = [...new Set(workshops.map(w => w.state).filter(Boolean))].sort();
  
  const segmentLabels = {
    motos: "Oficina de Motos",
    centro_automotivo: "Centro Automotivo",
    mecanica_leve: "Mecânica Leve",
    mecanica_pesada: "Truck Pesado",
    premium: "Oficina Premium",
    funilaria: "Funilaria e Pintura"
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

  // Metas por área
  const metasPorArea = [
    { area: "Vendas", meta: 100000, realizado: 85000, cor: "#3b82f6" },
    { area: "Comercial", meta: 50000, realizado: 48000, cor: "#10b981" },
    { area: "Marketing", meta: 30000, realizado: 22000, cor: "#f59e0b" },
    { area: "Técnico", meta: 120000, realizado: 110000, cor: "#8b5cf6" },
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
      message: `O faturamento total está em R$ ${(totalRevenue / 1000).toFixed(0)}k, acima da média nacional do setor.`
    },
    {
      type: "up",
      message: `${perfectOS} OSs com rentabilidade perfeita (R70/I30) foram registradas este mês.`
    },
    {
      type: "down",
      message: "A área de Marketing está 27% abaixo da meta. Sugerimos intensificar campanhas."
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
                Rankings nacionais, gamificação e análise inteligente
              </p>
            </div>
            
            <div className="flex flex-wrap gap-4">
              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger className="w-48">
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
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Segmento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">🏭 Todos Segmentos</SelectItem>
                  {Object.entries(segmentLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">📅 Semana</SelectItem>
                  <SelectItem value="month">📅 Mês</SelectItem>
                  <SelectItem value="quarter">📅 Trimestre</SelectItem>
                  <SelectItem value="year">📅 Ano</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
            trend="up"
            trendValue="+12%"
            badges={["Top 10 BR"]}
          />
          <MetricCard
            title="Ticket Médio"
            value={`R$ ${avgTicket.toFixed(0)}`}
            icon={TrendingUp}
            color="blue"
            trend="up"
            trendValue="+8%"
          />
          <MetricCard
            title="Lucro Médio"
            value={`${avgProfit.toFixed(1)}%`}
            icon={Percent}
            color="purple"
            trend="down"
            trendValue="-2%"
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
            <TabsTrigger value="rankings">🏆 Rankings Brasil</TabsTrigger>
            <TabsTrigger value="metas">🎯 Metas por Área</TabsTrigger>
            <TabsTrigger value="operacional">⚙️ Sub-Rankings</TabsTrigger>
            <TabsTrigger value="evolucao">📈 Evolução</TabsTrigger>
            <TabsTrigger value="engajamento">⚡ Engajamento</TabsTrigger>
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
                  <CardDescription>Maiores faturamentos do Brasil</CardDescription>
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
                  <CardDescription>Maiores tickets médios</CardDescription>
                </CardHeader>
                <CardContent>
                  <RankingTable data={rankingTicket.slice(0, 10)} type="ticket" />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Metas por Área */}
          <TabsContent value="metas" className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Acompanhamento de Metas - {periodFilter === 'month' ? 'Mês Atual' : 'Período'}
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

          {/* Sub-Rankings Operacionais */}
          <TabsContent value="operacional" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>🛒 Ranking Vendas</CardTitle>
                  <CardDescription>Top consultores de vendas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center font-bold">1</div>
                        <div>
                          <p className="font-medium">João Silva</p>
                          <p className="text-xs text-gray-600">Ticket: R$ 850</p>
                        </div>
                      </div>
                      <span className="font-bold text-green-600">+25%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>🔧 Ranking Técnicos</CardTitle>
                  <CardDescription>Top técnicos por produtividade</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold">1</div>
                        <div>
                          <p className="font-medium">Carlos Souza</p>
                          <p className="text-xs text-gray-600">Produção: R$ 15k</p>
                        </div>
                      </div>
                      <span className="font-bold text-green-600">120%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
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

          {/* Engajamento */}
          <TabsContent value="engajamento" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Uso da Plataforma</p>
                      <p className="text-3xl font-bold">45h</p>
                    </div>
                    <Zap className="w-12 h-12 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Equipe Ativa</p>
                      <p className="text-3xl font-bold">85%</p>
                    </div>
                    <Users className="w-12 h-12 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Diagnósticos</p>
                      <p className="text-3xl font-bold">12</p>
                    </div>
                    <Target className="w-12 h-12 text-purple-500" />
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