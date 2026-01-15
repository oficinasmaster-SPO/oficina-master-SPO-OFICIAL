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
import StatusMetaBadge from "@/components/historico/StatusMetaBadge";
import FeedbackMetaModal from "@/components/historico/FeedbackMetaModal";

// Função para calcular dias úteis do mês
const calcularDiasUteis = (mesAno) => {
  const [ano, mes] = mesAno.split('-').map(Number);
  const primeiroDia = new Date(ano, mes - 1, 1);
  const ultimoDia = new Date(ano, mes, 0);
  let diasUteis = 0;

  for (let dia = primeiroDia.getDate(); dia <= ultimoDia.getDate(); dia++) {
    const data = new Date(ano, mes - 1, dia);
    const diaSemana = data.getDay();
    // Contar apenas segunda a sexta (1-5), excluindo sábado (6) e domingo (0)
    if (diaSemana >= 1 && diaSemana <= 5) {
      diasUteis++;
    }
  }
  return diasUteis;
};

export default function GraficosProducao() {
  const navigate = useNavigate();
  const [workshop, setWorkshop] = useState(null);
  const [user, setUser] = useState(null);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().substring(0, 7));
  const [feedbackModal, setFeedbackModal] = useState({ open: false, status: "", metricName: "", realizado: 0, meta: 0 });

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

  // Calcular dias úteis do mês filtrado e metas diárias
  const diasUteis = calcularDiasUteis(filterMonth);
  const bestMonth = workshop?.best_month_history || {};
  const growthPercentage = workshop?.monthly_goals?.growth_percentage || 10;
  const factor = 1 + growthPercentage / 100;

  // Calcular metas DIÁRIAS dividindo pelo número de dias úteis
  const metaDiaria = {
    faturamento_total: ((bestMonth.revenue_total || 0) * factor) / diasUteis,
    clientes: Math.round(((bestMonth.customer_volume || 0) * factor) / diasUteis),
    pave: ((bestMonth.pave_commercial || 0) * factor) / diasUteis,
    kit_master: ((bestMonth.kit_master || 0) * factor) / diasUteis,
    gps: ((bestMonth.gps_vendas || 0) * factor) / diasUteis,
    sales_base: ((bestMonth.sales_base || 0) * factor) / diasUteis,
    sales_mkt: ((bestMonth.sales_marketing || 0) * factor) / diasUteis,
    agendados_base: Math.round(((bestMonth.clients_scheduled_base || 0) * factor) / diasUteis),
    entregues_base: Math.round(((bestMonth.clients_delivered_base || 0) * factor) / diasUteis),
    agendados_mkt: Math.round(((bestMonth.clients_scheduled_mkt || 0) * factor) / diasUteis),
    entregues_mkt: Math.round(((bestMonth.clients_delivered_mkt || 0) * factor) / diasUteis),
    agendados_referral: Math.round(((bestMonth.clients_scheduled_referral || 0) * factor) / diasUteis),
    entregues_referral: Math.round(((bestMonth.clients_delivered_referral || 0) * factor) / diasUteis),
    leads_gerados: Math.round(((bestMonth.marketing?.leads_generated || 0) * factor) / diasUteis),
    leads_agendados: Math.round(((bestMonth.marketing?.leads_scheduled || 0) * factor) / diasUteis),
    leads_comparecidos: Math.round(((bestMonth.marketing?.leads_showed_up || 0) * factor) / diasUteis),
    leads_vendidos: Math.round(((bestMonth.marketing?.leads_sold || 0) * factor) / diasUteis),
    investido_trafego: ((bestMonth.marketing?.invested_value || 0) * factor) / diasUteis,
    faturado_lead: ((bestMonth.marketing?.revenue_from_traffic || 0) * factor) / diasUteis,
    custo_venda: ((bestMonth.marketing?.cost_per_sale || 0) * factor) / diasUteis,
  };

  // Calcular dias decorridos do mês até hoje
  const hoje = new Date();
  const [anoFiltro, mesFiltro] = filterMonth.split('-').map(Number);
  const mesAtual = hoje.getMonth() + 1;
  const anoAtual = hoje.getFullYear();
  
  let diasDecorridos = 0;
  if (anoFiltro === anoAtual && mesFiltro === mesAtual) {
    // Se é o mês atual, contar apenas dias úteis até hoje
    for (let dia = 1; dia <= hoje.getDate(); dia++) {
      const data = new Date(anoAtual, mesAtual - 1, dia);
      const diaSemana = data.getDay();
      if (diaSemana >= 1 && diaSemana <= 5) {
        diasDecorridos++;
      }
    }
  } else {
    // Se é mês passado, usar todos os dias úteis do mês
    diasDecorridos = diasUteis;
  }

  // Calcular meta acumulada até o dia
  const metaAcumulada = {
    faturamento_total: metaDiaria.faturamento_total * diasDecorridos,
    clientes: metaDiaria.clientes * diasDecorridos,
    pave: metaDiaria.pave * diasDecorridos,
    kit_master: metaDiaria.kit_master * diasDecorridos,
    gps: metaDiaria.gps * diasDecorridos,
    sales_base: metaDiaria.sales_base * diasDecorridos,
    sales_mkt: metaDiaria.sales_mkt * diasDecorridos,
    agendados_base: metaDiaria.agendados_base * diasDecorridos,
    entregues_base: metaDiaria.entregues_base * diasDecorridos,
    agendados_mkt: metaDiaria.agendados_mkt * diasDecorridos,
    entregues_mkt: metaDiaria.entregues_mkt * diasDecorridos,
    agendados_referral: metaDiaria.agendados_referral * diasDecorridos,
    entregues_referral: metaDiaria.entregues_referral * diasDecorridos,
    leads_gerados: metaDiaria.leads_gerados * diasDecorridos,
    leads_agendados: metaDiaria.leads_agendados * diasDecorridos,
    leads_comparecidos: metaDiaria.leads_comparecidos * diasDecorridos,
    leads_vendidos: metaDiaria.leads_vendidos * diasDecorridos,
    investido_trafego: metaDiaria.investido_trafego * diasDecorridos,
    faturado_lead: metaDiaria.faturado_lead * diasDecorridos,
  };

  // Calcular realizado acumulado
  const realizadoAcumulado = {
    faturamento_total: records.reduce((sum, r) => sum + ((r.revenue_parts || 0) + (r.revenue_services || 0)), 0),
    clientes: records.reduce((sum, r) => sum + (r.customer_volume || 0), 0),
    pave: records.reduce((sum, r) => sum + (r.pave_commercial || 0), 0),
    kit_master: records.reduce((sum, r) => sum + (r.kit_master || 0), 0),
    gps: records.reduce((sum, r) => sum + (r.gps_vendas || 0), 0),
    sales_base: records.reduce((sum, r) => sum + (r.sales_base || 0), 0),
    sales_mkt: records.reduce((sum, r) => sum + (r.sales_marketing || 0), 0),
    agendados_base: records.reduce((sum, r) => sum + (r.clients_scheduled_base || 0), 0),
    entregues_base: records.reduce((sum, r) => sum + (r.clients_delivered_base || 0), 0),
    agendados_mkt: records.reduce((sum, r) => sum + (r.clients_scheduled_mkt || 0), 0),
    entregues_mkt: records.reduce((sum, r) => sum + (r.clients_delivered_mkt || 0), 0),
    agendados_referral: records.reduce((sum, r) => sum + (r.clients_scheduled_referral || 0), 0),
    entregues_referral: records.reduce((sum, r) => sum + (r.clients_delivered_referral || 0), 0),
    leads_gerados: records.reduce((sum, r) => sum + (r.marketing_data?.leads_generated || 0), 0),
    leads_agendados: records.reduce((sum, r) => sum + (r.marketing_data?.leads_scheduled || 0), 0),
    leads_comparecidos: records.reduce((sum, r) => sum + (r.marketing_data?.leads_showed_up || 0), 0),
    leads_vendidos: records.reduce((sum, r) => sum + (r.marketing_data?.leads_sold || 0), 0),
    investido_trafego: records.reduce((sum, r) => sum + (r.marketing_data?.invested_value || 0), 0),
    faturado_lead: records.reduce((sum, r) => sum + (r.marketing_data?.revenue_from_traffic || 0), 0),
  };

  // Função para determinar status
  const getStatus = (realizado, meta) => {
    const irm = meta > 0 ? realizado / meta : 0;
    if (irm > 1.05) return "acima";
    if (irm >= 0.95) return "na_media";
    return "abaixo";
  };

  const chartData = records.map((record) => ({
    date: new Date(record.reference_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    // Faturamento
    faturamento_total: (record.revenue_parts || 0) + (record.revenue_services || 0),
    faturamento_pecas: record.revenue_parts || 0,
    faturamento_servicos: record.revenue_services || 0,
    meta_diaria_faturamento: metaDiaria.faturamento_total,
    // Clientes
    clientes: record.customer_volume || 0,
    meta_diaria_clientes: metaDiaria.clientes,
    // PAVE
    pave_realizado: record.pave_commercial || 0,
    meta_diaria_pave: metaDiaria.pave,
    // Kit Master
    kit_master_realizado: record.kit_master || 0,
    meta_diaria_kit_master: metaDiaria.kit_master,
    // GPS
    gps_realizado: record.gps_vendas || 0,
    meta_diaria_gps: metaDiaria.gps,
    // Agendamentos e Entregas
    agendados_base: record.clients_scheduled_base || 0,
    meta_diaria_agendados_base: metaDiaria.agendados_base,
    entregues_base: record.clients_delivered_base || 0,
    meta_diaria_entregues_base: metaDiaria.entregues_base,
    vendas_base: record.sales_base || 0,
    meta_diaria_vendas_base: metaDiaria.sales_base,
    agendados_mkt: record.clients_scheduled_mkt || 0,
    meta_diaria_agendados_mkt: metaDiaria.agendados_mkt,
    entregues_mkt: record.clients_delivered_mkt || 0,
    meta_diaria_entregues_mkt: metaDiaria.entregues_mkt,
    vendas_mkt: record.sales_marketing || 0,
    meta_diaria_vendas_mkt: metaDiaria.sales_mkt,
    agendados_referral: record.clients_scheduled_referral || 0,
    meta_diaria_agendados_referral: metaDiaria.agendados_referral,
    entregues_referral: record.clients_delivered_referral || 0,
    meta_diaria_entregues_referral: metaDiaria.entregues_referral,
    // Marketing
    leads_gerados: record.marketing_data?.leads_generated || 0,
    meta_diaria_leads_gerados: metaDiaria.leads_gerados,
    leads_agendados: record.marketing_data?.leads_scheduled || 0,
    meta_diaria_leads_agendados: metaDiaria.leads_agendados,
    leads_comparecidos: record.marketing_data?.leads_showed_up || 0,
    meta_diaria_leads_comparecidos: metaDiaria.leads_comparecidos,
    leads_vendidos: record.marketing_data?.leads_sold || 0,
    meta_diaria_leads_vendidos: metaDiaria.leads_vendidos,
    investido_trafego: record.marketing_data?.invested_value || 0,
    meta_diaria_investido_trafego: metaDiaria.investido_trafego,
    faturado_lead: record.marketing_data?.revenue_from_traffic || 0,
    meta_diaria_faturado_lead: metaDiaria.faturado_lead,
    custo_venda_realizado: record.marketing_data?.cost_per_sale || 0,
    meta_diaria_custo_venda: metaDiaria.custo_venda,
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
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">
                      <DollarSign className="w-5 h-5 text-green-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                      Evolução do Faturamento
                    </CardTitle>
                    <StatusMetaBadge
                      realizadoAcumulado={realizadoAcumulado.faturamento_total}
                      metaAcumulada={metaAcumulada.faturamento_total}
                      onClick={() => setFeedbackModal({
                        open: true,
                        status: getStatus(realizadoAcumulado.faturamento_total, metaAcumulada.faturamento_total),
                        metricName: "Faturamento Total",
                        realizado: realizadoAcumulado.faturamento_total,
                        meta: metaAcumulada.faturamento_total
                      })}
                    />
                  </div>
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
                      <Line type="monotone" dataKey="meta_diaria_faturamento" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" name="Meta Diária" dot={{ fill: '#f59e0b', r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-blue-500/30 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                      <Users className="w-5 h-5 text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                      Evolução de Clientes
                    </CardTitle>
                    <StatusMetaBadge
                      realizadoAcumulado={realizadoAcumulado.clientes}
                      metaAcumulada={metaAcumulada.clientes}
                      onClick={() => setFeedbackModal({
                        open: true,
                        status: getStatus(realizadoAcumulado.clientes, metaAcumulada.clientes),
                        metricName: "Clientes",
                        realizado: realizadoAcumulado.clientes,
                        meta: metaAcumulada.clientes
                      })}
                    />
                  </div>
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
                      <Line type="monotone" dataKey="meta_diaria_clientes" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" name="Meta Diária" dot={{ fill: '#f59e0b', r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ABA COMERCIAL */}
            <TabsContent value="comercial" className="space-y-6">
              <Card className="bg-slate-800/50 border-purple-500/30 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                      <Target className="w-5 h-5 text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                      PAVE Comercial
                    </CardTitle>
                    <StatusMetaBadge
                      realizadoAcumulado={realizadoAcumulado.pave}
                      metaAcumulada={metaAcumulada.pave}
                      onClick={() => setFeedbackModal({
                        open: true,
                        status: getStatus(realizadoAcumulado.pave, metaAcumulada.pave),
                        metricName: "PAVE Comercial",
                        realizado: realizadoAcumulado.pave,
                        meta: metaAcumulada.pave
                      })}
                    />
                  </div>
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
                      <Line type="monotone" dataKey="meta_diaria_pave" stroke="#ec4899" strokeWidth={2} strokeDasharray="5 5" name="Meta Diária" dot={{ fill: '#ec4899', r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-yellow-500/30 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400">
                      <ShoppingCart className="w-5 h-5 text-yellow-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
                      Kit Master
                    </CardTitle>
                    <StatusMetaBadge
                      realizadoAcumulado={realizadoAcumulado.kit_master}
                      metaAcumulada={metaAcumulada.kit_master}
                      onClick={() => setFeedbackModal({
                        open: true,
                        status: getStatus(realizadoAcumulado.kit_master, metaAcumulada.kit_master),
                        metricName: "Kit Master",
                        realizado: realizadoAcumulado.kit_master,
                        meta: metaAcumulada.kit_master
                      })}
                    />
                  </div>
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
                      <Line type="monotone" dataKey="meta_diaria_kit_master" stroke="#f97316" strokeWidth={2} strokeDasharray="5 5" name="Meta Diária" dot={{ fill: '#f97316', r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ABA VENDAS */}
            <TabsContent value="vendas" className="space-y-6">
              <Card className="bg-slate-800/50 border-cyan-500/30 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                      <Target className="w-5 h-5 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                      GPS de Vendas
                    </CardTitle>
                    <StatusMetaBadge
                      realizadoAcumulado={realizadoAcumulado.gps}
                      metaAcumulada={metaAcumulada.gps}
                      onClick={() => setFeedbackModal({
                        open: true,
                        status: getStatus(realizadoAcumulado.gps, metaAcumulada.gps),
                        metricName: "GPS de Vendas",
                        realizado: realizadoAcumulado.gps,
                        meta: metaAcumulada.gps
                      })}
                    />
                  </div>
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
                      <Line type="monotone" dataKey="meta_diaria_gps" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" name="Meta Diária" dot={{ fill: '#f59e0b', r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-pink-500/30 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">Vendas Base x Marketing</CardTitle>
                    <div className="flex gap-2">
                      <StatusMetaBadge
                        realizadoAcumulado={realizadoAcumulado.sales_base}
                        metaAcumulada={metaAcumulada.sales_base}
                        onClick={() => setFeedbackModal({
                          open: true,
                          status: getStatus(realizadoAcumulado.sales_base, metaAcumulada.sales_base),
                          metricName: "Vendas Base",
                          realizado: realizadoAcumulado.sales_base,
                          meta: metaAcumulada.sales_base
                        })}
                      />
                    </div>
                  </div>
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
                      <Line type="monotone" dataKey="meta_diaria_vendas_base" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" name="Meta Diária Base" dot={{ fill: '#3b82f6', r: 3 }} />
                      <Line type="monotone" dataKey="vendas_mkt" stroke="#ec4899" strokeWidth={2} name="Vendas Marketing R$" dot={{ fill: '#ec4899', r: 3 }} />
                      <Line type="monotone" dataKey="meta_diaria_vendas_mkt" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" name="Meta Diária Mkt" dot={{ fill: '#f59e0b', r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ABA AGENDAMENTOS */}
            <TabsContent value="agendamentos" className="space-y-6">
              <Card className="bg-slate-800/50 border-blue-500/30 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Agendamentos por Origem</CardTitle>
                    <StatusMetaBadge
                      realizadoAcumulado={realizadoAcumulado.agendados_base + realizadoAcumulado.agendados_mkt + realizadoAcumulado.agendados_referral}
                      metaAcumulada={metaAcumulada.agendados_base + metaAcumulada.agendados_mkt + metaAcumulada.agendados_referral}
                      onClick={() => setFeedbackModal({
                        open: true,
                        status: getStatus(
                          realizadoAcumulado.agendados_base + realizadoAcumulado.agendados_mkt + realizadoAcumulado.agendados_referral,
                          metaAcumulada.agendados_base + metaAcumulada.agendados_mkt + metaAcumulada.agendados_referral
                        ),
                        metricName: "Agendamentos Totais",
                        realizado: realizadoAcumulado.agendados_base + realizadoAcumulado.agendados_mkt + realizadoAcumulado.agendados_referral,
                        meta: metaAcumulada.agendados_base + metaAcumulada.agendados_mkt + metaAcumulada.agendados_referral
                      })}
                    />
                  </div>
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
                      <Line type="monotone" dataKey="meta_diaria_agendados_base" stroke="#60a5fa" strokeWidth={2} strokeDasharray="5 5" name="Meta Diária Base" dot={{ fill: '#60a5fa', r: 2 }} />
                      <Line type="monotone" dataKey="agendados_mkt" stroke="#ec4899" strokeWidth={2} name="Agendados Marketing" dot={{ fill: '#ec4899', r: 3 }} />
                      <Line type="monotone" dataKey="meta_diaria_agendados_mkt" stroke="#f9a8d4" strokeWidth={2} strokeDasharray="5 5" name="Meta Diária Mkt" dot={{ fill: '#f9a8d4', r: 2 }} />
                      <Line type="monotone" dataKey="agendados_referral" stroke="#f97316" strokeWidth={2} name="Agendados Indicação" dot={{ fill: '#f97316', r: 3 }} />
                      <Line type="monotone" dataKey="meta_diaria_agendados_referral" stroke="#fb923c" strokeWidth={2} strokeDasharray="5 5" name="Meta Diária Indic." dot={{ fill: '#fb923c', r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-green-500/30 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">Entregas por Origem</CardTitle>
                    <StatusMetaBadge
                      realizadoAcumulado={realizadoAcumulado.entregues_base + realizadoAcumulado.entregues_mkt + realizadoAcumulado.entregues_referral}
                      metaAcumulada={metaAcumulada.entregues_base + metaAcumulada.entregues_mkt + metaAcumulada.entregues_referral}
                      onClick={() => setFeedbackModal({
                        open: true,
                        status: getStatus(
                          realizadoAcumulado.entregues_base + realizadoAcumulado.entregues_mkt + realizadoAcumulado.entregues_referral,
                          metaAcumulada.entregues_base + metaAcumulada.entregues_mkt + metaAcumulada.entregues_referral
                        ),
                        metricName: "Entregas Totais",
                        realizado: realizadoAcumulado.entregues_base + realizadoAcumulado.entregues_mkt + realizadoAcumulado.entregues_referral,
                        meta: metaAcumulada.entregues_base + metaAcumulada.entregues_mkt + metaAcumulada.entregues_referral
                      })}
                    />
                  </div>
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
                      <Line type="monotone" dataKey="meta_diaria_entregues_base" stroke="#34d399" strokeWidth={2} strokeDasharray="5 5" name="Meta Diária Base" dot={{ fill: '#34d399', r: 2 }} />
                      <Line type="monotone" dataKey="entregues_mkt" stroke="#a855f7" strokeWidth={2} name="Entregues Marketing" dot={{ fill: '#a855f7', r: 3 }} />
                      <Line type="monotone" dataKey="meta_diaria_entregues_mkt" stroke="#c084fc" strokeWidth={2} strokeDasharray="5 5" name="Meta Diária Mkt" dot={{ fill: '#c084fc', r: 2 }} />
                      <Line type="monotone" dataKey="entregues_referral" stroke="#fbbf24" strokeWidth={2} name="Entregues Indicação" dot={{ fill: '#fbbf24', r: 3 }} />
                      <Line type="monotone" dataKey="meta_diaria_entregues_referral" stroke="#fcd34d" strokeWidth={2} strokeDasharray="5 5" name="Meta Diária Indic." dot={{ fill: '#fcd34d', r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ABA MARKETING */}
            <TabsContent value="marketing" className="space-y-6">
              <Card className="bg-slate-800/50 border-pink-500/30 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-fuchsia-400">Funil de Leads</CardTitle>
                    <StatusMetaBadge
                      realizadoAcumulado={realizadoAcumulado.leads_vendidos}
                      metaAcumulada={metaAcumulada.leads_vendidos}
                      onClick={() => setFeedbackModal({
                        open: true,
                        status: getStatus(realizadoAcumulado.leads_vendidos, metaAcumulada.leads_vendidos),
                        metricName: "Leads Vendidos",
                        realizado: realizadoAcumulado.leads_vendidos,
                        meta: metaAcumulada.leads_vendidos
                      })}
                    />
                  </div>
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
                      <Line type="monotone" dataKey="meta_diaria_leads_gerados" stroke="#60a5fa" strokeWidth={2} strokeDasharray="5 5" name="Meta Diária Gerados" dot={{ fill: '#60a5fa', r: 2 }} />
                      <Line type="monotone" dataKey="leads_agendados" stroke="#a855f7" strokeWidth={2} name="Leads Agendados" dot={{ fill: '#a855f7', r: 3 }} />
                      <Line type="monotone" dataKey="meta_diaria_leads_agendados" stroke="#c084fc" strokeWidth={2} strokeDasharray="5 5" name="Meta Diária Agendados" dot={{ fill: '#c084fc', r: 2 }} />
                      <Line type="monotone" dataKey="leads_comparecidos" stroke="#ec4899" strokeWidth={2} name="Comparecidos" dot={{ fill: '#ec4899', r: 3 }} />
                      <Line type="monotone" dataKey="meta_diaria_leads_comparecidos" stroke="#f9a8d4" strokeWidth={2} strokeDasharray="5 5" name="Meta Diária Comparec." dot={{ fill: '#f9a8d4', r: 2 }} />
                      <Line type="monotone" dataKey="leads_vendidos" stroke="#10b981" strokeWidth={2} name="Leads Vendidos" dot={{ fill: '#10b981', r: 3 }} />
                      <Line type="monotone" dataKey="meta_diaria_leads_vendidos" stroke="#34d399" strokeWidth={2} strokeDasharray="5 5" name="Meta Diária Vendidos" dot={{ fill: '#34d399', r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-red-500/30 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-rose-400">Investimento vs Faturamento</CardTitle>
                    <StatusMetaBadge
                      realizadoAcumulado={realizadoAcumulado.faturado_lead}
                      metaAcumulada={metaAcumulada.faturado_lead}
                      onClick={() => setFeedbackModal({
                        open: true,
                        status: getStatus(realizadoAcumulado.faturado_lead, metaAcumulada.faturado_lead),
                        metricName: "Faturamento Lead Tráfego",
                        realizado: realizadoAcumulado.faturado_lead,
                        meta: metaAcumulada.faturado_lead
                      })}
                    />
                  </div>
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
                      <Line type="monotone" dataKey="meta_diaria_investido_trafego" stroke="#f87171" strokeWidth={2} strokeDasharray="5 5" name="Meta Diária Invest." dot={{ fill: '#f87171', r: 2 }} />
                      <Line type="monotone" dataKey="faturado_lead" stroke="#10b981" strokeWidth={2} name="Faturado Lead R$" dot={{ fill: '#10b981', r: 3 }} />
                      <Line type="monotone" dataKey="meta_diaria_faturado_lead" stroke="#34d399" strokeWidth={2} strokeDasharray="5 5" name="Meta Diária Fatur." dot={{ fill: '#34d399', r: 2 }} />
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
                      <Line type="monotone" dataKey="meta_diaria_custo_venda" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" name="Meta Diária" dot={{ fill: '#f59e0b', r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
        
        <FeedbackMetaModal
          open={feedbackModal.open}
          onClose={() => setFeedbackModal({ ...feedbackModal, open: false })}
          status={feedbackModal.status}
          metricName={feedbackModal.metricName}
          realizadoAcumulado={feedbackModal.realizado}
          metaAcumulada={feedbackModal.meta}
        />
      </div>
    </div>
  );
}