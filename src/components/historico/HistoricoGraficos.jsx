import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, DollarSign, Users, Target, ShoppingCart } from "lucide-react";
import { formatCurrency } from "@/components/utils/formatters";

export default function HistoricoGraficos({ isOpen, onClose, records }) {
  const [selectedMetrics, setSelectedMetrics] = useState({
    faturamento: true,
    clientes: true,
  });

  // Preparar dados dos gráficos ordenados por data
  const chartData = records
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((record) => ({
      date: new Date(record.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      // Faturamento
      faturamento_total: record.revenue_parts + record.revenue_services,
      faturamento_pecas: record.revenue_parts,
      faturamento_servicos: record.revenue_services,
      projected_revenue: record.projected_revenue || 0,
      // Clientes
      clientes: record.customer_volume,
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
      leads_gerados: record.marketing?.leads_generated || 0,
      leads_agendados: record.marketing?.leads_scheduled || 0,
      leads_comparecidos: record.marketing?.leads_showed_up || 0,
      leads_vendidos: record.marketing?.leads_sold || 0,
      investido_trafego: record.marketing?.invested_value || 0,
      faturado_lead: record.marketing?.revenue_from_traffic || 0,
      custo_venda_realizado: record.marketing?.cost_per_sale || 0,
      custo_venda_previsto: record.marketing?.projected_cost_per_sale || 0,
    }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-700 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value.toLocaleString("pt-BR")}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            Gráficos de Evolução - Histórico de Metas
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="faturamento" className="w-full">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="faturamento">Faturamento</TabsTrigger>
            <TabsTrigger value="comercial">Comercial</TabsTrigger>
            <TabsTrigger value="vendas">Vendas</TabsTrigger>
            <TabsTrigger value="agendamentos">Agendamentos</TabsTrigger>
            <TabsTrigger value="marketing">Marketing</TabsTrigger>
          </TabsList>

          {/* ABA FATURAMENTO */}
          <TabsContent value="faturamento">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  Evolução do Faturamento
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
                    <Line type="monotone" dataKey="faturamento_total" stroke="#10b981" strokeWidth={2} name="Fat. Total" />
                    <Line type="monotone" dataKey="faturamento_pecas" stroke="#3b82f6" strokeWidth={2} name="Fat. Peças" />
                    <Line type="monotone" dataKey="faturamento_servicos" stroke="#8b5cf6" strokeWidth={2} name="Fat. Serviços" />
                    <Line type="monotone" dataKey="projected_revenue" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" name="Previsto" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="w-5 h-5 text-blue-600" />
                  Evolução de Clientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="clientes" stroke="#10b981" strokeWidth={2} name="Clientes Realizado" />
                    <Line type="monotone" dataKey="projected_clientes" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" name="Clientes Previsto" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA COMERCIAL */}
          <TabsContent value="comercial">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="w-5 h-5 text-indigo-600" />
                  PAVE Comercial
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="pave_realizado" stroke="#10b981" strokeWidth={2} name="PAVE Realizado" />
                    <Line type="monotone" dataKey="pave_previsto" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" name="PAVE Previsto" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShoppingCart className="w-5 h-5 text-yellow-600" />
                  Kit Master
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="kit_master_realizado" stroke="#10b981" strokeWidth={2} name="Kit Master Realizado" />
                    <Line type="monotone" dataKey="kit_master_previsto" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" name="Kit Master Previsto" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="w-5 h-5 text-cyan-600" />
                  GPS de Vendas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="gps_realizado" stroke="#10b981" strokeWidth={2} name="GPS Realizado" />
                    <Line type="monotone" dataKey="gps_previsto" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" name="GPS Previsto" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA VENDAS */}
          <TabsContent value="vendas">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Vendas Base</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="vendas_base" stroke="#10b981" strokeWidth={2} name="Vendas Base R$" />
                    <Line type="monotone" dataKey="projected_sales_base" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" name="Previsto Base" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base">Vendas Marketing</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="vendas_mkt" stroke="#a855f7" strokeWidth={2} name="Vendas Marketing R$" />
                    <Line type="monotone" dataKey="projected_sales_mkt" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" name="Previsto Mkt" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA AGENDAMENTOS */}
          <TabsContent value="agendamentos">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Agendamentos por Origem</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
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

            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base">Entregas por Origem</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
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
          <TabsContent value="marketing">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Funil de Leads</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
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

            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base">Investimento vs Faturamento</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
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

            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base">Custo por Venda</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="custo_venda_realizado" stroke="#10b981" strokeWidth={2} name="Custo por Venda Realizado" />
                    <Line type="monotone" dataKey="custo_venda_previsto" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" name="Custo por Venda Previsto" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}