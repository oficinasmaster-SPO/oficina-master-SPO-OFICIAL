import React, { useState } from "react";
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
import { useWorkshopContext } from "@/components/hooks/useWorkshopContext";

export default function GraficosProducao() {
  const navigate = useNavigate();
  const location = useLocation();
  const { workshop, isLoading: workshopLoading } = useWorkshopContext();
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().substring(0, 7));

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['goal-history-graficos', workshop?.id, filterMonth],
    queryFn: async () => {
      if (!workshop) return [];
      const query = { 
        workshop_id: workshop.id,
        month: filterMonth
      };
      const result = await base44.entities.MonthlyGoalHistory.filter(query);
      return result.sort((a, b) => new Date(a.reference_date) - new Date(b.reference_date));
    },
    enabled: !!workshop
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
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-700 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString("pt-BR") : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (workshopLoading || !workshop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Carregando oficina...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-8 h-8 text-blue-600" />
                Gráficos de Evolução
              </h1>
              <p className="text-gray-600 mt-1">Análise visual do desempenho da oficina</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div>
              <Label className="text-xs text-gray-600">Filtrar Mês</Label>
              <Input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="w-40"
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-500">Carregando dados...</p>
            </CardContent>
          </Card>
        ) : chartData.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Nenhum registro encontrado para este período</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="faturamento" className="w-full">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="faturamento">Faturamento</TabsTrigger>
              <TabsTrigger value="comercial">Comercial</TabsTrigger>
              <TabsTrigger value="vendas">Vendas</TabsTrigger>
              <TabsTrigger value="agendamentos">Agendamentos</TabsTrigger>
              <TabsTrigger value="marketing">Marketing</TabsTrigger>
            </TabsList>

            {/* ABA FATURAMENTO */}
            <TabsContent value="faturamento" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    Evolução do Faturamento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line type="monotone" dataKey="faturamento_total" stroke="#10b981" strokeWidth={3} name="Fat. Total" />
                      <Line type="monotone" dataKey="faturamento_pecas" stroke="#3b82f6" strokeWidth={2} name="Fat. Peças" />
                      <Line type="monotone" dataKey="faturamento_servicos" stroke="#8b5cf6" strokeWidth={2} name="Fat. Serviços" />
                      <Line type="monotone" dataKey="projected_revenue" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" name="Previsto" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    Evolução de Clientes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line type="monotone" dataKey="clientes" stroke="#10b981" strokeWidth={3} name="Clientes Realizado" />
                      <Line type="monotone" dataKey="projected_clientes" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" name="Clientes Previsto" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ABA COMERCIAL */}
            <TabsContent value="comercial" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-indigo-600" />
                    PAVE Comercial
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line type="monotone" dataKey="pave_realizado" stroke="#10b981" strokeWidth={3} name="PAVE Realizado" />
                      <Line type="monotone" dataKey="pave_previsto" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" name="PAVE Previsto" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-yellow-600" />
                    Kit Master
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line type="monotone" dataKey="kit_master_realizado" stroke="#10b981" strokeWidth={3} name="Kit Master Realizado" />
                      <Line type="monotone" dataKey="kit_master_previsto" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" name="Kit Master Previsto" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ABA VENDAS */}
            <TabsContent value="vendas" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-cyan-600" />
                    GPS de Vendas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line type="monotone" dataKey="gps_realizado" stroke="#10b981" strokeWidth={3} name="GPS Realizado" />
                      <Line type="monotone" dataKey="gps_previsto" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" name="GPS Previsto" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Vendas Base x Marketing</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line type="monotone" dataKey="vendas_base" stroke="#10b981" strokeWidth={2} name="Vendas Base R$" />
                      <Line type="monotone" dataKey="projected_sales_base" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" name="Previsto Base" />
                      <Line type="monotone" dataKey="vendas_mkt" stroke="#a855f7" strokeWidth={2} name="Vendas Marketing R$" />
                      <Line type="monotone" dataKey="projected_sales_mkt" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" name="Previsto Mkt" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ABA AGENDAMENTOS */}
            <TabsContent value="agendamentos" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Agendamentos por Origem</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line type="monotone" dataKey="agendados_base" stroke="#3b82f6" strokeWidth={2} name="Agendados Base" />
                      <Line type="monotone" dataKey="agendados_mkt" stroke="#ec4899" strokeWidth={2} name="Agendados Marketing" />
                      <Line type="monotone" dataKey="agendados_referral" stroke="#f97316" strokeWidth={2} name="Agendados Indicação" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Entregas por Origem</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line type="monotone" dataKey="entregues_base" stroke="#10b981" strokeWidth={2} name="Entregues Base" />
                      <Line type="monotone" dataKey="entregues_mkt" stroke="#8b5cf6" strokeWidth={2} name="Entregues Marketing" />
                      <Line type="monotone" dataKey="entregues_referral" stroke="#f59e0b" strokeWidth={2} name="Entregues Indicação" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ABA MARKETING */}
            <TabsContent value="marketing" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Funil de Leads</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line type="monotone" dataKey="leads_gerados" stroke="#3b82f6" strokeWidth={2} name="Leads Gerados" />
                      <Line type="monotone" dataKey="leads_agendados" stroke="#8b5cf6" strokeWidth={2} name="Leads Agendados" />
                      <Line type="monotone" dataKey="leads_comparecidos" stroke="#f59e0b" strokeWidth={2} name="Comparecidos" />
                      <Line type="monotone" dataKey="leads_vendidos" stroke="#10b981" strokeWidth={2} name="Leads Vendidos" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Investimento vs Faturamento</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line type="monotone" dataKey="investido_trafego" stroke="#ef4444" strokeWidth={2} name="Investido Tráfego R$" />
                      <Line type="monotone" dataKey="faturado_lead" stroke="#10b981" strokeWidth={2} name="Faturado Lead R$" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Custo por Venda</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line type="monotone" dataKey="custo_venda_realizado" stroke="#10b981" strokeWidth={2} name="Custo Realizado" />
                      <Line type="monotone" dataKey="custo_venda_previsto" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" name="Custo Previsto" />
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