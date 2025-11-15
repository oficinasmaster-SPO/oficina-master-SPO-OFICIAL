import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, BarChart3, PieChart as PieChartIcon, TrendingUp, Users, Building, Award, Clock, CheckCircle2, Target, DollarSign, TrendingDown, Percent } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, Area, AreaChart, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [periodFilter, setPeriodFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [segmentFilter, setSegmentFilter] = useState("all");

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

  const { data: diagnostics = [], isLoading: loadingDiagnostics } = useQuery({
    queryKey: ['diagnostics'],
    queryFn: () => base44.entities.Diagnostic.list('-created_date'),
    enabled: isAuthorized
  });

  const { data: workshops = [], isLoading: loadingWorkshops } = useQuery({
    queryKey: ['workshops'],
    queryFn: () => base44.entities.Workshop.list(),
    enabled: isAuthorized
  });

  const { data: actionPlans = [], isLoading: loadingPlans } = useQuery({
    queryKey: ['actionPlans'],
    queryFn: () => base44.entities.ActionPlan.list(),
    enabled: isAuthorized
  });

  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    enabled: isAuthorized
  });

  const { data: processAssessments = [] } = useQuery({
    queryKey: ['assessments'],
    queryFn: () => base44.entities.ProcessAssessment.list('-created_date'),
    enabled: isAuthorized
  });

  const { data: osAssessments = [] } = useQuery({
    queryKey: ['os-assessments'],
    queryFn: () => base44.entities.ServiceOrderDiagnostic.list('-created_date'),
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

  // Aplicar filtros
  const filterData = () => {
    let filtered = [...workshops];
    
    if (stateFilter !== "all") {
      filtered = filtered.filter(w => w.state === stateFilter);
    }
    
    if (segmentFilter !== "all") {
      filtered = filtered.filter(w => w.segment === segmentFilter);
    }
    
    return filtered;
  };

  const filteredWorkshops = filterData();
  const workshopIds = new Set(filteredWorkshops.map(w => w.id));
  const filteredDiagnostics = diagnostics.filter(d => !d.workshop_id || workshopIds.has(d.workshop_id));

  // Estados únicos
  const uniqueStates = [...new Set(workshops.map(w => w.state).filter(Boolean))].sort();
  
  // Segmentos
  const segmentLabels = {
    mecanica_leve: "Mecânica Leve",
    mecanica_pesada: "Mecânica Pesada",
    motos: "Motos",
    centro_automotivo: "Centro Automotivo",
    premium: "Premium",
    outro: "Outro"
  };

  // ====== RANKINGS NÍVEL BRASIL ======
  
  // Ranking de Faturamento
  const rankingFaturamento = filteredWorkshops
    .map(w => ({
      name: w.name,
      state: w.state,
      segment: w.segment,
      revenue: (w.monthly_goals?.revenue_parts || 0) + (w.monthly_goals?.revenue_services || 0),
      revenueServices: w.monthly_goals?.revenue_services || 0,
      revenueParts: w.monthly_goals?.revenue_parts || 0
    }))
    .filter(w => w.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Ranking de Ticket Médio
  const rankingTicketMedio = filteredWorkshops
    .map(w => ({
      name: w.name,
      state: w.state,
      segment: w.segment,
      ticketMedio: w.monthly_goals?.average_ticket || 0
    }))
    .filter(w => w.ticketMedio > 0)
    .sort((a, b) => b.ticketMedio - a.ticketMedio)
    .slice(0, 10);

  // Ranking R70/I30 (com base nos diagnósticos de OS)
  const rankingR70I30 = osAssessments
    .map(os => {
      const workshop = workshops.find(w => w.id === os.workshop_id);
      return {
        name: workshop?.name || "Desconhecido",
        state: workshop?.state,
        segment: workshop?.segment,
        revenuePercentage: os.revenue_percentage || 0,
        investmentPercentage: os.investment_percentage || 0,
        classification: os.classification
      };
    })
    .filter(r => r.revenuePercentage > 0)
    .sort((a, b) => b.revenuePercentage - a.revenuePercentage)
    .slice(0, 10);

  // Ranking TCMP²
  const rankingTCMP2 = osAssessments
    .map(os => {
      const workshop = workshops.find(w => w.id === os.workshop_id);
      const efficiency = os.current_hour_value && os.ideal_hour_value 
        ? (os.current_hour_value / os.ideal_hour_value) * 100 
        : 0;
      return {
        name: workshop?.name || "Desconhecido",
        state: workshop?.state,
        segment: workshop?.segment,
        currentHourValue: os.current_hour_value || 0,
        idealHourValue: os.ideal_hour_value || 0,
        efficiency
      };
    })
    .filter(r => r.efficiency > 0)
    .sort((a, b) => b.efficiency - a.efficiency)
    .slice(0, 10);

  // Ranking de Lucro %
  const rankingLucro = filteredWorkshops
    .map(w => ({
      name: w.name,
      state: w.state,
      segment: w.segment,
      profitPercentage: w.monthly_goals?.profit_percentage || 0
    }))
    .filter(w => w.profitPercentage > 0)
    .sort((a, b) => b.profitPercentage - a.profitPercentage)
    .slice(0, 10);

  // ====== METAS POR ÁREA ======
  
  const metasPorArea = [
    {
      area: "Vendas",
      meta: 100000,
      realizado: 85000,
      percentual: 85,
      cor: "#3b82f6"
    },
    {
      area: "Comercial",
      meta: 50000,
      realizado: 48000,
      percentual: 96,
      cor: "#10b981"
    },
    {
      area: "Marketing",
      meta: 30000,
      realizado: 22000,
      percentual: 73,
      cor: "#f59e0b"
    },
    {
      area: "Financeiro",
      meta: 200000,
      realizado: 180000,
      percentual: 90,
      cor: "#8b5cf6"
    }
  ];

  // ====== EVOLUÇÃO CRONOLÓGICA ======
  
  const last12Months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (11 - i));
    return date;
  });

  const evolucaoCronologica = last12Months.map(date => {
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    const monthDiagnostics = diagnostics.filter(d => {
      const diagDate = new Date(d.created_date);
      return diagDate >= monthStart && diagDate <= monthEnd;
    });

    const monthAssessments = processAssessments.filter(a => {
      const assessDate = new Date(a.created_date);
      return assessDate >= monthStart && assessDate <= monthEnd;
    });

    return {
      mes: date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      diagnosticos: monthDiagnostics.length,
      avaliacoes: monthAssessments.length,
      fase1: monthDiagnostics.filter(d => d.phase === 1).length,
      fase2: monthDiagnostics.filter(d => d.phase === 2).length,
      fase3: monthDiagnostics.filter(d => d.phase === 3).length,
      fase4: monthDiagnostics.filter(d => d.phase === 4).length
    };
  });

  // Média de scores das avaliações por mês
  const evolucaoScores = last12Months.map(date => {
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    const monthAssessments = processAssessments.filter(a => {
      const assessDate = new Date(a.created_date);
      return assessDate >= monthStart && assessDate <= monthEnd;
    });

    const vendas = monthAssessments.filter(a => a.assessment_type === 'vendas');
    const comercial = monthAssessments.filter(a => a.assessment_type === 'comercial');
    const marketing = monthAssessments.filter(a => a.assessment_type === 'marketing');

    return {
      mes: date.toLocaleDateString('pt-BR', { month: 'short' }),
      vendas: vendas.length > 0 ? (vendas.reduce((sum, a) => sum + a.average_score, 0) / vendas.length) : 0,
      comercial: comercial.length > 0 ? (comercial.reduce((sum, a) => sum + a.average_score, 0) / comercial.length) : 0,
      marketing: marketing.length > 0 ? (marketing.reduce((sum, a) => sum + a.average_score, 0) / marketing.length) : 0
    };
  });

  // Distribuição de faturamento por segmento
  const faturamentoPorSegmento = Object.entries(segmentLabels).map(([key, label]) => {
    const segmentWorkshops = filteredWorkshops.filter(w => w.segment === key);
    const totalRevenue = segmentWorkshops.reduce((sum, w) => 
      sum + (w.monthly_goals?.revenue_parts || 0) + (w.monthly_goals?.revenue_services || 0), 0
    );
    return {
      name: label,
      value: totalRevenue,
      count: segmentWorkshops.length
    };
  }).filter(s => s.value > 0);

  // KPIs principais
  const totalDiagnostics = filteredDiagnostics.length;
  const totalRevenue = filteredWorkshops.reduce((sum, w) => 
    sum + (w.monthly_goals?.revenue_parts || 0) + (w.monthly_goals?.revenue_services || 0), 0
  );
  const avgTicket = filteredWorkshops.length > 0
    ? filteredWorkshops.reduce((sum, w) => sum + (w.monthly_goals?.average_ticket || 0), 0) / filteredWorkshops.length
    : 0;
  const avgProfit = filteredWorkshops.length > 0
    ? filteredWorkshops.reduce((sum, w) => sum + (w.monthly_goals?.profit_percentage || 0), 0) / filteredWorkshops.length
    : 0;

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
        {/* Header com Filtros */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Dashboard Oficinas Master
              </h1>
              <p className="text-gray-600">
                Rankings nacionais, metas e evolução de indicadores
              </p>
            </div>
            
            <div className="flex flex-wrap gap-4">
              <div className="w-full md:w-48">
                <Select value={stateFilter} onValueChange={setStateFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Estados</SelectItem>
                    {uniqueStates.map(state => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full md:w-48">
                <Select value={segmentFilter} onValueChange={setSegmentFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Segmento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Segmentos</SelectItem>
                    {Object.entries(segmentLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Faturamento Total</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    R$ {(totalRevenue / 1000).toFixed(0)}k
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ticket Médio</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    R$ {avgTicket.toFixed(0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Lucro Médio</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {avgProfit.toFixed(1)}%
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Percent className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Oficinas Ativas</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{filteredWorkshops.length}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <Building className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="rankings" className="space-y-6">
          <TabsList className="bg-white shadow-md">
            <TabsTrigger value="rankings">Rankings Brasil</TabsTrigger>
            <TabsTrigger value="metas">Metas por Área</TabsTrigger>
            <TabsTrigger value="evolucao">Evolução Temporal</TabsTrigger>
            <TabsTrigger value="segmentos">Segmentos</TabsTrigger>
          </TabsList>

          {/* Rankings Brasil */}
          <TabsContent value="rankings" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Ranking Faturamento */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-green-600" />
                    Top 10 - Faturamento
                  </CardTitle>
                  <CardDescription>Maiores faturamentos mensais</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {rankingFaturamento.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            index === 0 ? 'bg-yellow-100 text-yellow-700' :
                            index === 1 ? 'bg-gray-200 text-gray-700' :
                            index === 2 ? 'bg-orange-100 text-orange-700' :
                            'bg-blue-50 text-blue-700'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{item.name}</p>
                            <p className="text-xs text-gray-500">{item.state} • {segmentLabels[item.segment]}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">R$ {(item.revenue / 1000).toFixed(0)}k</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Ranking Ticket Médio */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-blue-600" />
                    Top 10 - Ticket Médio
                  </CardTitle>
                  <CardDescription>Maiores tickets médios</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {rankingTicketMedio.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            index === 0 ? 'bg-yellow-100 text-yellow-700' :
                            index === 1 ? 'bg-gray-200 text-gray-700' :
                            index === 2 ? 'bg-orange-100 text-orange-700' :
                            'bg-blue-50 text-blue-700'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{item.name}</p>
                            <p className="text-xs text-gray-500">{item.state} • {segmentLabels[item.segment]}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-blue-600">R$ {item.ticketMedio.toFixed(0)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Ranking R70/I30 */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-purple-600" />
                    Top 10 - R70/I30
                  </CardTitle>
                  <CardDescription>Melhor rentabilidade R70/I30</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {rankingR70I30.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            index === 0 ? 'bg-yellow-100 text-yellow-700' :
                            index === 1 ? 'bg-gray-200 text-gray-700' :
                            index === 2 ? 'bg-orange-100 text-orange-700' :
                            'bg-blue-50 text-blue-700'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{item.name}</p>
                            <p className="text-xs text-gray-500">R: {item.revenuePercentage.toFixed(0)}% • I: {item.investmentPercentage.toFixed(0)}%</p>
                          </div>
                        </div>
                        <Badge className={
                          item.classification === 'perfeita' ? 'bg-green-500' :
                          item.classification === 'aprovada' ? 'bg-blue-500' : 'bg-yellow-500'
                        }>
                          {item.classification}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Ranking TCMP² */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-orange-600" />
                    Top 10 - TCMP²
                  </CardTitle>
                  <CardDescription>Melhor eficiência TCMP²</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {rankingTCMP2.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            index === 0 ? 'bg-yellow-100 text-yellow-700' :
                            index === 1 ? 'bg-gray-200 text-gray-700' :
                            index === 2 ? 'bg-orange-100 text-orange-700' :
                            'bg-blue-50 text-blue-700'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{item.name}</p>
                            <p className="text-xs text-gray-500">Atual: R$ {item.currentHourValue.toFixed(0)}/h</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-orange-600">{item.efficiency.toFixed(0)}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
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
                  Acompanhamento de Metas por Área
                </CardTitle>
                <CardDescription>Realizado vs Meta mensal</CardDescription>
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
                      <div>
                        <h3 className="font-semibold text-lg">{area.area}</h3>
                        <p className="text-sm text-gray-500">Desempenho mensal</p>
                      </div>
                      <div className="relative pt-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-gray-700">
                            {area.percentual}% da meta
                          </span>
                        </div>
                        <div className="overflow-hidden h-3 text-xs flex rounded-full bg-gray-200">
                          <div
                            style={{ width: `${area.percentual}%`, backgroundColor: area.cor }}
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

          {/* Evolução Temporal */}
          <TabsContent value="evolucao" className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Evolução de Diagnósticos - 12 Meses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={evolucaoCronologica}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="diagnosticos" stackId="1" stroke="#3b82f6" fill="#3b82f6" name="Diagnósticos" />
                    <Area type="monotone" dataKey="avaliacoes" stackId="1" stroke="#10b981" fill="#10b981" name="Avaliações" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Evolução por Fase - 12 Meses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={evolucaoCronologica}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="fase1" stroke="#ef4444" strokeWidth={2} name="Fase 1" />
                    <Line type="monotone" dataKey="fase2" stroke="#f59e0b" strokeWidth={2} name="Fase 2" />
                    <Line type="monotone" dataKey="fase3" stroke="#3b82f6" strokeWidth={2} name="Fase 3" />
                    <Line type="monotone" dataKey="fase4" stroke="#10b981" strokeWidth={2} name="Fase 4" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Evolução de Scores Médios por Área
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={evolucaoScores}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis domain={[0, 10]} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="vendas" stroke="#3b82f6" strokeWidth={2} name="Vendas" />
                    <Line type="monotone" dataKey="comercial" stroke="#10b981" strokeWidth={2} name="Comercial" />
                    <Line type="monotone" dataKey="marketing" stroke="#f59e0b" strokeWidth={2} name="Marketing" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Segmentos */}
          <TabsContent value="segmentos" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChartIcon className="w-5 h-5" />
                    Faturamento por Segmento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={faturamentoPorSegmento}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {faturamentoPorSegmento.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'][index % 6]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `R$ ${value.toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Detalhamento por Segmento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {faturamentoPorSegmento.map((seg, index) => (
                      <div key={index} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold">{seg.name}</span>
                          <Badge>{seg.count} oficinas</Badge>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Faturamento:</span>
                          <span className="font-bold text-green-600">R$ {(seg.value / 1000).toFixed(0)}k</span>
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                          <span className="text-gray-600">Média por oficina:</span>
                          <span className="font-medium">R$ {(seg.value / seg.count / 1000).toFixed(0)}k</span>
                        </div>
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