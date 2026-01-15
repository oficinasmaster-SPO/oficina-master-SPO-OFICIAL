import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ArrowLeft, TrendingUp, DollarSign, Users, Target, ShoppingCart, Calendar } from "lucide-react";
import { formatCurrency } from "@/components/utils/formatters";

export default function GraficosProducao() {
  const navigate = useNavigate();
  const [workshop, setWorkshop] = useState(null);
  const [user, setUser] = useState(null);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().substring(0, 7));

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        const workshops = await base44.entities.Workshop.filter({ owner_id: currentUser.id });
        if (workshops.length > 0) {
          setWorkshop(workshops[0]);
        }
      } catch (error) {
        console.error("Error loading workshop:", error);
      }
    };
    loadData();
  }, []);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['goal-history-graficos', workshop?.id, filterMonth],
    queryFn: async () => {
      if (!workshop) return [];
      
      // Força reload do workshop para pegar melhor mês atualizado
      const updatedWorkshop = await base44.entities.Workshop.get(workshop.id);
      setWorkshop(updatedWorkshop);
      
      const query = { 
        workshop_id: workshop.id,
        month: filterMonth
      };
      const result = await base44.entities.MonthlyGoalHistory.filter(query);
      return result.sort((a, b) => new Date(a.reference_date) - new Date(b.reference_date));
    },
    enabled: !!workshop,
    refetchOnWindowFocus: true,
    staleTime: 0
  });

  const chartData = records.map((record) => ({
    date: new Date(record.reference_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    // Faturamento
    faturamento_total: (record.revenue_parts || 0) + (record.revenue_services || 0),
    faturamento_pecas: record.revenue_parts || 0,
    faturamento_servicos: record.revenue_services || 0,
    projected_revenue: record.projected_total || 0,
    // Clientes
    clientes: record.customer_volume || 0,
    projected_clientes: record.projected_customer_volume || 0,
    // PAVE
    pave_realizado: record.pave_commercial || 0,
    pave_previsto: record.projected_pave_commercial || 0,
    // Kit Master
    kit_master_realizado: record.kit_master || 0,
    kit_master_previsto: record.projected_kit_master || 0,
    // GPS
    gps_realizado: record.gps_vendas || 0,
    gps_previsto: record.projected_gps_vendas || 0,
    // Agendamentos e Entregas
    agendados_base: record.clients_scheduled_base || 0,
    entregues_base: record.clients_delivered_base || 0,
    vendas_base: record.sales_base || 0,
    projected_sales_base: record.projected_sales_base || 0,
    agendados_mkt: record.clients_scheduled_mkt || 0,
    entregues_mkt: record.clients_delivered_mkt || 0,
    vendas_mkt: record.sales_marketing || 0,
    projected_sales_mkt: record.projected_sales_marketing || 0,
    agendados_referral: record.clients_scheduled_referral || 0,
    entregues_referral: record.clients_delivered_referral || 0,
    // Marketing
    leads_gerados: record.marketing_data?.leads_generated || 0,
    leads_agendados: record.marketing_data?.leads_scheduled || 0,
    leads_comparecidos: record.marketing_data?.leads_showed_up || 0,
    leads_vendidos: record.marketing_data?.leads_sold || 0,
    investido_trafego: record.marketing_data?.invested_value || 0,
    faturado_lead: record.marketing_data?.revenue_from_traffic || 0,
    custo_venda_realizado: record.marketing_data?.cost_per_sale || 0,
    custo_venda_previsto: record.marketing_data?.projected_cost_per_sale || 0,
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800/95 backdrop-blur-sm p-3 border border-blue-500/30 rounded-lg shadow-lg shadow-blue-500/20">
          <p className="font-semibold text-blue-300 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm font-medium">
              {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString("pt-BR") : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (!workshop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-blue-300">Carregando oficina...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => navigate(-1)}
              className="border-blue-500/30 bg-slate-800/50 hover:bg-slate-700/50 text-blue-300 hover:text-blue-200"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 flex items-center gap-2">
                <TrendingUp className="w-8 h-8 text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                Gráficos de Evolução
              </h1>
              <p className="text-blue-300/70 mt-1">Análise visual do desempenho da oficina</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div>
              <Label className="text-xs text-blue-300/70 mb-1 block">Filtrar Mês</Label>
              <Input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="w-40 bg-slate-800/50 border-blue-500/30 text-blue-200 focus:border-blue-400"
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <Card className="bg-slate-800/50 border-blue-500/30">
            <CardContent className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
              <p className="text-blue-300/70">Carregando dados...</p>
            </CardContent>
          </Card>
        ) : chartData.length === 0 ? (
          <Card className="bg-slate-800/50 border-blue-500/30">
            <CardContent className="p-12 text-center">
              <Calendar className="w-16 h-16 text-blue-400/50 mx-auto mb-4" />
              <p className="text-blue-300/70">Nenhum registro encontrado para este período</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="faturamento" className="w-full">
            <TabsList className="grid grid-cols-5 w-full bg-slate-800/50 border border-blue-500/30">
              <TabsTrigger value="faturamento" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white text-blue-300/70">Faturamento</TabsTrigger>
              <TabsTrigger value="comercial" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white text-blue-300/70">Comercial</TabsTrigger>
              <TabsTrigger value="vendas" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white text-blue-300/70">Vendas</TabsTrigger>
              <TabsTrigger value="agendamentos" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white text-blue-300/70">Agendamentos</TabsTrigger>
              <TabsTrigger value="marketing" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white text-blue-300/70">Marketing</TabsTrigger>
            </TabsList>

            {/* ABA FATURAMENTO */}
            <TabsContent value="faturamento" className="space-y-6">
              <Card className="bg-slate-800/50 border-blue-500/30 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">
                    <DollarSign className="w-5 h-5 text-green-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                    Evolução do Faturamento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={chartData}>
                      <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="colorPecas" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e40af" opacity={0.1} />
                      <XAxis dataKey="date" stroke="#60a5fa" style={{ fontSize: '12px' }} />
                      <YAxis stroke="#60a5fa" style={{ fontSize: '12px' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ color: '#60a5fa' }} />
                      <Line type="monotone" dataKey="faturamento_total" stroke="#10b981" strokeWidth={3} name="Fat. Total" dot={{ fill: '#10b981', r: 4 }} activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} />
                      <Line type="monotone" dataKey="faturamento_pecas" stroke="#3b82f6" strokeWidth={2} name="Fat. Peças" dot={{ fill: '#3b82f6', r: 3 }} />
                      <Line type="monotone" dataKey="faturamento_servicos" stroke="#a855f7" strokeWidth={2} name="Fat. Serviços" dot={{ fill: '#a855f7', r: 3 }} />
                      <Line type="monotone" dataKey="projected_revenue" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" name="Previsto" dot={{ fill: '#f59e0b', r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-blue-500/30 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                    <Users className="w-5 h-5 text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                    Evolução de Clientes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e40af" opacity={0.1} />
                      <XAxis dataKey="date" stroke="#60a5fa" style={{ fontSize: '12px' }} />
                      <YAxis stroke="#60a5fa" style={{ fontSize: '12px' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ color: '#60a5fa' }} />
                      <Line type="monotone" dataKey="clientes" stroke="#10b981" strokeWidth={3} name="Clientes Realizado" dot={{ fill: '#10b981', r: 4 }} activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} />
                      <Line type="monotone" dataKey="projected_clientes" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" name="Clientes Previsto" dot={{ fill: '#f59e0b', r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ABA COMERCIAL */}
            <TabsContent value="comercial" className="space-y-6">
              <Card className="bg-slate-800/50 border-purple-500/30 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                    <Target className="w-5 h-5 text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                    PAVE Comercial
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e40af" opacity={0.1} />
                      <XAxis dataKey="date" stroke="#60a5fa" style={{ fontSize: '12px' }} />
                      <YAxis stroke="#60a5fa" style={{ fontSize: '12px' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ color: '#60a5fa' }} />
                      <Line type="monotone" dataKey="pave_realizado" stroke="#a855f7" strokeWidth={3} name="PAVE Realizado" dot={{ fill: '#a855f7', r: 4 }} activeDot={{ r: 6, fill: '#a855f7', stroke: '#fff', strokeWidth: 2 }} />
                      <Line type="monotone" dataKey="pave_previsto" stroke="#ec4899" strokeWidth={2} strokeDasharray="5 5" name="PAVE Previsto" dot={{ fill: '#ec4899', r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-yellow-500/30 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400">
                    <ShoppingCart className="w-5 h-5 text-yellow-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
                    Kit Master
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e40af" opacity={0.1} />
                      <XAxis dataKey="date" stroke="#60a5fa" style={{ fontSize: '12px' }} />
                      <YAxis stroke="#60a5fa" style={{ fontSize: '12px' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ color: '#60a5fa' }} />
                      <Line type="monotone" dataKey="kit_master_realizado" stroke="#fbbf24" strokeWidth={3} name="Kit Master Realizado" dot={{ fill: '#fbbf24', r: 4 }} activeDot={{ r: 6, fill: '#fbbf24', stroke: '#fff', strokeWidth: 2 }} />
                      <Line type="monotone" dataKey="kit_master_previsto" stroke="#f97316" strokeWidth={2} strokeDasharray="5 5" name="Kit Master Previsto" dot={{ fill: '#f97316', r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ABA VENDAS */}
            <TabsContent value="vendas" className="space-y-6">
              <Card className="bg-slate-800/50 border-cyan-500/30 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                    <Target className="w-5 h-5 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                    GPS de Vendas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e40af" opacity={0.1} />
                      <XAxis dataKey="date" stroke="#60a5fa" style={{ fontSize: '12px' }} />
                      <YAxis stroke="#60a5fa" style={{ fontSize: '12px' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ color: '#60a5fa' }} />
                      <Line type="monotone" dataKey="gps_realizado" stroke="#22d3ee" strokeWidth={3} name="GPS Realizado" dot={{ fill: '#22d3ee', r: 4 }} activeDot={{ r: 6, fill: '#22d3ee', stroke: '#fff', strokeWidth: 2 }} />
                      <Line type="monotone" dataKey="gps_previsto" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" name="GPS Previsto" dot={{ fill: '#f59e0b', r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-pink-500/30 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">Vendas Base x Marketing</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e40af" opacity={0.1} />
                      <XAxis dataKey="date" stroke="#60a5fa" style={{ fontSize: '12px' }} />
                      <YAxis stroke="#60a5fa" style={{ fontSize: '12px' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ color: '#60a5fa' }} />
                      <Line type="monotone" dataKey="vendas_base" stroke="#10b981" strokeWidth={2} name="Vendas Base R$" dot={{ fill: '#10b981', r: 3 }} />
                      <Line type="monotone" dataKey="projected_sales_base" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" name="Previsto Base" dot={{ fill: '#3b82f6', r: 3 }} />
                      <Line type="monotone" dataKey="vendas_mkt" stroke="#ec4899" strokeWidth={2} name="Vendas Marketing R$" dot={{ fill: '#ec4899', r: 3 }} />
                      <Line type="monotone" dataKey="projected_sales_mkt" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" name="Previsto Mkt" dot={{ fill: '#f59e0b', r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ABA AGENDAMENTOS */}
            <TabsContent value="agendamentos" className="space-y-6">
              <Card className="bg-slate-800/50 border-blue-500/30 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Agendamentos por Origem</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e40af" opacity={0.1} />
                      <XAxis dataKey="date" stroke="#60a5fa" style={{ fontSize: '12px' }} />
                      <YAxis stroke="#60a5fa" style={{ fontSize: '12px' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ color: '#60a5fa' }} />
                      <Line type="monotone" dataKey="agendados_base" stroke="#3b82f6" strokeWidth={2} name="Agendados Base" dot={{ fill: '#3b82f6', r: 3 }} />
                      <Line type="monotone" dataKey="agendados_mkt" stroke="#ec4899" strokeWidth={2} name="Agendados Marketing" dot={{ fill: '#ec4899', r: 3 }} />
                      <Line type="monotone" dataKey="agendados_referral" stroke="#f97316" strokeWidth={2} name="Agendados Indicação" dot={{ fill: '#f97316', r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-green-500/30 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">Entregas por Origem</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e40af" opacity={0.1} />
                      <XAxis dataKey="date" stroke="#60a5fa" style={{ fontSize: '12px' }} />
                      <YAxis stroke="#60a5fa" style={{ fontSize: '12px' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ color: '#60a5fa' }} />
                      <Line type="monotone" dataKey="entregues_base" stroke="#10b981" strokeWidth={2} name="Entregues Base" dot={{ fill: '#10b981', r: 3 }} />
                      <Line type="monotone" dataKey="entregues_mkt" stroke="#a855f7" strokeWidth={2} name="Entregues Marketing" dot={{ fill: '#a855f7', r: 3 }} />
                      <Line type="monotone" dataKey="entregues_referral" stroke="#fbbf24" strokeWidth={2} name="Entregues Indicação" dot={{ fill: '#fbbf24', r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ABA MARKETING */}
            <TabsContent value="marketing" className="space-y-6">
              <Card className="bg-slate-800/50 border-pink-500/30 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-fuchsia-400">Funil de Leads</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e40af" opacity={0.1} />
                      <XAxis dataKey="date" stroke="#60a5fa" style={{ fontSize: '12px' }} />
                      <YAxis stroke="#60a5fa" style={{ fontSize: '12px' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ color: '#60a5fa' }} />
                      <Line type="monotone" dataKey="leads_gerados" stroke="#3b82f6" strokeWidth={2} name="Leads Gerados" dot={{ fill: '#3b82f6', r: 3 }} />
                      <Line type="monotone" dataKey="leads_agendados" stroke="#a855f7" strokeWidth={2} name="Leads Agendados" dot={{ fill: '#a855f7', r: 3 }} />
                      <Line type="monotone" dataKey="leads_comparecidos" stroke="#ec4899" strokeWidth={2} name="Comparecidos" dot={{ fill: '#ec4899', r: 3 }} />
                      <Line type="monotone" dataKey="leads_vendidos" stroke="#10b981" strokeWidth={2} name="Leads Vendidos" dot={{ fill: '#10b981', r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-red-500/30 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-rose-400">Investimento vs Faturamento</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e40af" opacity={0.1} />
                      <XAxis dataKey="date" stroke="#60a5fa" style={{ fontSize: '12px' }} />
                      <YAxis stroke="#60a5fa" style={{ fontSize: '12px' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ color: '#60a5fa' }} />
                      <Line type="monotone" dataKey="investido_trafego" stroke="#ef4444" strokeWidth={2} name="Investido Tráfego R$" dot={{ fill: '#ef4444', r: 3 }} />
                      <Line type="monotone" dataKey="faturado_lead" stroke="#10b981" strokeWidth={2} name="Faturado Lead R$" dot={{ fill: '#10b981', r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-orange-500/30 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400">Custo por Venda</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e40af" opacity={0.1} />
                      <XAxis dataKey="date" stroke="#60a5fa" style={{ fontSize: '12px' }} />
                      <YAxis stroke="#60a5fa" style={{ fontSize: '12px' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ color: '#60a5fa' }} />
                      <Line type="monotone" dataKey="custo_venda_realizado" stroke="#10b981" strokeWidth={2} name="Custo Realizado" dot={{ fill: '#10b981', r: 3 }} />
                      <Line type="monotone" dataKey="custo_venda_previsto" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" name="Custo Previsto" dot={{ fill: '#f59e0b', r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}